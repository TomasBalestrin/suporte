import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAgentOrAdmin } from '@/lib/supabase/guards'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
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

    const now = new Date().toISOString()

    // Helper to apply common date/product/category filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyFilters(query: any, dateCol = 'created_at') {
      if (dateFromISO) query = query.gte(dateCol, dateFromISO)
      if (dateToISO) query = query.lte(dateCol, dateToISO)
      if (productId) query = query.eq('product_id', productId)
      if (categoryId) query = query.eq('category_id', categoryId)
      return query
    }

    // Build resolved query with special date handling
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

    // Build total query with optional status/priority filters
    let totalQuery = applyFilters(
      supabase.from('tickets').select('*', { count: 'exact', head: true })
    )
    if (status && status !== 'all') totalQuery = totalQuery.eq('status', status)
    if (priority && priority !== 'all') totalQuery = totalQuery.eq('priority', priority)

    // Build recent tickets query
    let recentQuery = applyFilters(
      supabase.from('tickets')
        .select(`*, customer:customers(name, email), product:products(name), category:categories(name), assigned_agent:users(name)`)
        .order('created_at', { ascending: false })
        .limit(10)
    )
    if (status && status !== 'all') recentQuery = recentQuery.eq('status', status)
    if (priority && priority !== 'all') recentQuery = recentQuery.eq('priority', priority)

    // Run ALL queries in parallel instead of sequentially (N+1 fix)
    const [
      { count: openTickets },
      { count: myTickets },
      { count: slaBreached },
      { count: resolvedCount },
      { count: totalTickets },
      { data: allTickets },
      { data: recentTickets },
    ] = await Promise.all([
      applyFilters(
        supabase.from('tickets').select('*', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress', 'awaiting_customer'])
      ),
      applyFilters(
        supabase.from('tickets').select('*', { count: 'exact', head: true })
          .eq('assigned_agent_id', user.id)
          .in('status', ['open', 'in_progress', 'awaiting_customer'])
      ),
      applyFilters(
        supabase.from('tickets').select('*', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress', 'awaiting_customer'])
          .lt('sla_resolution_at', now)
      ),
      resolvedQuery,
      totalQuery,
      applyFilters(supabase.from('tickets').select('status')),
      recentQuery,
    ])

    const statusCounts: Record<string, number> = {}
    ;(allTickets as { status: string }[] | null)?.forEach((t) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    })

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
