import { describe, it, expect } from 'vitest'

/**
 * Unit tests for CSRF validation logic (extracted from middleware).
 */

function validateCsrf(cookieToken: string | undefined, headerToken: string | undefined): boolean {
  if (!cookieToken || !headerToken) return false
  if (cookieToken.length !== headerToken.length) return false
  let mismatch = 0
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }
  return mismatch === 0
}

describe('CSRF validation', () => {
  it('returns true for matching tokens', () => {
    const token = 'abc123def456'
    expect(validateCsrf(token, token)).toBe(true)
  })

  it('returns false for mismatched tokens', () => {
    expect(validateCsrf('abc123', 'xyz789')).toBe(false)
  })

  it('returns false for missing cookie token', () => {
    expect(validateCsrf(undefined, 'abc123')).toBe(false)
  })

  it('returns false for missing header token', () => {
    expect(validateCsrf('abc123', undefined)).toBe(false)
  })

  it('returns false for both missing', () => {
    expect(validateCsrf(undefined, undefined)).toBe(false)
  })

  it('returns false for different length tokens', () => {
    expect(validateCsrf('short', 'muchlongertoken')).toBe(false)
  })

  it('returns false for empty strings', () => {
    expect(validateCsrf('', '')).toBe(false)
  })

  it('handles long tokens correctly', () => {
    const long = 'a'.repeat(64)
    expect(validateCsrf(long, long)).toBe(true)
    expect(validateCsrf(long, 'b'.repeat(64))).toBe(false)
  })
})
