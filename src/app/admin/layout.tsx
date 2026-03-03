'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    async function loadUser() {
      setLoading(true)
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()

          if (profile) {
            setUser(profile)
          } else {
            // Authenticated but no profile in users table
            await supabase.auth.signOut()
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch {
        // Auth failed (e.g. Supabase unreachable) — clear stale cookies
        // so the middleware won't redirect back from login page
        try { await supabase.auth.signOut() } catch { /* ignore */ }
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setUser(profile || null)
        } else {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
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

  // No user after loading → redirect to login
  // Use ?error= param so middleware allows access even if stale cookies remain
  if (!user) {
    router.replace('/admin/login?error=session_expired')
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
