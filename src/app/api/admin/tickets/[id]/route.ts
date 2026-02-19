import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Get current ticket for activity log
    const { data: currentTicket } = await supabase
      .from('tickets')
      .select('status, priority, assigned_agent_id')
      .eq('id', id)
      .single()

    const updateData: Record<string, unknown> = {}
    const activities: Array<{ action: string; details: Record<string, unknown> }> = []

    if (body.status && body.status !== currentTicket?.status) {
      updateData.status = body.status
      activities.push({
        action: 'status_changed',
        details: { from: currentTicket?.status, to: body.status },
      })

      if (body.status === 'resolved' || body.status === 'resolved_ia') {
        updateData.resolved_at = new Date().toISOString()
      }
      if (body.status === 'closed') {
        updateData.closed_at = new Date().toISOString()
      }
    }

    if (body.priority && body.priority !== currentTicket?.priority) {
      updateData.priority = body.priority
      activities.push({
        action: 'priority_changed',
        details: { from: currentTicket?.priority, to: body.priority },
      })
    }

    if (body.assigned_agent_id !== undefined && body.assigned_agent_id !== currentTicket?.assigned_agent_id) {
      updateData.assigned_agent_id = body.assigned_agent_id || null
      activities.push({
        action: 'assigned',
        details: { agent_id: body.assigned_agent_id },
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

    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar ticket' },
      { status: 500 }
    )
  }
}
