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
      .from('sla_configs')
      .select('*')
      .order('priority', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configuracoes de SLA' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { configs } = body

    if (!Array.isArray(configs)) {
      return NextResponse.json(
        { success: false, error: 'Dados invalidos' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    for (const config of configs) {
      const { priority, first_response_minutes, resolution_minutes, is_active } = config

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
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configuracoes de SLA' },
      { status: 500 }
    )
  }
}
