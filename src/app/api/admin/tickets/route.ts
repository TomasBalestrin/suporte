import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { escapeIlike, isAgentOrAdmin } from '@/lib/supabase/guards'
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
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }
    if (!(await isAgentOrAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const product_id = searchParams.get('product_id')
    const category_id = searchParams.get('category_id')
    const assigned_agent_id = searchParams.get('assigned_agent_id')
    const customer_id = searchParams.get('customer_id')
    const search = searchParams.get('search')
    // Filtro derivado de atendimento: 'sofia' (só IA) | 'humano' (teve agente) | 'aguardando' (última = cliente)
    const atendimento = searchParams.get('atendimento')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    const SELECT_COLS = `
        *,
        customer:customers(*),
        product:products(id, name),
        category:categories(id, name, color),
        assigned_agent:users(id, name, avatar_url)
      `

    // Aplica os filtros base (status/prioridade/produto/etc) em qualquer query builder de tickets.
    // Tipado como any (igual ao padrão do route.ts do chat) — o builder do supabase-js é encadeável.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyFilters = (q: any): any => {
      if (status) q = q.in('status', status.split(','))
      if (priority) q = q.in('priority', priority.split(','))
      if (product_id) q = q.eq('product_id', product_id)
      if (category_id) q = q.eq('category_id', category_id)
      if (assigned_agent_id) {
        q = assigned_agent_id === 'unassigned' ? q.is('assigned_agent_id', null) : q.eq('assigned_agent_id', assigned_agent_id)
      }
      if (customer_id) q = q.eq('customer_id', customer_id)
      if (search) {
        const escaped = escapeIlike(search)
        q = q.or(`ticket_code.ilike.%${escaped}%,title.ilike.%${escaped}%`)
      }
      return q
    }

    // Deriva os sinais de atendimento das mensagens, p/ um conjunto de ticket ids
    const deriveAtendimento = async (ids: string[]) => {
      const agg: Record<string, { hasAgent: boolean; last: string | null }> = {}
      if (ids.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('ticket_id, sender_type, created_at')
          .in('ticket_id', ids)
          .order('created_at', { ascending: true })
        for (const m of msgs || []) {
          const a = agg[m.ticket_id] || (agg[m.ticket_id] = { hasAgent: false, last: null })
          if (m.sender_type === 'agent') a.hasAgent = true
          a.last = m.sender_type // ordenado asc → última atribuição = mais recente
        }
      }
      return agg
    }
    const sofiaOnlyOf = (a?: { hasAgent: boolean; last: string | null }) => (a ? !a.hasAgent : true)
    const lastOf = (a?: { hasAgent: boolean; last: string | null }) => (a ? a.last : null)

    let tickets: Record<string, unknown>[] = []
    let total = 0

    if (!atendimento) {
      // Caminho normal: pagina no banco, deriva só a página
      const query = applyFilters(
        supabase.from('tickets').select(SELECT_COLS, { count: 'exact' })
      )
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)
      const { data, error, count } = await query
      if (error) throw error
      tickets = (data || []) as Record<string, unknown>[]
      total = count || 0
      const agg = await deriveAtendimento(tickets.map((t) => t.id as string))
      for (const t of tickets) {
        const a = agg[t.id as string]
        t.sofia_only = sofiaOnlyOf(a)
        t.last_sender = lastOf(a)
      }
    } else {
      // Caminho com filtro derivado: pega ids que batem os filtros base, deriva, filtra, pagina
      const idsRes = await applyFilters(supabase.from('tickets').select('id'))
        .order('created_at', { ascending: false })
        .limit(3000)
      const allIds: string[] = (idsRes.data || []).map((r: { id: string }) => r.id)
      const agg = await deriveAtendimento(allIds)
      const matches = (id: string) => {
        const a = agg[id]
        if (atendimento === 'sofia') return sofiaOnlyOf(a)
        if (atendimento === 'humano') return !sofiaOnlyOf(a)
        if (atendimento === 'aguardando') return lastOf(a) === 'customer'
        return true
      }
      const filtered = allIds.filter(matches)
      total = filtered.length
      const pageIds = filtered.slice((page - 1) * limit, page * limit)
      if (pageIds.length > 0) {
        const { data } = await supabase.from('tickets').select(SELECT_COLS).in('id', pageIds)
        const byId = new Map((data || []).map((t: Record<string, unknown>) => [t.id as string, t]))
        tickets = pageIds.map((id) => byId.get(id)).filter(Boolean) as Record<string, unknown>[]
        for (const t of tickets) {
          const a = agg[t.id as string]
          t.sofia_only = sofiaOnlyOf(a)
          t.last_sender = lastOf(a)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar tickets' },
      { status: 500 }
    )
  }
}
