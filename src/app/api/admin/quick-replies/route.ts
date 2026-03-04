import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { quickReplySchema } from '@/lib/utils/validation'
import { isAdmin, isAgentOrAdmin } from '@/lib/supabase/guards'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }
    if (!(await isAgentOrAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('quick_replies')
      .select('*')
      .order('shortcut', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Quick replies API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar respostas rapidas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Apenas admins podem criar respostas rapidas' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = quickReplySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Dados invalidos' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('quick_replies')
      .insert({ ...parsed.data, created_by: user.id })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Atalho ja existe' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Quick replies API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar resposta rapida' },
      { status: 500 }
    )
  }
}
