import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { newMessageCustomer } from '@/lib/email/templates'
import { notifyTelegram } from '@/lib/notify/telegram'

/**
 * Webhook do Telegram — MÃO DUPLA (responder ticket pelo chat privado do dono).
 *
 * O dono usa "Responder" do Telegram em cima de uma notificação (que carrega o código
 * SUP-AAAA-XXXX no texto) e escreve a resposta. Aqui a resposta vira mensagem de AGENTE
 * no ticket → dispara e-mail pro cliente (mesmo fluxo do painel admin).
 *
 * Fronteiras duras (red-team A Lenda, 2026-06-16):
 *  1. AUTH = PORTÃO: secret-token (header X-Telegram-Bot-Api-Secret-Token) checado PRIMEIRO,
 *     timing-safe, ANTES de parsear o body. É a única coisa secreta da cadeia (chat_id/from_id
 *     vazam em screenshot). Só depois valida from.id (quem escreveu === o dono).
 *  2. IDEMPOTÊNCIA: o Telegram REENVIA o update se não receber 200 rápido. PK em
 *     telegram_processed_updates(update_id) é o lock — insert colide (23505) no retry → no-op.
 *     Sem isso = e-mail duplicado pro cliente.
 *  3. ORDEM-C: claim do update → insert da msg (await, durável) → 200 rápido →
 *     e-mail + confirmação no after() (serverless mata fire-and-forget pós-200). O ✅ no
 *     Telegram só sai DEPOIS do e-mail entregar (prova de entrega, não de intenção).
 *
 * Correlação por PARSE DE TEXTO (dívida consciente — MVP): extrai o ticket_code do texto
 * citado (reply_to_message.text) e valida contra o banco. Falha SEMPRE visível (nunca
 * silenciosa) — se não achar/ambíguo, avisa o dono no Telegram. Migrar pra mapeamento por
 * ID estável quando houver >1 agente ou notificação em grupo (ver STATE.md).
 *
 * Isolamento da Sofia: a msg entra como sender_type='agent' inserida DIRETO no banco — o
 * disparaAutoReply da Sofia só roda no endpoint do cliente e só pra sender_type='customer'.
 * Logo, resposta de agente NUNCA gatilha a IA (sem loop de feedback).
 */

export const runtime = 'nodejs' // crypto.timingSafeEqual exige runtime Node

