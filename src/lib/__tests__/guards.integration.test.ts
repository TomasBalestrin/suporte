import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the admin client
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args)
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs)
            return {
              single: () => mockSingle(),
            }
          },
        }
      },
    }),
  }),
}))

import { isAdmin, isAgentOrAdmin, escapeIlike } from '@/lib/supabase/guards'

describe('isAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true for admin role', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'admin' } })
    expect(await isAdmin('user-123')).toBe(true)
  })

  it('returns false for agent role', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'agent' } })
    expect(await isAdmin('user-123')).toBe(false)
  })

  it('returns false when user not found', async () => {
    mockSingle.mockResolvedValue({ data: null })
    expect(await isAdmin('user-123')).toBe(false)
  })
})

describe('isAgentOrAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true for active admin', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'admin', is_active: true } })
    expect(await isAgentOrAdmin('user-123')).toBe(true)
  })

  it('returns true for active agent', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'agent', is_active: true } })
    expect(await isAgentOrAdmin('user-123')).toBe(true)
  })

  it('returns false for inactive agent', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'agent', is_active: false } })
    expect(await isAgentOrAdmin('user-123')).toBe(false)
  })

  it('returns false when user not found', async () => {
    mockSingle.mockResolvedValue({ data: null })
    expect(await isAgentOrAdmin('user-123')).toBe(false)
  })
})

describe('escapeIlike', () => {
  it('escapes % character', () => {
    expect(escapeIlike('100%')).toBe('100\\%')
  })

  it('escapes _ character', () => {
    expect(escapeIlike('test_value')).toBe('test\\_value')
  })

  it('escapes backslash', () => {
    expect(escapeIlike('path\\to')).toBe('path\\\\to')
  })

  it('returns normal strings unchanged', () => {
    expect(escapeIlike('hello world')).toBe('hello world')
  })
})
