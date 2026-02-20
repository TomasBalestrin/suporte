const rateMap = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateMap) {
    if (now > value.resetAt) {
      rateMap.delete(key)
    }
  }
}, 5 * 60 * 1000)

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
}

/**
 * Simple in-memory rate limiter.
 * For multi-instance deployments, replace with Redis-based solution.
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const windowMs = options.windowSeconds * 1000
  const entry = rateMap.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    rateMap.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: options.limit - 1, resetAt }
  }

  entry.count++

  if (entry.count > options.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return {
    allowed: true,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
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
