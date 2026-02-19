import { createClient } from '@supabase/supabase-js'

// Admin client without strict Database types to allow flexible updates
// The service role key bypasses RLS, use only server-side
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
