import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    // Total open tickets
    const { count: openTickets } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress', 'awaiting_customer'])

    // My tickets
    const { count: myTickets } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_agent_id', user.id)
      .in('status', ['open', 'in_progress', 'awaiting_customer'])

    // SLA breached
    const now = new Date().toISOString()
    const { count: slaBreached } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress', 'awaiting_customer'])
      .lt('sla_resolution_at', now)

    // Resolved today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count: resolvedToday } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['resolved', 'resolved_ia'])
      .gte('resolved_at', todayStart.toISOString())

    // Total tickets
    const { count: totalTickets } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })

    // Tickets by status
    const { data: allTickets } = await supabase
      .from('tickets')
      .select('status') as { data: { status: string }[] | null }

    const statusCounts: Record<string, number> = {}
    allTickets?.forEach((t) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    })

    // Recent tickets
    const { data: recentTickets } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(name, email),
        product:products(name),
        category:categories(name),
        assigned_agent:users(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        openTickets: openTickets || 0,
        myTickets: myTickets || 0,
        slaBreached: slaBreached || 0,
        resolvedToday: resolvedToday || 0,
        totalTickets: totalTickets || 0,
        statusCounts,
        recentTickets: recentTickets || [],
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar metricas' },
      { status: 500 }
    )
  }
}
