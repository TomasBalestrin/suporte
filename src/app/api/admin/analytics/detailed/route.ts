import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const admin = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '30' // days
    const productId = searchParams.get('product_id')
    const categoryId = searchParams.get('category_id')
    const daysAgo = parseInt(period, 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)
    const startDateISO = startDate.toISOString()

    // Tickets created in period
    let ticketsQuery = admin
      .from('tickets')
      .select('id, status, priority, created_at, resolved_at, first_response_at, satisfaction_rating, assigned_agent_id, product_id')
      .gte('created_at', startDateISO)
    if (productId) ticketsQuery = ticketsQuery.eq('product_id', productId)
    if (categoryId) ticketsQuery = ticketsQuery.eq('category_id', categoryId)

    const { data: periodTickets } = await ticketsQuery
    const tickets = periodTickets || []

    // CSAT data
    let csatQuery = admin
      .from('tickets')
      .select('satisfaction_rating, satisfaction_comment')
      .not('satisfaction_rating', 'is', null)
      .gte('satisfaction_rated_at', startDateISO)
    if (productId) csatQuery = csatQuery.eq('product_id', productId)
    if (categoryId) csatQuery = csatQuery.eq('category_id', categoryId)

    const { data: csatTickets } = await csatQuery
    const ratings = csatTickets || []
    const avgRating = ratings.length > 0
      ? ratings.reduce((acc, t) => acc + (t.satisfaction_rating || 0), 0) / ratings.length
      : 0
    const ratingDistribution = [1, 2, 3, 4, 5].map(
      (r) => ratings.filter((t) => t.satisfaction_rating === r).length
    )

    // Tickets per day (for chart)
    const ticketsPerDay: Record<string, { created: number; resolved: number }> = {}
    for (let i = 0; i < Math.min(daysAgo, 30); i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      ticketsPerDay[key] = { created: 0, resolved: 0 }
    }

    tickets.forEach((t) => {
      const day = t.created_at.split('T')[0]
      if (ticketsPerDay[day]) ticketsPerDay[day].created++
    })

    // Resolved tickets in period
    let resolvedQuery = admin
      .from('tickets')
      .select('resolved_at')
      .not('resolved_at', 'is', null)
      .gte('resolved_at', startDateISO)
    if (productId) resolvedQuery = resolvedQuery.eq('product_id', productId)
    if (categoryId) resolvedQuery = resolvedQuery.eq('category_id', categoryId)

    const { data: resolvedInPeriod } = await resolvedQuery

    ;(resolvedInPeriod || []).forEach((t) => {
      const day = t.resolved_at!.split('T')[0]
      if (ticketsPerDay[day]) ticketsPerDay[day].resolved++
    })

    // Convert to sorted array
    const dailyData = Object.entries(ticketsPerDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }))

    // Agent performance
    const agentStats: Record<string, { name: string; total: number; resolved: number; avgResponseTime: number; responseCount: number }> = {}
    const { data: agents } = await admin.from('users').select('id, name').eq('is_active', true)
    ;(agents || []).forEach((a) => {
      agentStats[a.id] = { name: a.name, total: 0, resolved: 0, avgResponseTime: 0, responseCount: 0 }
    })

    tickets.forEach((t) => {
      if (t.assigned_agent_id && agentStats[t.assigned_agent_id]) {
        agentStats[t.assigned_agent_id].total++
        if (t.status === 'resolved' || t.status === 'resolved_ia' || t.status === 'closed') {
          agentStats[t.assigned_agent_id].resolved++
        }
        if (t.first_response_at && t.created_at) {
          const responseTime = (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / 60000 // minutes
          agentStats[t.assigned_agent_id].avgResponseTime += responseTime
          agentStats[t.assigned_agent_id].responseCount++
        }
      }
    })

    const agentPerformance = Object.values(agentStats)
      .filter((a) => a.total > 0)
      .map((a) => ({
        name: a.name,
        total: a.total,
        resolved: a.resolved,
        resolutionRate: a.total > 0 ? Math.round((a.resolved / a.total) * 100) : 0,
        avgResponseMinutes: a.responseCount > 0 ? Math.round(a.avgResponseTime / a.responseCount) : 0,
      }))
      .sort((a, b) => b.total - a.total)

    // Priority distribution
    const priorityCounts: Record<string, number> = {}
    tickets.forEach((t) => {
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1
    })

    // AI stats
    let aiQuery = admin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved_ia')
      .gte('created_at', startDateISO)
    if (productId) aiQuery = aiQuery.eq('product_id', productId)
    if (categoryId) aiQuery = aiQuery.eq('category_id', categoryId)
    const { count: aiResolvedCount } = await aiQuery

    let totalQuery = admin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDateISO)
    if (productId) totalQuery = totalQuery.eq('product_id', productId)
    if (categoryId) totalQuery = totalQuery.eq('category_id', categoryId)
    const { count: totalInPeriod } = await totalQuery

    return NextResponse.json({
      success: true,
      data: {
        period: daysAgo,
        totalTickets: tickets.length,
        resolvedCount: (resolvedInPeriod || []).length,
        aiResolvedCount: aiResolvedCount || 0,
        aiResolutionRate: (totalInPeriod || 0) > 0
          ? Math.round(((aiResolvedCount || 0) / (totalInPeriod || 1)) * 100)
          : 0,
        csat: {
          average: Math.round(avgRating * 10) / 10,
          total: ratings.length,
          distribution: ratingDistribution,
        },
        dailyData,
        agentPerformance,
        priorityCounts,
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar analytics' },
      { status: 500 }
    )
  }
}
