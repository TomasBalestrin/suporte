import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/supabase/guards'

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
      return NextResponse.json({ success: false, error: 'Apenas admins podem editar perguntas' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('ai_unanswered_questions')
      .update({ resolved: body.resolved ?? true })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar pergunta' },
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
      return NextResponse.json({ success: false, error: 'Apenas admins podem excluir perguntas' }, { status: 403 })
    }

    const { id } = await params
    const admin = createAdminClient()

    const { error } = await admin
      .from('ai_unanswered_questions')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir pergunta' },
      { status: 500 }
    )
  }
}
