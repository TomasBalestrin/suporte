import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    if (body.shortcut !== undefined) updateData.shortcut = body.shortcut
    if (body.title !== undefined) updateData.title = body.title
    if (body.content !== undefined) updateData.content = body.content
    if (body.category !== undefined) updateData.category = body.category
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('quick_replies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar resposta rapida' },
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

    const { id } = await params
    const admin = createAdminClient()
    const { error } = await admin
      .from('quick_replies')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao desativar resposta rapida' },
      { status: 500 }
    )
  }
}
