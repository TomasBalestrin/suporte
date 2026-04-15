import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron follow-up: detecta clientes que a Sofia atendeu com tool reenviar_whatsapp_entrega
 * há X horas mas ainda não clicaram no link (link_clicks.clicado=false no Fluxon).
 * Dispara um segundo WhatsApp educadamente lembrando do acesso.
 *
 * DESATIVADO POR DEFAULT — ativar setando FLUXON_FOLLOWUP_ENABLED=true nas envs.
 *
 * Roda a cada hora via vercel.json; só age sobre conversations com last follow-up < 24h atrás
 * e primeiro reenvio há >= FLUXON_FOLLOWUP_DELAY_HOURS (default 4).
 */
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (process.env.FLUXON_FOLLOWUP_ENABLED !== 'true') {
    return NextResponse.json({ message: 'Follow-up desativado (setar FLUXON_FOLLOWUP_ENABLED=true)', processados: 0 })
  }

  if (!process.env.FLUXON_BASE_URL || !process.env.FLUXON_SUPPORT_API_KEY) {
    return NextResponse.json({ error: 'Integração Fluxon não configurada' }, { status: 500 })
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const delayHours = parseInt(process.env.FLUXON_FOLLOWUP_DELAY_HOURS || '4', 10)
    const lowerBound = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const upperBound = new Date(Date.now() - delayHours * 3600 * 1000).toISOString()

    // Busca conversas com tool reenviar_whatsapp_entrega executada entre delayHours e 24h atrás
    const { data: toolMsgs } = await supabase
      .from('ai_conversation_messages')
      .select('conversation_id, tool_result, created_at, ai_conversations(customer_email, customer_cpf, customer_telefone)')
      .eq('tool_name', 'reenviar_whatsapp_entrega')
      .eq('role', 'tool')
      .gte('created_at', lowerBound)
      .lte('created_at', upperBound)
      .limit(50)

    let disparados = 0
    let pulados = 0

    for (const m of (toolMsgs || [])) {
      const res = m.tool_result as any
      if (!res?.ok) { pulados++; continue }

      const conv = m.ai_conversations as any
      if (!conv) { pulados++; continue }

      // Verifica se já fez follow-up dessa conversa
      const { data: jaFollowup } = await supabase
        .from('ai_conversation_messages')
        .select('id')
        .eq('conversation_id', m.conversation_id)
        .eq('tool_name', 'follow_up_automatico')
        .limit(1)
        .maybeSingle()

      if (jaFollowup) { pulados++; continue }

      // Consulta Fluxon para ver se cliente já clicou em algum link trackeado recente
      const params = new URLSearchParams()
      if (conv.customer_cpf) params.set('cpf', conv.customer_cpf)
      if (conv.customer_email) params.set('email', conv.customer_email)
      if (conv.customer_telefone) params.set('telefone', conv.customer_telefone)

      const perfilRes = await fetch(`${process.env.FLUXON_BASE_URL}/api/support/lead?${params.toString()}`, {
        headers: { 'X-API-Key': process.env.FLUXON_SUPPORT_API_KEY },
      })
      if (!perfilRes.ok) { pulados++; continue }

      const perfil = await perfilRes.json()
      const ultima = perfil.compras?.[0]
      if (!ultima) { pulados++; continue }

      // Se o cliente JA CLICOU em algum link depois do reenvio original, nao fazer follow-up
      const reenvioEm = new Date(m.created_at).getTime()
      const ultimoClique = perfil.link_clicks?.ultimo_clique_em
        ? new Date(perfil.link_clicks.ultimo_clique_em).getTime()
        : 0
      if (ultimoClique > reenvioEm) {
        pulados++
        continue
      }

      const reenvioRes = await fetch(`${process.env.FLUXON_BASE_URL}/api/support/reenviar-entrega`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.FLUXON_SUPPORT_API_KEY,
        },
        body: JSON.stringify({
          cpf: conv.customer_cpf,
          email: conv.customer_email,
          telefone: conv.customer_telefone,
        }),
      })

      const reenvioData = await reenvioRes.json()

      // Registra que fez follow-up (evita repetir)
      await supabase.from('ai_conversation_messages').insert({
        conversation_id: m.conversation_id,
        role: 'tool',
        content: JSON.stringify(reenvioData),
        tool_name: 'follow_up_automatico',
        tool_args: { delay_hours: delayHours },
        tool_result: reenvioData,
      })

      if (reenvioRes.ok) disparados++
      else pulados++
    }

    return NextResponse.json({
      message: `Follow-up: ${disparados} disparados, ${pulados} pulados de ${toolMsgs?.length || 0}`,
      disparados,
      pulados,
    })
  } catch (e: unknown) {
    console.error('[cron/follow-up]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
