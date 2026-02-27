import { createServerClient } from '@supabase/ssr'
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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.headers.set('x-request-id', requestId)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // CORS headers for API routes
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
  }

  // Admin routes require authentication
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }

    // Check user role from the users table
    const { data: profile } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_active) {
      // Sign out to prevent redirect loop (authenticated but no valid profile)
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('error', 'profile_not_found')
      return NextResponse.redirect(url)
    }

    // Settings routes require admin role
    if (pathname.startsWith('/admin/settings') && profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users from login page (only if no error to avoid loop)
  if (pathname === '/admin/login' && user && !request.nextUrl.searchParams.has('error')) {
    // Verify profile exists before redirecting to dashboard
    const { data: loginProfile } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (loginProfile && loginProfile.is_active) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
