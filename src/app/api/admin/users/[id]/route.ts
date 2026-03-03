import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { userUpdateSchema } from '@/lib/utils/validation'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Check if current user is admin
    const { data: currentUser } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Apenas admins podem editar usuarios' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = userUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Dados invalidos' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role
    if (parsed.data.is_active !== undefined) updateData.is_active = parsed.data.is_active

    const { data, error } = await admin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar usuario' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: currentUser } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Apenas admins podem desativar usuarios' }, { status: 403 })
    }

    const { id } = await params

    // Cannot deactivate yourself
    if (id === user.id) {
      return NextResponse.json({ success: false, error: 'Voce nao pode desativar sua propria conta' }, { status: 400 })
    }

    const { error } = await admin
      .from('users')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao desativar usuario' },
      { status: 500 }
    )
  }
}
