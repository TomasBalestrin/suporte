import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'
const TOKEN_LENGTH = 32

/**
 * Generate a cryptographically secure random token.
 */
function generateToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Get or create a CSRF token stored in an httpOnly cookie.
 * Call this in server components or API routes that render forms.
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(CSRF_COOKIE)

  if (existing?.value) {
    return existing.value
  }

  const token = generateToken()
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 4, // 4 hours
  })

  return token
}

/**
 * Validate the CSRF token from the request header against the cookie.
 * Returns true if valid, false otherwise.
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value
  const headerToken = request.headers.get(CSRF_HEADER)

  if (!cookieToken || !headerToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return false
  }

  let mismatch = 0
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }

  return mismatch === 0
}
