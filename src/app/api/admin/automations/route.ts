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
      .from('automation_rules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar automacoes' },
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

    const body = await request.json()
    const { name, description, trigger_type, conditions, actions } = body

    if (!name || !trigger_type) {
      return NextResponse.json(
        { success: false, error: 'Nome e tipo de gatilho sao obrigatorios' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('automation_rules')
      .insert({
        name,
        description,
        trigger_type,
        conditions: conditions || {},
        actions: actions || {},
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao criar automacao' },
      { status: 500 }
    )
  }
}
