import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface SlaBreachResult {
  breached: number
  approaching: number
  notified: number
}

export async function checkSlaBreaches(): Promise<SlaBreachResult> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  let notified = 0

  // Find tickets that have breached SLA but not yet marked
  const { data: breachedTickets } = await supabase
    .from('tickets')
    .select(`
      id, ticket_code, title, status, priority, sla_resolution_at,
      assigned_agent_id,
      customer:customers(name, email),
      assigned_agent:users(name, email)
    `)
    .in('status', ['open', 'in_progress', 'awaiting_customer'])
    .lt('sla_resolution_at', now)
    .is('sla_breached_at', null)

  for (const ticket of breachedTickets || []) {
    // Mark as breached
    await supabase
      .from('tickets')
      .update({ sla_breached_at: now })
      .eq('id', ticket.id)

    // Log activity
    await supabase.from('activity_log').insert({
      ticket_id: ticket.id,
      actor_type: 'system',
      action: 'sla_breached',
      details: { sla_resolution_at: ticket.sla_resolution_at },
    })

    // Notify assigned agent if exists
    const agent = ticket.assigned_agent as unknown as { name: string; email: string } | null
    if (agent?.email) {
      await sendEmail({
        to: agent.email,
        subject: `[SLA Violado] ${ticket.ticket_code} - ${ticket.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #18181B; color: #E4E4E7; border-radius: 12px;">
            <h2 style="color: #EF4444;">SLA Violado</h2>
            <p>O ticket <strong>${escapeHtml(ticket.ticket_code)}</strong> ultrapassou o prazo de resolucao do SLA.</p>
            <p><strong>Titulo:</strong> ${escapeHtml(ticket.title)}</p>
            <p><strong>Prioridade:</strong> ${escapeHtml(ticket.priority)}</p>
            <p><strong>Status:</strong> ${escapeHtml(ticket.status)}</p>
            <p style="margin-top: 16px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}"
                 style="background: #00B8D9; color: #000; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Ver Ticket
              </a>
            </p>
          </div>`,
        ticketId: ticket.id,
        template: 'sla_breach',
      })
      notified++
    }

    // Also notify admins
    const { data: admins } = await supabase
      .from('users')
      .select('email, name')
      .eq('role', 'admin')
      .eq('is_active', true)

    for (const admin of admins || []) {
      if (admin.email !== agent?.email) {
        await sendEmail({
          to: admin.email,
          subject: `[SLA Violado] ${ticket.ticket_code} - Atencao necessaria`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #18181B; color: #E4E4E7; border-radius: 12px;">
              <h2 style="color: #EF4444;">SLA Violado - Escalonamento</h2>
              <p>O ticket <strong>${escapeHtml(ticket.ticket_code)}</strong> violou o SLA e requer atencao.</p>
              <p><strong>Titulo:</strong> ${escapeHtml(ticket.title)}</p>
              <p><strong>Prioridade:</strong> ${escapeHtml(ticket.priority)}</p>
              <p><strong>Agente responsavel:</strong> ${escapeHtml(agent?.name || 'Nao atribuido')}</p>
              <p style="margin-top: 16px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}"
                   style="background: #EF4444; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  Ver Ticket
                </a>
              </p>
            </div>`,
          ticketId: ticket.id,
          template: 'sla_breach_escalation',
        })
        notified++
      }
    }
  }

  // Find tickets approaching SLA breach (within 30 min)
  const soonThreshold = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const { data: approachingTickets } = await supabase
    .from('tickets')
    .select('id')
    .in('status', ['open', 'in_progress', 'awaiting_customer'])
    .gt('sla_resolution_at', now)
    .lt('sla_resolution_at', soonThreshold)
    .is('sla_breached_at', null)

  return {
    breached: breachedTickets?.length || 0,
    approaching: approachingTickets?.length || 0,
    notified,
  }
}
