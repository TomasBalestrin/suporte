import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateEnv } from '../env'

describe('validateEnv', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('throws when required vars are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    expect(() => validateEnv()).toThrow('Missing required environment variables')
  })

  it('includes missing var names in error message', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'set'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'set'

    expect(() => validateEnv()).toThrow('NEXT_PUBLIC_SUPABASE_URL')
  })

  it('does not throw when all required vars are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'

    expect(() => validateEnv()).not.toThrow()
  })

  it('warns about missing optional vars', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    delete process.env.OPENAI_API_KEY
    delete process.env.RESEND_API_KEY

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateEnv()

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Optional variables not set')
    )
    warnSpy.mockRestore()
  })

  it('does not warn when all optional vars are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    process.env.OPENAI_API_KEY = 'key'
    process.env.OPENAI_MODEL = 'gpt-4o-mini'
    process.env.OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'
    process.env.RESEND_API_KEY = 'key'
    process.env.EMAIL_FROM = 'test@example.com'
    process.env.CRON_SECRET = 'secret'
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example@sentry.io/123'
    process.env.SENTRY_AUTH_TOKEN = 'sntrys_test'
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateEnv()

    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
