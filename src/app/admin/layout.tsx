'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const AUTH_TIMEOUT_MS = 5_000

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

      // Safety timeout: if auth takes too long, force-resolve the loading
      // state. Set state BEFORE signOut() because signOut() also makes a
      // network call and can hang if the network is the problem.
      timeoutId = setTimeout(() => {
        if (cancelled) return
        console.warn('[Auth] Timeout loading user, forcing resolve')
        setUser(null)
        setLoading(false)
        // Fire-and-forget signOut to clean cookies if possible
        supabase.auth.signOut().catch(() => {})
      }, AUTH_TIMEOUT_MS)

      try {
        // Use getSession() — reads from cookie locally, avoids network
        // round-trip to the Supabase Auth server that can timeout.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (cancelled) return

        if (sessionError) {
          console.error('[Auth] Session error:', sessionError.message)
          setUser(null)
          supabase.auth.signOut().catch(() => {})
          return
        }

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (cancelled) return

          if (profile) {
            setUser(profile)
          } else {
            // Authenticated but no profile in users table
            setUser(null)
            supabase.auth.signOut().catch(() => {})
          }
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('[Auth] Unexpected error:', err)
        if (!cancelled) setUser(null)
        supabase.auth.signOut().catch(() => {})
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
        if (event === 'INITIAL_SESSION') return

        if (session?.user) {
          setLoading(true)
          let authChangeTimeout: ReturnType<typeof setTimeout> | null = null
          try {
            const profile = await Promise.race([
              fetchProfile(session.user.id),
              new Promise<null>((resolve) => {
                authChangeTimeout = setTimeout(() => {
                  console.warn('[Auth] Timeout fetching profile after auth change, forcing resolve')
                  resolve(null)
                }, AUTH_TIMEOUT_MS)
              }),
            ])
            if (authChangeTimeout) clearTimeout(authChangeTimeout)
            if (cancelled) return
            if (profile) {
              setUser(profile)
            } else {
              setUser(null)
              supabase.auth.signOut().catch(() => {})
            }
          } catch {
            if (authChangeTimeout) clearTimeout(authChangeTimeout)
            if (!cancelled) {
              setUser(null)
              setLoading(false)
            }
            supabase.auth.signOut().catch(() => {})
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
