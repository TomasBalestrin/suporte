'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const AUTH_TIMEOUT_MS = 10_000

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

    async function fetchProfile() {
      const res = await fetch('/api/admin/me')
      if (!res.ok) return null
      const json = await res.json()
      return json.success ? json.data : null
    }

    async function loadUser() {
      // Login page: user isn't logged in yet, nothing to load
      if (pathname === '/admin/login') {
        setLoading(false)
        return
      }

      // Skip network fetch if user is already set in the store (e.g. just logged in)
      if (useAuthStore.getState().user) {
        setLoading(false)
        return
      }

      setLoading(true)
      redirectingRef.current = false

      timeoutId = setTimeout(() => {
        if (cancelled) return
        console.warn('[Auth] Timeout loading user, forcing resolve')
        setUser(null)
        setLoading(false)
      }, AUTH_TIMEOUT_MS)

      try {
        const profile = await fetchProfile()
        if (cancelled) return

        if (profile) {
          setUser(profile)
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('[Auth] Unexpected error:', err)
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
        if (event === 'INITIAL_SESSION') return

        if (session?.user) {
          // Skip re-fetch if we already have this user's profile in the store
          if (useAuthStore.getState().user?.id === session.user.id) return

          setLoading(true)
          try {
            const profile = await fetchProfile()
            if (cancelled) return
            if (profile) {
              setUser(profile)
            } else {
              setUser(null)
              supabase.auth.signOut().catch(() => {})
            }
          } catch {
            if (!cancelled) setUser(null)
          } finally {
            if (!cancelled) setLoading(false)
          }
        } else {
          if (!cancelled) {
            setUser(null)
            setLoading(false)
          }
        }
      }
    )

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [pathname, setUser, setLoading])

  // Login page doesn't need the sidebar
  if (pathname === '/admin/login') {
    return <div className="admin">{children}</div>
  }

  if (isLoading) {
    return (
      <div className="admin flex min-h-screen items-center justify-center">
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
      <div className="admin flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="admin min-h-screen">
      <Sidebar />
      <main className="lg:pl-64">
        {children}
      </main>
    </div>
  )
}
