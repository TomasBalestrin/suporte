/**
 * createTicket — helper PURO sobre origem (form, auto-create da Sofia, futuro WhatsApp).
 * Extraído de src/app/api/tickets/route.ts (behavior-preserving) + idempotência CAS.
 *
 * A Lenda (red-team 2026-06-16): o helper não conhece "canal" — recebe dados já
 * normalizados/válidos (name≥3, description≥20 garantidos pelo CALLER). A validação
 * zod fica na borda HTTP (/api/tickets); aqui é interno e confia no contrato.
 *
 * Idempotência (a preocupação da A Lenda — TOCTOU): quando `conversationId` é passado,
 * a proteção é um CAS ATÔMICO (statement único, não check-then-act):
 *   UPDATE ai_conversations SET ticket_id=$novo WHERE id=$conv AND ticket_id IS NULL
 * rowCount=0 => perdeu a corrida (auto-create vs clique do botão) => compensa
 * (deleta o ticket recém-criado) e retorna o ticket que já está linkado.
 * Resultado: 1 conversa = 1 ticket = 1 e-mail.
 *
 * NOTA (Bruto, 2026-06-16): A Lenda havia pedido um índice ÚNICO em
 * ai_conversations(ticket_id) como trava no banco. O pré-check de prod mostrou que
 * isso enforça o invariante ERRADO (conv:ticket 1:1) e já está violado por 2 conversas
 * duplicadas de uma corrida PRÉ-EXISTENTE da página de ticket (fora do escopo do Fix B).
 * A idempotência que o Fix B precisa é POR-CONVERSA (≤1 ticket por conversa) — e como
 * ticket_id é coluna única, isso é estrutural; o CAS (`WHERE ticket_id IS NULL`, statement
 * atômico) é a proteção completa contra a corrida do Fix B, sem schema change. A corrida
 * da página de ticket vira débito separado (Soldier Boy/Trem-Bala), como o ticket_code.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { ticketCreatedCustomer } from '@/lib/email/templates'
import { executeAutomations } from '@/lib/automations/engine'
import { normalizeTicketMessages } from '@/lib/tickets/normalize'
import { notifyTelegram } from '@/lib/notify/telegram'

export interface CreateTicketInput {
  name: string
  email: string
  cpf: string
  phone?: string
  product_id: string
  category_id: string
  title: string
  description: string
  /** Histórico (form: {user|ai}; auto-create: {user|assistant|tool}). `tool` é filtrado. */
  messages?: Array<{ role: string; content: string; confidence?: number }>
}

export interface CreateTicketOptions {
  /** Quando presente, ativa a idempotência conversa→ticket (CAS + unique index 019). */
  conversationId?: string
  /** Origem do ticket (coluna tickets.source). Default 'portal' (behavior-preserving). */
  source?: string
  /** Encaminha "novo ticket" pro Telegram do dono. Default true. A Sofia auto-create
   *  passa false (o Hook do /api/ai/chat já anuncia o ticket inline, evita duplicar). */
  notifyTelegram?: boolean
}

export interface CreateTicketResult {
  ticket_id: string
  ticket_code: string
  access_token: string
  /** true quando devolveu um ticket que JÁ existia (pré-check ou corrida perdida). */
  deduped: boolean
}

type Supa = ReturnType<typeof createAdminClient>

async function fetchTicket(supabase: Supa, ticketId: string): Promise<CreateTicketResult | null> {
  const { data } = await supabase
    .from('tickets')
    .select('id, ticket_code, access_token')
    .eq('id', ticketId)
    .maybeSingle()
  if (!data) return null
  return { ticket_id: data.id, ticket_code: data.ticket_code, access_token: data.access_token, deduped: true }
}

