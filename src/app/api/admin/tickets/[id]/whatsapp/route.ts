import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAgentOrAdmin } from '@/lib/supabase/guards'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const TEMPLATE_PADRAO = 'bethel_suporte_chamado_respondido'

/**
 * Envia uma mensagem ao cliente pelo WhatsApp oficial (Bethel 2103), via Fluxon.
 * Espelha o padrão de /messages: auth agente/admin, registra no thread do ticket.
 *
 * Body:
 *   { tipo: 'text', content }                         → texto livre (só na janela 24h)
 *   { tipo: 'template', template_name?, parameters? } → template (reabre a conversa)
 *
 * Fora da janela → 400 { janela_expirada: true } (o painel oferece o template).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`admin:${ip}`, { limit: 60, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Muitas requisições. Aguarde um momento.' }, { status: 429 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    if (!(await isAgentOrAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    if (!process.env.FLUXON_BASE_URL || !process.env.FLUXON_SUPPORT_API_KEY) {
      return NextResponse.json({ success: false, error: 'Integração de WhatsApp não configurada' }, { status: 503 })
    }

    const { id } = await params
    const body = await request.json()
    const tipo: 'text' | 'template' = body.tipo === 'template' ? 'template' : 'text'
    const content = String(body.content || '').trim()

    if (tipo === 'text' && !content) {
      return NextResponse.json({ success: false, error: 'Mensagem vazia' }, { status: 400 })
    }

    // Telefone do cliente (via admin client — bypassa RLS)
    const admin = createAdminClient()
    const { data: ticket } = await admin
      .from('tickets')
      .select('first_response_at, status, customer:customers(name, phone)')
      .eq('id', id)
      .single()

    const customer = ticket?.customer as unknown as { name: string; phone: string | null } | null
    if (!customer?.phone) {
      return NextResponse.json({ success: false, error: 'Cliente sem telefone cadastrado' }, { status: 400 })
    }

    // Monta o payload pro Fluxon
    const firstName = (customer.name || '').trim().split(/\s+/)[0] || 'tudo bem'
    const fluxonBody =
      tipo === 'template'
        ? {
            telefone: customer.phone,
            tipo: 'template',
            template_name: String(body.template_name || TEMPLATE_PADRAO),
            parameters: Array.isArray(body.parameters) ? body.parameters : [firstName],
          }
        : { telefone: customer.phone, tipo: 'text', conteudo: content }

    const flRes = await fetch(`${process.env.FLUXON_BASE_URL}/api/support/mensagem`, {
      method: 'POST',
      headers: { 'X-API-Key': process.env.FLUXON_SUPPORT_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(fluxonBody),
      signal: AbortSignal.timeout(20000),
    })
    const flJson = await flRes.json().catch(() => ({}))

    if (!flRes.ok) {
      // Repassa o sinal de janela expirada pro painel oferecer o template
      return NextResponse.json(
        { success: false, error: flJson.error || 'Falha no envio pelo WhatsApp', janela_expirada: !!flJson.janela_expirada },
        { status: flRes.status === 400 ? 400 : 502 }
      )
    }

    // Registra no thread do ticket (aparece pro atendente e via realtime)
    const registro =
      tipo === 'template'
        ? `📱 *Template enviado no WhatsApp* — ${fluxonBody.template_name}`
        : content
    const { data: message } = await admin
      .from('messages')
      .insert({
        ticket_id: id,
        sender_type: 'agent',
        sender_id: user.id,
        content: registro,
        is_internal_note: false,
        attachments: [],
      })
      .select()
      .single()

    // SLA de 1ª resposta + status (mesma regra do /messages)
    const ticketUpdate: Record<string, unknown> = {}
    if (!ticket?.first_response_at) ticketUpdate.first_response_at = new Date().toISOString()
    if (ticket?.status === 'open') ticketUpdate.status = 'in_progress'
    if (Object.keys(ticketUpdate).length > 0) {
      await admin.from('tickets').update(ticketUpdate).eq('id', id)
    }

    return NextResponse.json({
      success: true,
      data: message,
      canal: 'whatsapp',
      tipo,
      wamid: flJson.wamid || null,
    })
  } catch (error) {
    console.error('[tickets/whatsapp]', error instanceof Error ? error.message : error)
    return NextResponse.json({ success: false, error: 'Erro ao enviar pelo WhatsApp' }, { status: 500 })
  }
}
