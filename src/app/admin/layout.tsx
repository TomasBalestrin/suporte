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
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (cancelled) return

        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()

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
      } catch {
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
      async (_event, session) => {
        if (cancelled) return
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (!cancelled) setUser(profile || null)
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
