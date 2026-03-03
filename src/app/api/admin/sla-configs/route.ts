import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('sla_configs')
      .select('*')
      .order('priority', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('SLA config API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configuracoes de SLA' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Apenas admins podem editar configuracoes de SLA' }, { status: 403 })
    }

    const body = await request.json()
    const { configs } = body

    if (!Array.isArray(configs)) {
      return NextResponse.json(
        { success: false, error: 'Dados invalidos' },
        { status: 400 }
      )
    }

    const { slaConfigSchema } = await import('@/lib/utils/validation')
    const admin = createAdminClient()

    for (const config of configs) {
      const parsed = slaConfigSchema.safeParse(config)
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
      }
      const { priority, first_response_minutes, resolution_minutes, is_active } = parsed.data

      // Upsert — update if exists, insert if not
      const { data: existing } = await admin
        .from('sla_configs')
        .select('id')
        .eq('priority', priority)
        .single()

      if (existing) {
        await admin
          .from('sla_configs')
          .update({ first_response_minutes, resolution_minutes, is_active })
          .eq('id', existing.id)
      } else {
        await admin
          .from('sla_configs')
          .insert({ priority, first_response_minutes, resolution_minutes, is_active })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SLA config API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configuracoes de SLA' },
      { status: 500 }
    )
  }
}