const TICKET_CODE_RE = /\bSUP-\d{4}-\d{4,}\b/g
const ok = () => NextResponse.json({ ok: true }, { status: 200 })

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export async function POST(request: NextRequest) {
  // ── Fronteira 1a (PORTÃO): secret-token primeiro, timing-safe, ANTES de parsear body ──
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) return ok() // feature desligada: 200 mudo, sem dar pista
  const provided = request.headers.get('x-telegram-bot-api-secret-token') || ''
  if (!timingSafeEqualStr(provided, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // ── Parse do body (só depois do portão) ──
  let update: {
    update_id?: number
    message?: {
      text?: string
      from?: { id?: number }
      chat?: { id?: number }
      reply_to_message?: { text?: string }
    }
  }
  try {
    update = await request.json()
  } catch {
    return ok() // body inválido — nada a fazer, não reenviar
  }

  const msg = update?.message
  // Só tratamos mensagem de TEXTO (ignora foto/sticker/edited_message/etc.)
  if (!msg || typeof msg.text !== 'string') return ok()

  // ── Fronteira 1b: só aceita do DONO (em chat privado from.id === chat.id === TELEGRAM_CHAT_ID) ──
  const ownerId = process.env.TELEGRAM_CHAT_ID
  if (!ownerId || String(msg.from?.id) !== ownerId || String(msg.chat?.id) !== ownerId) {
    return ok() // não é o dono — ignora silenciosamente (200, sem retry)
  }

  const updateId = update.update_id
  if (typeof updateId !== 'number') return ok() // update malformado (Telegram sempre manda)

  const admin = createAdminClient()

  // ── Fronteira 2: claim atômico do update (PK = lock anti-retry/replay) ──
  const { error: claimErr } = await admin
    .from('telegram_processed_updates')
    .insert({ update_id: updateId })
  if (claimErr) {
    if (claimErr.code === '23505') return ok() // já processado → idempotente, sai
    return NextResponse.json({ error: 'dedup unavailable' }, { status: 500 }) // transitório → Telegram reenvia
  }

  // A partir daqui o update está reivindicado. Em falha de TRABALHO transitório (DB), soltamos
  // o claim e devolvemos 5xx pro Telegram reenviar. Em falha de NEGÓCIO (sem código, ticket
  // fechado, etc.) mantemos o claim e respondemos 200 + aviso visível no Telegram.
  const releaseAndRetry = async () => {
    await admin.from('telegram_processed_updates').delete().eq('update_id', updateId).then(
      () => {}, () => {}
    )
    return NextResponse.json({ error: 'retry' }, { status: 500 })
  }

  // ── Correlação: ticket_code do texto CITADO (reply_to). Falha sempre VISÍVEL ──
  const ownText = msg.text.trim()
  const quoted = String(msg.reply_to_message?.text || '')
  const codes = Array.from(new Set(quoted.match(TICKET_CODE_RE) || []))

  if (codes.length === 0) {
    await notifyTelegram(
      '⚠️ Não identifiquei o ticket. Use "Responder" (reply) em cima da notificação que tem o código SUP-AAAA-XXXX e escreva sua resposta junto.'
    )
    return ok()
  }
  if (codes.length > 1) {
    await notifyTelegram(
      `⚠️ Achei mais de um ticket na mensagem citada (${codes.join(', ')}). Responda citando a notificação de um ticket só.`
    )
    return ok()
  }
  const ticketCode = codes[0]

  if (!ownText) {
    await notifyTelegram(`⚠️ ${ticketCode}: sua resposta veio vazia — não enviei nada.`)
    return ok()
  }

  // ── Valida contra o banco (regex dá candidato; banco dá a verdade) ──
  const { data: ticket, error: tErr } = await admin
    .from('tickets')
    .select('id, ticket_code, access_token, status, first_response_at, customer:customers(name, email)')
    .eq('ticket_code', ticketCode)
    .maybeSingle()

  if (tErr) return releaseAndRetry()
  if (!ticket) {
    await notifyTelegram(`⚠️ Ticket ${ticketCode} não encontrado — não enviei nada.`)
    return ok()
  }

  // ── Política de estado (item 5): closed recusa; o resto avança pra in_progress ──
  if (ticket.status === 'closed') {
    await notifyTelegram(`⚠️ ${ticket.ticket_code} está encerrado — não respondi. Reabra no painel se precisar.`)
    return ok()
  }

  // ── Fronteira 3a: insert da msg de AGENTE (await, durável — efeito real ANTES do 200) ──
  const { error: insErr } = await admin.from('messages').insert({
    ticket_id: ticket.id,
    sender_type: 'agent',
    sender_id: null, // via Telegram (sem user Supabase)
    content: ownText,
    is_internal_note: false,
    attachments: [],
  })
  if (insErr) return releaseAndRetry()

  // Status + first_response_at (espelha o fluxo do painel admin)
  const ticketUpdate: Record<string, unknown> = {}
  if (!ticket.first_response_at) ticketUpdate.first_response_at = new Date().toISOString()
  if (ticket.status !== 'in_progress') ticketUpdate.status = 'in_progress'
  if (Object.keys(ticketUpdate).length > 0) {
    const { error: updErr } = await admin.from('tickets').update(ticketUpdate).eq('id', ticket.id)
    // Falha aqui não duplica nem bloqueia (msg já durável + 200 dado): só loga p/ não ficar
    // invisível — ticket poderia ficar 'open' com resposta dentro (dívida 2, Luz Estrela).
    if (updErr) console.error(`[telegram] falha ao atualizar status do ticket ${ticket.ticket_code}:`, updErr.message)
  }

  const customer = ticket.customer as unknown as { name: string; email: string } | null

  // ── Fronteira 3b: 200 rápido; e-mail + confirmação no after() (não morre pós-resposta) ──
  after(async () => {
    let emailOk = false
    if (customer?.email) {
      const emailData = newMessageCustomer({
        customerName: customer.name,
        ticketCode: ticket.ticket_code,
        accessToken: ticket.access_token,
        senderName: 'Suporte',
        preview: ownText.substring(0, 200),
      })
      const res = await sendEmail({
        to: customer.email,
        subject: emailData.subject,
        html: emailData.html,
        ticketId: ticket.id,
        template: 'new_message',
      }).catch(() => null)
      emailOk = !!res
    }
    // ✅ só após o e-mail sair de verdade (prova de entrega). Sem PII (só código + status).
    await notifyTelegram(
      emailOk
        ? `✅ ${ticket.ticket_code} — resposta enviada ao cliente.`
        : `⚠️ ${ticket.ticket_code} — resposta salva no ticket, mas o e-mail ao cliente falhou. Veja o painel.`
    )
  })

  return ok()
}
