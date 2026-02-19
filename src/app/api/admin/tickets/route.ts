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
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const product_id = searchParams.get('product_id')
    const category_id = searchParams.get('category_id')
    const assigned_agent_id = searchParams.get('assigned_agent_id')
    const customer_id = searchParams.get('customer_id')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

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
      query = query.or(
        `ticket_code.ilike.%${search}%,title.ilike.%${search}%`
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
