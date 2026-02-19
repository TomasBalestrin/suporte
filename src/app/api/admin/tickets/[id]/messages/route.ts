import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { newMessageCustomer } from '@/lib/email/templates'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const { id } = await params

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', id)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mensagem nao pode ser vazia' },
        { status: 400 }
      )
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        ticket_id: id,
        sender_type: 'agent',
        sender_id: user.id,
        content: body.content.trim(),
        is_internal_note: body.is_internal_note || false,
        attachments: body.attachments || [],
      })
      .select()
      .single()

    if (error) throw error

    // Update ticket status and first response time
    const { data: ticket } = await supabase
      .from('tickets')
      .select('first_response_at, status')
      .eq('id', id)
      .single()

    const ticketUpdate: Record<string, unknown> = {}

    if (!body.is_internal_note) {
      if (!ticket?.first_response_at) {
        ticketUpdate.first_response_at = new Date().toISOString()
      }
      if (ticket?.status === 'open') {
        ticketUpdate.status = 'in_progress'
      }
    }

    if (Object.keys(ticketUpdate).length > 0) {
      await supabase.from('tickets').update(ticketUpdate).eq('id', id)
    }

    // Send email to customer for non-internal messages
    if (!body.is_internal_note) {
      const admin = createAdminClient()
      const { data: ticketData } = await admin
        .from('tickets')
        .select('ticket_code, access_token, customer:customers(name, email)')
        .eq('id', id)
        .single()

      if (ticketData?.customer) {
        const customer = ticketData.customer as unknown as { name: string; email: string }
        const { data: agentData } = await admin
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single()

        const emailData = newMessageCustomer({
          customerName: customer.name,
          ticketCode: ticketData.ticket_code,
          accessToken: ticketData.access_token,
          senderName: agentData?.name || 'Agente',
          preview: body.content.trim().substring(0, 200),
        })
        sendEmail({
          to: customer.email,
          subject: emailData.subject,
          html: emailData.html,
          ticketId: id,
          template: 'new_message',
        }).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar mensagem' },
      { status: 500 }
    )
  }
}