export async function createTicket(
  input: CreateTicketInput,
  opts: CreateTicketOptions = {}
): Promise<CreateTicketResult> {
  const supabase = createAdminClient()
  const { conversationId, source = 'portal', notifyTelegram: doNotify = true } = opts
  const { name, email, cpf, phone, product_id, category_id, title, description, messages } = input

  // ── Idempotência: pré-check barato (reduz a corrida; o CAS abaixo fecha o resíduo) ──
  if (conversationId) {
    const { data: conv } = await supabase
      .from('ai_conversations')
      .select('ticket_id')
      .eq('id', conversationId)
      .maybeSingle()
    if (conv?.ticket_id) {
      const existing = await fetchTicket(supabase, conv.ticket_id)
      if (existing) return existing
    }
  }

  // ── Find-or-create customer ──
  let customerId: string
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .single()

  if (existingCustomer) {
    customerId = existingCustomer.id
    await supabase.from('customers').update({ name, phone, cpf }).eq('id', customerId)
  } else {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({ name, email, phone, cpf })
      .select('id')
      .single()
    if (customerError || !newCustomer) throw new Error('Erro ao criar cliente')
    customerId = newCustomer.id
  }

  // ── Create ticket (ticket_code e access_token via trigger) ──
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert({
      customer_id: customerId,
      product_id,
      category_id,
      title,
      description,
      status: 'open',
      priority: 'medium',
      source,
    })
    .select('id, ticket_code, access_token')
    .single()

  if (ticketError || !ticket) throw new Error('Erro ao criar ticket')

  // ── CAS: reivindica a conversa ATOMICAMENTE antes de qualquer efeito colateral ──
  // Se perdeu a corrida, compensa (deleta o ticket) e devolve o vencedor — sem
  // inserir mensagens, sem e-mail, sem automations duplicados.
  if (conversationId) {
    const { data: claimed } = await supabase
      .from('ai_conversations')
      .update({ ticket_id: ticket.id })
      .eq('id', conversationId)
      .is('ticket_id', null)
      .select('id')
    if (!claimed || claimed.length === 0) {
      // Perdeu a corrida: outro caminho (botão / auto-create) já linkou um ticket à
      // conversa. Compensa deletando o ticket recém-criado e devolve o vencedor —
      // ANTES de qualquer efeito colateral (e-mail/mensagens só rodam pra quem venceu).
      await supabase.from('tickets').delete().eq('id', ticket.id)
      const { data: conv2 } = await supabase
        .from('ai_conversations')
        .select('ticket_id')
        .eq('id', conversationId)
        .maybeSingle()
      if (conv2?.ticket_id) {
        const winner = await fetchTicket(supabase, conv2.ticket_id)
        if (winner) return winner
      }
      // Vencedor não localizado (conversa sumiu / ticket vencedor deletado em paralelo):
      // o ticket recém-criado JÁ foi deletado — NÃO seguir pros efeitos colaterais com um
      // ticket inexistente (FK violation silenciosa). Aborta — o caller trata (catch/500/retry).
      throw new Error('createTicket: CAS perdeu a corrida e o ticket vencedor nao foi localizado (conversa em estado inconsistente)')
    }
  }

  // ── Save messages (normalização pura: filtra role='tool', mapeia sender_type) ──
  const messagesToInsert = normalizeTicketMessages(messages).map((m) => ({ ...m, ticket_id: ticket.id }))
  if (messagesToInsert.length > 0) {
    const { error: messagesError } = await supabase.from('messages').insert(messagesToInsert)
    if (messagesError) console.error('Error inserting AI messages:', messagesError)
  }

  // ── Activity log ──
  const { error: activityError } = await supabase.from('activity_log').insert({
    ticket_id: ticket.id,
    actor_type: 'customer',
    action: 'created',
    details: { source },
  })
  if (activityError) console.error('Error logging activity:', activityError)

  // ── E-mail ao cliente (non-blocking) ──
  const emailData = ticketCreatedCustomer({
    customerName: name,
    ticketCode: ticket.ticket_code,
    accessToken: ticket.access_token,
    title,
  })
  sendEmail({
    to: email,
    subject: emailData.subject,
    html: emailData.html,
    ticketId: ticket.id,
    template: 'ticket_created',
  }).catch(() => {})

  // ── Automations (non-blocking) ──
  executeAutomations({
    ticket_id: ticket.id,
    trigger_type: 'ticket_created',
    data: { status: 'open', priority: 'medium', product_id, category_id },
  }).catch(() => {})

  // ── Telegram do dono (non-blocking; Sofia auto-create passa doNotify=false) ──
  // Privacy-safe (decisão do dono): só código + link pro painel, SEM nome/e-mail/conteúdo.
  if (doNotify) {
    const app = process.env.NEXT_PUBLIC_APP_URL || 'https://suporte.bethelsystems.com.br'
    void notifyTelegram(`🎫 Novo ticket ${ticket.ticket_code}\n🔗 ${app}/admin/tickets/${ticket.id}`)
  }

  return {
    ticket_id: ticket.id,
    ticket_code: ticket.ticket_code,
    access_token: ticket.access_token,
    deduped: false,
  }
}
