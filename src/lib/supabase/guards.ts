import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Check if the authenticated user has the 'admin' role.
 * Use this on write operations in settings/config API routes.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  return data?.role === 'admin'
}

/**
 * Escape special SQL LIKE/ILIKE characters (%, _) in user input
 * to prevent pattern injection in Supabase .ilike() filters.
 */
export function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&')
}
