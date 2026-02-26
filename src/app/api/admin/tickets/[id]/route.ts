import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { ticketResolvedCustomer, newTicketAgent } from '@/lib/email/templates'
import { PRIORITY_LABELS } from '@/lib/utils/constants'
import { isAgentOrAdmin } from '@/lib/supabase/guards'
import { executeAutomations } from '@/lib/automations/engine'
import { ticketUpdateSchema } from '@/lib/utils/validation'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

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
    if (!(await isAgentOrAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        product:products(*),
        category:categories(*),
        assigned_agent:users(id, name, email, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error || !ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket nao encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar ticket' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`admin:${ip}`, { limit: 60, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisicoes. Aguarde um momento.' },
        { status: 429 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }
    if (!(await isAgentOrAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = ticketUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Dados invalidos' },
        { status: 400 }
      )
    }

    // Get current ticket for activity log
    const { data: currentTicket } = await supabase
      .from('tickets')
      .select('status, priority, assigned_agent_id')
      .eq('id', id)
      .single()

    const updateData: Record<string, unknown> = {}
    const activities: Array<{ action: string; details: Record<string, unknown> }> = []

    if (parsed.data.status && parsed.data.status !== currentTicket?.status) {
      updateData.status = parsed.data.status
      activities.push({
        action: 'status_changed',
        details: { from: currentTicket?.status, to: parsed.data.status },
      })

      if (parsed.data.status === 'resolved' || parsed.data.status === 'resolved_ia') {
        updateData.resolved_at = new Date().toISOString()
      }
      if (parsed.data.status === 'closed') {
        updateData.closed_at = new Date().toISOString()
      }
    }

    if (parsed.data.priority && parsed.data.priority !== currentTicket?.priority) {
      updateData.priority = parsed.data.priority
      activities.push({
        action: 'priority_changed',
        details: { from: currentTicket?.priority, to: parsed.data.priority },
      })
    }

    if (parsed.data.assigned_agent_id !== undefined && parsed.data.assigned_agent_id !== currentTicket?.assigned_agent_id) {
      updateData.assigned_agent_id = parsed.data.assigned_agent_id || null
      activities.push({
        action: 'assigned',
        details: { agent_id: parsed.data.assigned_agent_id },
      })
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, data: currentTicket })
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Log activities
    for (const activity of activities) {
      await supabase.from('activity_log').insert({
        ticket_id: id,
        actor_type: 'agent',
        actor_id: user.id,
        action: activity.action,
        details: activity.details,
      })
    }

    // Execute automations for status change (non-blocking)
    if (parsed.data.status && parsed.data.status !== currentTicket?.status) {
      executeAutomations({
        ticket_id: id,
        trigger_type: 'status_changed',
        data: { status: parsed.data.status, priority: ticket.priority },
      }).catch(() => {})
    }

    // Send email notifications (non-blocking)
    const admin = createAdminClient()
    const { data: fullTicket } = await admin
      .from('tickets')
      .select('ticket_code, access_token, title, priority, customer:customers(name, email)')
      .eq('id', id)
      .single()

    if (fullTicket?.customer) {
      const customer = fullTicket.customer as unknown as { name: string; email: string }

      // Notify customer when ticket is resolved
      if (parsed.data.status === 'resolved' || parsed.data.status === 'resolved_ia') {
        const emailData = ticketResolvedCustomer({
          customerName: customer.name,
          ticketCode: fullTicket.ticket_code,
          accessToken: fullTicket.access_token,
        })
        sendEmail({
          to: customer.email,
          subject: emailData.subject,
          html: emailData.html,
          ticketId: id,
          template: 'ticket_resolved',
        }).catch(() => {})
      }

      // Notify agent when ticket is assigned
      if (parsed.data.assigned_agent_id && parsed.data.assigned_agent_id !== currentTicket?.assigned_agent_id) {
        const { data: agent } = await admin
          .from('users')
          .select('name, email')
          .eq('id', parsed.data.assigned_agent_id)
          .single()

        if (agent) {
          const emailData = newTicketAgent({
            agentName: agent.name,
            ticketCode: fullTicket.ticket_code,
            ticketId: id,
            customerName: customer.name,
            title: fullTicket.title,
            priority: PRIORITY_LABELS[fullTicket.priority] || fullTicket.priority,
          })
          sendEmail({
            to: agent.email,
            subject: emailData.subject,
            html: emailData.html,
            ticketId: id,
            template: 'ticket_assigned',
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar ticket' },
      { status: 500 }
    )
  }
}
