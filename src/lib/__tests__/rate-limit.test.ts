import { describe, it, expect, vi, afterEach } from 'vitest'
import { rateLimit, getClientIp } from '../rate-limit'

describe('rateLimit', () => {
  it('allows requests within limit', () => {
    const key = `test-allow-${Date.now()}`
    const result = rateLimit(key, { limit: 3, windowSeconds: 60 })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('tracks remaining correctly', () => {
    const key = `test-remaining-${Date.now()}`
    const opts = { limit: 3, windowSeconds: 60 }

    const r1 = rateLimit(key, opts)
    expect(r1.remaining).toBe(2)

    const r2 = rateLimit(key, opts)
    expect(r2.remaining).toBe(1)

    const r3 = rateLimit(key, opts)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests over limit', () => {
    const key = `test-block-${Date.now()}`
    const opts = { limit: 2, windowSeconds: 60 }

    rateLimit(key, opts) // 1
    rateLimit(key, opts) // 2
    const r3 = rateLimit(key, opts) // 3 — over limit

    expect(r3.allowed).toBe(false)
    expect(r3.remaining).toBe(0)
  })

  it('resets after window expires', () => {
    vi.useFakeTimers()
    const key = `test-reset-${Date.now()}`
    const opts = { limit: 1, windowSeconds: 1 }

    rateLimit(key, opts) // 1 — uses the limit

    vi.advanceTimersByTime(1100) // advance past 1s window

    const r2 = rateLimit(key, opts) // should be allowed (window expired)
    expect(r2.allowed).toBe(true)

    vi.useRealTimers()
  })

  it('isolates keys from each other', () => {
    const keyA = `test-iso-a-${Date.now()}`
    const keyB = `test-iso-b-${Date.now()}`
    const opts = { limit: 1, windowSeconds: 60 }

    rateLimit(keyA, opts)
    const resultB = rateLimit(keyB, opts)

    expect(resultB.allowed).toBe(true)
  })
})

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('extracts IP from x-real-ip header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '10.0.0.1' },
    })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('returns unknown when no IP headers', () => {
    const req = new Request('http://localhost')
    expect(getClientIp(req)).toBe('unknown')
  })
})
