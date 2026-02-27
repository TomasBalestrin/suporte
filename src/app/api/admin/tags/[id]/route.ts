import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/supabase/guards'
import { tagSchema } from '@/lib/utils/validation'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Apenas admins podem editar tags' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = tagSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    const updateData = parsed.data
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('tags')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Tags API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar tag' },
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Apenas admins podem excluir tags' }, { status: 403 })
    }

    const { id } = await params
    const admin = createAdminClient()

    // Remove tag associations first
    await admin.from('ticket_tags').delete().eq('tag_id', id)

    const { error } = await admin
      .from('tags')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tags API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir tag' },
      { status: 500 }
    )
  }
}
