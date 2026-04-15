import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`msg-read:${ip}`, { limit: 60, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisicoes. Aguarde um momento.' },
        { status: 429 }
      )
    }

    const supabase = createAdminClient()
    const { token } = await params

    // Get ticket by access_token
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('access_token', token)
      .single()

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket nao encontrado' },
        { status: 404 }
      )
    }

    // Get messages (exclude internal notes for customer view)
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .eq('is_internal_note', false)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar mensagens' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { token } = await params
    const body = await request.json()

    const ip = getClientIp(request)
    const { allowed } = rateLimit(`customer:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas mensagens. Aguarde um momento.' },
        { status: 429 }
      )
    }

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mensagem não pode ser vazia' },
        { status: 400 }
      )
    }

    if (body.content.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Mensagem muito longa (máximo 10.000 caracteres)' },
        { status: 400 }
      )
    }

    // Validate attachments if provided
    if (body.attachments) {
      if (!Array.isArray(body.attachments) || body.attachments.length > 10) {
        return NextResponse.json(
          { success: false, error: 'Anexos inválidos' },
          { status: 400 }
        )
      }
      for (const att of body.attachments) {
        if (!att || typeof att.url !== 'string' || typeof att.name !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Formato de anexo inválido' },
            { status: 400 }
          )
        }
      }
    }

    // Get ticket by access_token
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, customer_id, status, product_id, category_id, description')
      .eq('access_token', token)
      .single()

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket nao encontrado' },
        { status: 404 }
      )
    }

    // Block messages on closed tickets
    if (ticket.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Este ticket foi encerrado e nao aceita novas mensagens' },
        { status: 403 }
      )
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'customer',
        sender_id: ticket.customer_id,
        content: body.content.trim(),
        is_internal_note: false,
        attachments: body.attachments || [],
      })
      .select()
      .single()

    if (error) throw error

    // If ticket was awaiting_customer, change back to open
    if (ticket.status === 'awaiting_customer' || ticket.status === 'resolved') {
      await supabase
        .from('tickets')
        .update({ status: 'open' })
        .eq('id', ticket.id)
    }

    // ─── Auto-reply da Sofia (assincrono, nao bloqueia retorno) ───
    disparaAutoReply(supabase, request, ticket, body.content.trim()).catch(err =>
      console.error('[auto-reply]', err?.message || err)
    )

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar mensagem' },
      { status: 500 }
    )
  }
}

async function disparaAutoReply(
  supabase: ReturnType<typeof createAdminClient>,
  request: NextRequest,
  ticket: { id: string; customer_id: string; product_id: string | null; category_id: string | null; description: string | null },
  customerQuestion: string
): Promise<void> {
  // Debounce: se a IA ja respondeu nos ultimos 30s, nao responde de novo.
  const agora = Date.now()
  const { data: ultimaIA } = await supabase
    .from('messages')
    .select('created_at')
    .eq('ticket_id', ticket.id)
    .eq('sender_type', 'ai')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ultimaIA && (agora - new Date(ultimaIA.created_at).getTime()) < 30000) {
    return
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('email, phone, cpf')
    .eq('id', ticket.customer_id)
    .single()

  if (!customer) return

  const origin = request.nextUrl.origin
  const res = await fetch(`${origin}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: customerQuestion,
      product_id: ticket.product_id,
      category_id: ticket.category_id,
      customer: {
        email: customer.email,
        cpf: customer.cpf,
        telefone: customer.phone,
      },
    }),
    signal: AbortSignal.timeout(20000),
  })

  const json = await res.json()
  if (!json.success || !json.data?.answer) return

  await supabase.from('messages').insert({
    ticket_id: ticket.id,
    sender_type: 'ai',
    content: json.data.answer,
  })
}
