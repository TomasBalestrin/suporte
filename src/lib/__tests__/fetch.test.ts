import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('adminFetch', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    // Reset module cache so adminFetch re-initializes
    vi.resetModules()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('adds CSRF header to POST requests', async () => {
    const calls: { input: string | URL | Request; init?: RequestInit }[] = []

    globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input, init })
      // First call is to /api/csrf
      if (typeof input === 'string' && input === '/api/csrf') {
        return new Response(JSON.stringify({ token: 'test-csrf-token' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch

    const { adminFetch } = await import('../fetch')

    await adminFetch('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    })

    // Should have called /api/csrf first, then the actual request
    expect(calls.length).toBe(2)
    expect(calls[0].input).toBe('/api/csrf')

    const headers = new Headers(calls[1].init?.headers)
    expect(headers.get('x-csrf-token')).toBe('test-csrf-token')
  })

  it('does not add CSRF header to GET requests', async () => {
    const calls: { input: string | URL | Request; init?: RequestInit }[] = []

    globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input, init })
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch

    const { adminFetch } = await import('../fetch')

    await adminFetch('/api/admin/products')

    // Should only have one call (no CSRF fetch needed for GET)
    expect(calls.length).toBe(1)
    expect(calls[0].input).toBe('/api/admin/products')
  })

  it('adds CSRF header to DELETE requests', async () => {
    const calls: { input: string | URL | Request; init?: RequestInit }[] = []

    globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input, init })
      if (typeof input === 'string' && input === '/api/csrf') {
        return new Response(JSON.stringify({ token: 'del-token' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch

    const { adminFetch } = await import('../fetch')

    await adminFetch('/api/admin/products/123', { method: 'DELETE' })

    expect(calls.length).toBe(2)
    const headers = new Headers(calls[1].init?.headers)
    expect(headers.get('x-csrf-token')).toBe('del-token')
  })
})
