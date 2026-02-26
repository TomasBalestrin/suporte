const rateMap = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries periodically (in-memory only)
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now()
    for (const [key, value] of rateMap) {
      if (now > value.resetAt) {
        rateMap.delete(key)
      }
    }
  }
  // Use a global flag to prevent duplicate intervals
  const globalObj = globalThis as unknown as { _rateLimitCleanup?: boolean }
  if (!globalObj._rateLimitCleanup) {
    globalObj._rateLimitCleanup = true
    setInterval(cleanup, 5 * 60 * 1000)
  }
}

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  headers: Record<string, string>
}

/**
 * Rate limiter with support for distributed environments.
 * Uses in-memory store by default. For production with multiple instances,
 * set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 */
export async function rateLimitAsync(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  // If Upstash Redis is configured, use it for distributed rate limiting
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return rateLimitRedis(key, options)
  }
  // Fallback to in-memory
  return rateLimitMemory(key, options)
}

/**
 * Synchronous in-memory rate limiter (backward compatible).
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  return rateLimitMemory(key, options)
}

function rateLimitMemory(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const windowMs = options.windowSeconds * 1000
  const entry = rateMap.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    rateMap.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetAt,
      headers: rateLimitHeaders(options.limit, options.limit - 1, resetAt),
    }
  }

  entry.count++

  if (entry.count > options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      headers: rateLimitHeaders(options.limit, 0, entry.resetAt),
    }
  }

  return {
    allowed: true,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
    headers: rateLimitHeaders(options.limit, options.limit - entry.count, entry.resetAt),
  }
}

async function rateLimitRedis(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const redisKey = `ratelimit:${key}`

  try {
    // Increment counter
    const incrRes = await fetch(`${url}/incr/${encodeURIComponent(redisKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const { result: count } = await incrRes.json() as { result: number }

    // Set TTL on first request in window
    if (count === 1) {
      await fetch(
        `${url}/expire/${encodeURIComponent(redisKey)}/${options.windowSeconds}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    }

    const resetAt = Date.now() + options.windowSeconds * 1000
    const remaining = Math.max(0, options.limit - count)
    const allowed = count <= options.limit

    return {
      allowed,
      remaining,
      resetAt,
      headers: rateLimitHeaders(options.limit, remaining, resetAt),
    }
  } catch {
    // If Redis fails, allow the request (fail open)
    return {
      allowed: true,
      remaining: options.limit,
      resetAt: Date.now() + options.windowSeconds * 1000,
      headers: rateLimitHeaders(options.limit, options.limit, Date.now()),
    }
  }
}

function rateLimitHeaders(limit: number, remaining: number, resetAt: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
  }
}

/**
 * Extract client IP from request headers (works behind proxies like Vercel).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}
