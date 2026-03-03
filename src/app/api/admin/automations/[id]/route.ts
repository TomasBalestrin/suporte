import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/supabase/guards'
import { automationSchema } from '@/lib/utils/validation'

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
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Apenas admins podem editar automacoes' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = automationSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    const updateData = parsed.data
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('automation_rules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Automations API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar automacao' },
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

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Apenas admins podem excluir automacoes' }, { status: 403 })
    }

    const { id } = await params
    const admin = createAdminClient()
    const { error } = await admin
      .from('automation_rules')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Automations API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir automacao' },
      { status: 500 }
    )
  }
}
