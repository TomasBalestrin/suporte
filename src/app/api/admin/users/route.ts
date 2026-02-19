import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar usuarios' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    // Check if current user is admin
    const admin = createAdminClient()
    const { data: currentUser } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Apenas admins podem criar usuarios' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, role, password } = body

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { success: false, error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    // Create auth user via Supabase Admin
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      )
    }

    // Create user profile
    const { data: userData, error: userError } = await admin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
      })
      .select()
      .single()

    if (userError) throw userError

    return NextResponse.json({ success: true, data: userData }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao criar usuario' },
      { status: 500 }
    )
  }
}
