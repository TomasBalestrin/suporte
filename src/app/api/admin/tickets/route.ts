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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    let query = supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        product:products(id, name),
        category:categories(id, name, color),
        assigned_agent:users(id, name, avatar_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }
    if (priority) {
      const priorities = priority.split(',')
      query = query.in('priority', priorities)
    }
    if (product_id) query = query.eq('product_id', product_id)
    if (category_id) query = query.eq('category_id', category_id)
    if (assigned_agent_id) {
      if (assigned_agent_id === 'unassigned') {
        query = query.is('assigned_agent_id', null)
      } else {
        query = query.eq('assigned_agent_id', assigned_agent_id)
      }
    }
    if (customer_id) query = query.eq('customer_id', customer_id)
    if (search) {
      const escaped = escapeIlike(search)
      query = query.or(
        `ticket_code.ilike.%${escaped}%,title.ilike.%${escaped}%`
      )
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar tickets' },
      { status: 500 }
    )
  }
}
