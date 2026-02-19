import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const productId = searchParams.get('product_id')
    const categoryId = searchParams.get('category_id')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    // Compute date bounds once
    const dateFromISO = dateFrom ? new Date(dateFrom).toISOString() : null
    let dateToISO: string | null = null
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      dateToISO = end.toISOString()
    }

    // Total open tickets
    let openQuery = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress', 'awaiting_customer'])
    if (dateFromISO) openQuery = openQuery.gte('created_at', dateFromISO)
    if (dateToISO) openQuery = openQuery.lte('created_at', dateToISO)
    if (productId) openQuery = openQuery.eq('product_id', productId)
    if (categoryId) openQuery = openQuery.eq('category_id', categoryId)
    const { count: openTickets } = await openQuery

    // My tickets
    let myQuery = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_agent_id', user.id)
      .in('status', ['open', 'in_progress', 'awaiting_customer'])
    if (dateFromISO) myQuery = myQuery.gte('created_at', dateFromISO)
    if (dateToISO) myQuery = myQuery.lte('created_at', dateToISO)
    if (productId) myQuery = myQuery.eq('product_id', productId)
    if (categoryId) myQuery = myQuery.eq('category_id', categoryId)
    const { count: myTickets } = await myQuery

    // SLA breached
    const now = new Date().toISOString()
    let slaQuery = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress', 'awaiting_customer'])
      .lt('sla_resolution_at', now)
    if (dateFromISO) slaQuery = slaQuery.gte('created_at', dateFromISO)
    if (dateToISO) slaQuery = slaQuery.lte('created_at', dateToISO)
    if (productId) slaQuery = slaQuery.eq('product_id', productId)
    if (categoryId) slaQuery = slaQuery.eq('category_id', categoryId)
    const { count: slaBreached } = await slaQuery

    // Resolved count
    let resolvedQuery = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['resolved', 'resolved_ia'])
    if (dateFromISO || dateToISO) {
      if (dateFromISO) resolvedQuery = resolvedQuery.gte('resolved_at', dateFromISO)
      if (dateToISO) resolvedQuery = resolvedQuery.lte('resolved_at', dateToISO)
    } else {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      resolvedQuery = resolvedQuery.gte('resolved_at', todayStart.toISOString())
    }
    if (productId) resolvedQuery = resolvedQuery.eq('product_id', productId)
    if (categoryId) resolvedQuery = resolvedQuery.eq('category_id', categoryId)
    const { count: resolvedCount } = await resolvedQuery

    // Total tickets
    let totalQuery = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
    if (dateFromISO) totalQuery = totalQuery.gte('created_at', dateFromISO)
    if (dateToISO) totalQuery = totalQuery.lte('created_at', dateToISO)
    if (productId) totalQuery = totalQuery.eq('product_id', productId)
    if (categoryId) totalQuery = totalQuery.eq('category_id', categoryId)
    if (status && status !== 'all') totalQuery = totalQuery.eq('status', status)
    if (priority && priority !== 'all') totalQuery = totalQuery.eq('priority', priority)
    const { count: totalTickets } = await totalQuery

    // Tickets by status
    let statusQuery = supabase.from('tickets').select('status')
    if (dateFromISO) statusQuery = statusQuery.gte('created_at', dateFromISO)
    if (dateToISO) statusQuery = statusQuery.lte('created_at', dateToISO)
    if (productId) statusQuery = statusQuery.eq('product_id', productId)
    if (categoryId) statusQuery = statusQuery.eq('category_id', categoryId)
    const { data: allTickets } = await statusQuery as unknown as { data: { status: string }[] | null }

    const statusCounts: Record<string, number> = {}
    allTickets?.forEach((t) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    })

    // Recent tickets
    let recentQuery = supabase
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
    if (dateFromISO) recentQuery = recentQuery.gte('created_at', dateFromISO)
    if (dateToISO) recentQuery = recentQuery.lte('created_at', dateToISO)
    if (productId) recentQuery = recentQuery.eq('product_id', productId)
    if (categoryId) recentQuery = recentQuery.eq('category_id', categoryId)
    if (status && status !== 'all') recentQuery = recentQuery.eq('status', status)
    if (priority && priority !== 'all') recentQuery = recentQuery.eq('priority', priority)
    const { data: recentTickets } = await recentQuery

    return NextResponse.json({
      success: true,
      data: {
        openTickets: openTickets || 0,
        myTickets: myTickets || 0,
        slaBreached: slaBreached || 0,
        resolvedToday: resolvedCount || 0,
        resolvedLabel: (dateFrom || dateTo) ? 'Resolvidos no Periodo' : 'Resolvidos Hoje',
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
