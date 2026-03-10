import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { escapeIlike, isAgentOrAdmin } from '@/lib/supabase/guards'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`admin:${ip}`, { limit: 60, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisições. Aguarde um momento.' },
        { status: 429 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }
    if (!(await isAgentOrAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    const admin = createAdminClient()

    // Build query for customers
    let query = admin
      .from('customers')
      .select('id, name, email, cpf, phone, created_at', { count: 'exact' })

    if (search) {
      const escaped = escapeIlike(search)
      const cleanSearch = search.replace(/\D/g, '')
      // Search by name, email, or CPF
      if (cleanSearch.length >= 3) {
        query = query.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%,cpf.ilike.%${cleanSearch}%`)
      } else {
        query = query.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`)
      }
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: customers, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar clientes' },
        { status: 500 }
      )
    }

    // Get ticket counts for these customers
    const customerIds = (customers || []).map((c) => c.id)

    let ticketCounts: Record<string, { total: number; open: number; last_at: string | null }> = {}

    if (customerIds.length > 0) {
      const { data: tickets } = await admin
        .from('tickets')
        .select('customer_id, status, created_at')
        .in('customer_id', customerIds)

      if (tickets) {
        for (const t of tickets) {
          if (!ticketCounts[t.customer_id]) {
            ticketCounts[t.customer_id] = { total: 0, open: 0, last_at: null }
          }
          ticketCounts[t.customer_id].total++
          if (['open', 'in_progress', 'awaiting_customer'].includes(t.status)) {
            ticketCounts[t.customer_id].open++
          }
          if (!ticketCounts[t.customer_id].last_at || t.created_at > ticketCounts[t.customer_id].last_at!) {
            ticketCounts[t.customer_id].last_at = t.created_at
          }
        }
      }
    }

    const data = (customers || []).map((c) => ({
      ...c,
      ticket_count: ticketCounts[c.id]?.total || 0,
      open_ticket_count: ticketCounts[c.id]?.open || 0,
      last_ticket_at: ticketCounts[c.id]?.last_at || null,
    }))

    const total = count || 0

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
