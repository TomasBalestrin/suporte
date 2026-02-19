import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_CONFIGS: Record<string, string> = {
  system_prompt:
    'Voce e a Sofia, assistente virtual da Bethel Systems. Responda de forma clara, educada e objetiva usando APENAS as informacoes do contexto fornecido. Se nao souber a resposta, diga que nao encontrou informacoes e sugira que o cliente abra um ticket.',
  confidence_threshold: '0.7',
  temperature: '0.3',
  max_tokens: '500',
  fallback_message:
    'Desculpe, nao encontrei uma resposta para sua duvida na minha base de conhecimento. Posso abrir um ticket para que um atendente humano possa te ajudar?',
  ai_enabled: 'true',
  ai_name: 'Sofia',
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data } = await admin
      .from('ai_config')
      .select('config_key, config_value')

    const configMap: Record<string, string> = { ...DEFAULT_CONFIGS }
    data?.forEach((c) => {
      configMap[c.config_key] = c.config_value
    })

    return NextResponse.json({ success: true, data: configMap })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configuracoes' },
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
    const admin = createAdminClient()

    // Upsert each config
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string') continue

      const { data: existing } = await admin
        .from('ai_config')
        .select('id')
        .eq('config_key', key)
        .single()

      if (existing) {
        await admin
          .from('ai_config')
          .update({ config_value: value, updated_by: user.id })
          .eq('config_key', key)
      } else {
        await admin
          .from('ai_config')
          .insert({ config_key: key, config_value: value, updated_by: user.id })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configuracoes' },
      { status: 500 }
    )
  }
}
