import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin, isAgentOrAdmin } from '@/lib/supabase/guards'
import { automationSchema } from '@/lib/utils/validation'

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

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('automation_rules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Automations API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar automacoes' },
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
      return NextResponse.json({ success: false, error: 'Apenas admins podem criar automacoes' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = automationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Dados invalidos' },
        { status: 400 }
      )
    }

    const { name, description, trigger_type, conditions, actions } = parsed.data

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
  } catch (error) {
    console.error('Automations API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar automacao' },
      { status: 500 }
    )
  }
}
