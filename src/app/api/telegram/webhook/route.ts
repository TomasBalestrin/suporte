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
 * Trata dois tipos de update:
 *  A) message  — o dono dá "Responder" (reply) numa notificação/thread → a resposta vira
 *     mensagem de AGENTE no ticket → dispara e-mail pro cliente (fluxo do painel admin).
 *  B) callback_query — o dono toca o botão "👁 Ver conversa" numa notificação → o bot puxa
 *     as últimas msgs daquele ticket pro Telegram (PII sob demanda, decisão do dono). É
 *     READ-ONLY (sem efeito externo) → não precisa de idempotência.
 *
 * Fronteiras duras (red-team A Lenda, 2026-06-16):
 *  1. AUTH = PORTÃO: secret-token (header X-Telegram-Bot-Api-Secret-Token) checado PRIMEIRO,
 *     timing-safe, ANTES de parsear body. É a única coisa secreta da cadeia (chat_id/from_id
 *     vazam em screenshot). Depois valida from.id (quem agiu === o dono) em AMBOS os ramos.
 *  2. IDEMPOTÊNCIA (só ramo message): PK em telegram_processed_updates(update_id) — o Telegram
 *     reenvia se não receber 200 rápido; insert colide (23505) no retry → no-op (sem e-mail duplo).
 *  3. ORDEM-C (só ramo message): claim → insert msg (await, durável) → 200 rápido →
 *     e-mail + confirmação no after(); ✅ no Telegram só DEPOIS do e-mail entregar.
 *
 * Correlação por PARSE DE TEXTO (dívida consciente — MVP): extrai ticket_code preferindo a
 * 1ª linha do texto citado (notificação e thread têm o código no topo; assim responder a
 * thread também funciona mesmo que uma msg do cliente cite outro SUP). Valida contra o banco.
 * Falha SEMPRE visível. Migrar p/ mapeamento por ID estável quando >1 agente / grupo.
 *
 * Isolamento da Sofia: a msg entra como sender_type='agent' inserida DIRETO no banco — o
 * disparaAutoReply da Sofia só roda no endpoint do cliente e só pra sender_type='customer'.
 */

export const runtime = 'nodejs' // crypto.timingSafeEqual exige runtime Node

const TELEGRAM_API = 'https://api.telegram.org'
const TICKET_CODE_RE = /\bSUP-\d{4}-\d{4,}\b/g
const ok = () => NextResponse.json({ ok: true }, { status: 200 })

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

/** Extrai códigos de ticket distintos, preferindo os da 1ª linha (topo = âncora estável). */
function extractTicketCodes(quoted: string): string[] {
  const firstLine = quoted.split('\n')[0] || ''
  const fromFirst = Array.from(new Set(firstLine.match(TICKET_CODE_RE) || []))
  if (fromFirst.length > 0) return fromFirst
  return Array.from(new Set(quoted.match(TICKET_CODE_RE) || []))
}

const SENDER_LABEL: Record<string, string> = { customer: '👤 Cliente', ai: '🤖 Sofia', agent: '🧑‍💼 Agente' }

/** Monta o texto da conversa (últimas msgs) p/ enviar sob demanda ao Telegram do dono. */
async function buildTicketThread(admin: ReturnType<typeof createAdminClient>, ticketId: string): Promise<string | null> {
  const { data: ticket } = await admin
    .from('tickets')
    .select('ticket_code, status, customer:customers(name)')
    .eq('id', ticketId)
    .maybeSingle()
  if (!ticket) return null

  const { data: msgs } = await admin
    .from('messages')
    .select('sender_type, content, created_at')
    .eq('ticket_id', ticketId)
    .eq('is_internal_note', false)
    .in('sender_type', ['customer', 'ai', 'agent'])
    .order('created_at', { ascending: false })
    .limit(15)

  const ordered = (msgs || []).slice().reverse()
  const lines = ordered.map((m) => {
    const who = SENDER_LABEL[m.sender_type] || m.sender_type
    const txt = String(m.content || '').slice(0, 350)
    return `${who}: ${txt}`
  })
  const cust = (ticket.customer as unknown as { name?: string } | null)?.name
  const header = `💬 ${ticket.ticket_code}${cust ? ' · ' + cust : ''} (${ticket.status}) — últimas ${lines.length} msg(s).\nResponda ESTA mensagem pra enviar ao cliente:`
  return lines.length > 0 ? `${header}\n\n${lines.join('\n\n')}` : `${header}\n\n(sem mensagens ainda)`
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
    callback_query?: {
      id?: string
      data?: string
      from?: { id?: number }
    }
  }
  try {
    update = await request.json()
  } catch {
    return ok() // body inválido — nada a fazer, não reenviar
  }

  const ownerId = process.env.TELEGRAM_CHAT_ID
  if (!ownerId) return ok() // sem o dono configurado, não dá pra validar — 200 mudo

  // ── RAMO B: callback do botão "👁 Ver conversa" (READ-ONLY, sob demanda) ──
  if (update.callback_query) {
    const cb = update.callback_query
    if (String(cb.from?.id) !== ownerId) return ok() // só o dono
    const token = process.env.TELEGRAM_BOT_TOKEN
    // Para o "loading" do botão (best-effort, não bloqueia o resto).
    if (token && cb.id) {
      await fetch(`${TELEGRAM_API}/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => {})
    }
    const m = String(cb.data || '').match(/^view:(.+)$/)
    if (!m) return ok()
    const admin = createAdminClient()
    const thread = await buildTicketThread(admin, m[1]).catch(() => null)
    await notifyTelegram(thread || '⚠️ Não consegui carregar a conversa desse ticket.')
    return ok()
  }

  // ── RAMO A: mensagem (responder ticket) ──
  const msg = update.message
  if (!msg || typeof msg.text !== 'string') return ok() // ignora foto/sticker/edited/etc.

  // ── Fronteira 1b: só aceita do DONO (em chat privado from.id === chat.id === ownerId) ──
  if (String(msg.from?.id) !== ownerId || String(msg.chat?.id) !== ownerId) {
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

  // Em falha de TRABALHO transitório (DB), solta o claim e devolve 5xx pro Telegram reenviar.
  // Em falha de NEGÓCIO (sem código, fechado, etc.) mantém o claim e responde 200 + aviso visível.
  const releaseAndRetry = async () => {
    await admin.from('telegram_processed_updates').delete().eq('update_id', updateId).then(
      () => {}, () => {}
    )
    return NextResponse.json({ error: 'retry' }, { status: 500 })
  }

  // ── Correlação: ticket_code do texto CITADO (reply_to), preferindo a 1ª linha. Falha VISÍVEL ──
  const ownText = msg.text.trim()
  const quoted = String(msg.reply_to_message?.text || '')
  const codes = extractTicketCodes(quoted)

  if (codes.length === 0) {
    await notifyTelegram(
      '⚠️ Não identifiquei o ticket. Use "Responder" (reply) em cima da notificação que tem o código SUP-AAAA-XXXX e escreva sua resposta junto.'
    )
    return ok()
  }
  if (codes.length > 1) {
    await notifyTelegram(
      `⚠️ Achei mais de um ticket na linha citada (${codes.join(', ')}). Responda citando a notificação de um ticket só.`
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

  // ── Política de estado: closed recusa; o resto avança pra in_progress ──
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
