import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        in: () => ({
          lt: () => ({
            is: () => ({ data: [], error: null }),
          }),
          gt: () => ({
            lt: () => ({
              is: () => ({ data: [], error: null }),
            }),
          }),
        }),
        eq: () => ({
          eq: () => ({
            data: [],
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: () => ({ error: null }),
      }),
      insert: () => ({ error: null }),
    }),
  }),
}))

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'email-123' }),
}))

describe('SLA Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('module exists and can be imported', async () => {
    const mod = await import('@/lib/sla/monitor')
    expect(mod.checkSlaBreaches).toBeDefined()
    expect(typeof mod.checkSlaBreaches).toBe('function')
  })
})
