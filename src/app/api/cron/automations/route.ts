import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeAutomations } from '@/lib/automations/engine'

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // Check for SLA breaches
    const { data: breachedTickets } = await supabase
      .from('tickets')
      .select('id, status, priority, sla_resolution_at')
      .in('status', ['open', 'in_progress', 'awaiting_customer'])
      .lt('sla_resolution_at', now)
      .is('sla_breached_at', null)

    for (const ticket of breachedTickets || []) {
      // Mark as breached
      await supabase
        .from('tickets')
        .update({ sla_breached_at: now })
        .eq('id', ticket.id)

      await executeAutomations({
        ticket_id: ticket.id,
        trigger_type: 'sla_breached',
        data: { status: ticket.status, priority: ticket.priority },
      })
    }

    // Check for approaching SLA (within 30 minutes)
    const soonThreshold = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const { data: approachingTickets } = await supabase
      .from('tickets')
      .select('id, status, priority, sla_resolution_at')
      .in('status', ['open', 'in_progress', 'awaiting_customer'])
      .gt('sla_resolution_at', now)
      .lt('sla_resolution_at', soonThreshold)
      .is('sla_breached_at', null)

    for (const ticket of approachingTickets || []) {
      await executeAutomations({
        ticket_id: ticket.id,
        trigger_type: 'sla_approaching',
        data: { status: ticket.status, priority: ticket.priority },
      })
    }

    // Check for inactive tickets (no response in 24h)
    const inactiveThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: inactiveTickets } = await supabase
      .from('tickets')
      .select('id, status, priority, updated_at')
      .in('status', ['open', 'in_progress'])
      .lt('updated_at', inactiveThreshold)

    for (const ticket of inactiveTickets || []) {
      await executeAutomations({
        ticket_id: ticket.id,
        trigger_type: 'no_response',
        data: { status: ticket.status, priority: ticket.priority },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        sla_breached: breachedTickets?.length || 0,
        sla_approaching: approachingTickets?.length || 0,
        inactive: inactiveTickets?.length || 0,
      },
    })
  } catch (error) {
    console.error('[Cron] Automations error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao executar automacoes' },
      { status: 500 }
    )
  }
}
