import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Check if the authenticated user has the 'admin' role.
 * Use this on write operations in settings/config API routes.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('role, is_active')
    .eq('id', userId)
    .single()

  return !!data && data.is_active && data.role === 'admin'
}

/**
 * Check if the authenticated user is an active agent or admin.
 * Use this on read operations in admin API routes that both agents and admins can access.
 */
export async function isAgentOrAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('role, is_active')
    .eq('id', userId)
    .single()

  return !!data && data.is_active && (data.role === 'admin' || data.role === 'agent')
}

/**
 * Escape special SQL LIKE/ILIKE characters (%, _) in user input
 * to prevent pattern injection in Supabase .ilike() filters.
 */
export function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&')
}
