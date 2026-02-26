/**
 * Validates that all required environment variables are set.
 * Call this at app startup to fail fast instead of at runtime.
 */

const requiredServerVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

const optionalServerVars = [
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'OPENAI_EMBEDDING_MODEL',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'CRON_SECRET',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const

export function validateEnv() {
  const missing: string[] = []

  for (const key of requiredServerVars) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nCheck your .env.local file.`
    )
  }

  // Warn about optional vars that affect features
  const warnings: string[] = []
  for (const key of optionalServerVars) {
    if (!process.env[key]) {
      warnings.push(key)
    }
  }

  if (warnings.length > 0) {
    console.warn(
      `[env] Optional variables not set (some features will be disabled):\n${warnings.map((k) => `  - ${k}`).join('\n')}`
    )
  }
}
