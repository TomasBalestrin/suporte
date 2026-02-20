import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
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

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mensagem nao pode ser vazia' },
        { status: 400 }
      )
    }

    // Get ticket by access_token
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, customer_id, status')
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

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar mensagem' },
      { status: 500 }
    )
  }
}
