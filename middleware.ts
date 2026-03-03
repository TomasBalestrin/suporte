import { NextResponse, type NextRequest } from 'next/server'

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'

/** Routes exempt from CSRF (public ticket creation, cron jobs, csrf endpoint) */
const CSRF_EXEMPT = ['/api/tickets', '/api/cron/', '/api/csrf', '/api/ai/']

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT.some((p) => pathname.startsWith(p))
}

function validateCsrf(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value
  const headerToken = request.headers.get(CSRF_HEADER)
  if (!cookieToken || !headerToken) return false
  if (cookieToken.length !== headerToken.length) return false
  let mismatch = 0
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }
  return mismatch === 0
}

export async function middleware(request: NextRequest) {
  // Add request ID for debugging and tracing
  const requestId = crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })
  supabaseResponse.headers.set('x-request-id', requestId)

  const pathname = request.nextUrl.pathname

  // CORS headers for API routes — no Supabase call needed
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    ].filter(Boolean)

    // Handle preflight
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 })
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      }
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token')
      response.headers.set('Access-Control-Max-Age', '86400')
      response.headers.set('x-request-id', requestId)
      return response
    }

    // Add CORS headers to response
    if (origin && allowedOrigins.includes(origin)) {
      supabaseResponse.headers.set('Access-Control-Allow-Origin', origin)
    }

    // CSRF protection for mutating requests on admin API routes
    const method = request.method
    if (
      (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') &&
      pathname.startsWith('/api/admin/') &&
      !isCsrfExempt(pathname)
    ) {
      if (!validateCsrf(request)) {
        return NextResponse.json(
          { success: false, error: 'Token CSRF inválido ou ausente' },
          { status: 403 }
        )
      }
    }

    return supabaseResponse
  }

  // For non-admin routes, return immediately
  if (!pathname.startsWith('/admin')) {
    return supabaseResponse
  }

  // For /admin routes: only check if auth cookies exist (NO network calls).
  // The client-side admin layout handles full auth + profile verification.
  // This avoids Vercel Edge middleware timeout (MIDDLEWARE_INVOCATION_TIMEOUT).
  // Note: @supabase/ssr 0.5+ uses chunked cookies (e.g. sb-xxx-auth-token.0)
  // so we match the base name with an optional chunk suffix.
  const hasAuthCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && /\-auth-token(\.\d+)?$/.test(c.name)
  )

  // Redirect unauthenticated users to login (except login page itself)
  if (!pathname.startsWith('/admin/login') && !hasAuthCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page to dashboard
  if (pathname === '/admin/login' && hasAuthCookie && !request.nextUrl.searchParams.has('error')) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
