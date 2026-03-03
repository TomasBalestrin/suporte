'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const AUTH_TIMEOUT_MS = 15_000

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, setUser, setLoading } = useAuthStore()
  const redirectingRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    async function fetchProfile(userId: string) {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[Auth] Error fetching profile:', error.message)
        return null
      }
      return profile
    }

    async function loadUser() {
      setLoading(true)
      redirectingRef.current = false

      // Safety timeout: if auth takes too long, sign out and redirect
      timeoutId = setTimeout(async () => {
        if (cancelled) return
        console.warn('[Auth] Timeout loading user, signing out')
        await supabase.auth.signOut().catch(() => {})
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
      }, AUTH_TIMEOUT_MS)

      try {
        // Use getSession() instead of getUser() — reads from cookie locally
        // and avoids the network round-trip to the Supabase Auth server that
        // can timeout on cold starts or slow connections.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (cancelled) return

        if (sessionError) {
          console.error('[Auth] Session error:', sessionError.message)
          await supabase.auth.signOut().catch(() => {})
          if (!cancelled) setUser(null)
          return
        }

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (cancelled) return

          if (profile) {
            setUser(profile)
          } else {
            // Authenticated but no profile in users table
            await supabase.auth.signOut().catch(() => {})
            if (!cancelled) setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('[Auth] Unexpected error:', err)
        // On error, sign out to clear stale cookies and prevent redirect loop
        await supabase.auth.signOut().catch(() => {})
        if (!cancelled) setUser(null)
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
        if (!cancelled) setLoading(false)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return
        // Skip INITIAL_SESSION — loadUser() handles the initial auth check.
        // Processing it here would cause a redundant profile query race.
        if (event === 'INITIAL_SESSION') return

        if (session?.user) {
          // Set loading immediately to prevent the layout from redirecting
          // to login while the profile query is still in-flight
          setLoading(true)
          try {
            const profile = await fetchProfile(session.user.id)
            if (cancelled) return
            if (profile) {
              setUser(profile)
            } else {
              // Authenticated but no profile — sign out to clear stale cookies
              await supabase.auth.signOut().catch(() => {})
              if (!cancelled) setUser(null)
            }
          } catch {
            if (!cancelled) {
              await supabase.auth.signOut().catch(() => {})
              setUser(null)
              setLoading(false)
            }
          }
        } else {
          if (!cancelled) setUser(null)
        }
      }
    )

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [setUser, setLoading])

  // Login page doesn't need the sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // No user after loading → redirect to login with error param to prevent
  // middleware from redirecting back (which would cause an infinite loop)
  if (!user) {
    if (!redirectingRef.current) {
      redirectingRef.current = true
      router.replace('/admin/login?error=session_expired')
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:pl-64">
        {children}
      </main>
    </div>
  )
}
