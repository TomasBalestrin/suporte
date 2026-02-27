import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface AutomationRule {
  id: string
  name: string
  trigger_type: string
  conditions: Record<string, unknown>
  actions: Record<string, unknown>
  is_active: boolean
}

interface TriggerContext {
  ticket_id: string
  trigger_type: string
  data?: Record<string, unknown>
}

export async function executeAutomations(context: TriggerContext) {
  const supabase = createAdminClient()

  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('trigger_type', context.trigger_type)
    .eq('is_active', true)

  if (!rules || rules.length === 0) return

  for (const rule of rules as AutomationRule[]) {
    try {
      if (!matchesConditions(rule.conditions, context.data)) continue

      await executeActions(rule.actions, context, supabase)

      // Update execution stats
      await supabase
        .from('automation_rules')
        .update({
          execution_count: (rule as unknown as { execution_count: number }).execution_count + 1,
          last_executed_at: new Date().toISOString(),
        })
        .eq('id', rule.id)
    } catch (error) {
      console.error(`[Automation] Rule "${rule.name}" failed:`, error)
    }
  }
}

function matchesConditions(
  conditions: Record<string, unknown>,
  data?: Record<string, unknown>
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true
  if (!data) return Object.keys(conditions).length === 0

  for (const [key, expected] of Object.entries(conditions)) {
    if (key === 'status' && data.status !== expected) return false
    if (key === 'priority' && data.priority !== expected) return false
    if (key === 'product_id' && data.product_id !== expected) return false
    if (key === 'category_id' && data.category_id !== expected) return false
  }

  return true
}

async function executeActions(
  actions: Record<string, unknown>,
  context: TriggerContext,
  supabase: ReturnType<typeof createAdminClient>
) {
  if (actions.assign_to) {
    await supabase
      .from('tickets')
      .update({ assigned_agent_id: actions.assign_to as string })
      .eq('id', context.ticket_id)
  }

  if (actions.change_priority) {
    await supabase
      .from('tickets')
      .update({ priority: actions.change_priority as string })
      .eq('id', context.ticket_id)
  }

  if (actions.change_status) {
    const updateData: Record<string, unknown> = { status: actions.change_status as string }
    if (actions.change_status === 'resolved' || actions.change_status === 'resolved_ia') {
      updateData.resolved_at = new Date().toISOString()
    }
    await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', context.ticket_id)
  }

  if (actions.add_tag) {
    await supabase
      .from('ticket_tags')
      .upsert({ ticket_id: context.ticket_id, tag_id: actions.add_tag as string })
  }

  if (actions.send_notification) {
    const notif = actions.send_notification as { to: string; template: string }
    const { data: ticket } = await supabase
      .from('tickets')
      .select('ticket_code, title, customer:customers(name, email)')
      .eq('id', context.ticket_id)
      .single()

    if (ticket?.customer) {
      const customer = ticket.customer as unknown as { name: string; email: string }
      await sendEmail({
        to: notif.to === 'customer' ? customer.email : notif.to,
        subject: `[${ticket.ticket_code}] Atualização do seu ticket`,
        html: `<p>Olá ${escapeHtml(customer.name)}, seu ticket &ldquo;${escapeHtml(ticket.title)}&rdquo; foi atualizado.</p>`,
        ticketId: context.ticket_id,
        template: 'automation_notification',
      })
    }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    ticket_id: context.ticket_id,
    actor_type: 'system',
    action: 'automation_executed',
    details: { actions },
  })
}
