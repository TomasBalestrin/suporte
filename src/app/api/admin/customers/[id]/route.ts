import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAgentOrAdmin } from '@/lib/supabase/guards'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const admin = createAdminClient()

    // Fetch customer
    const { data: customer, error: customerError } = await admin
      .from('customers')
      .select('id, name, email, cpf, phone, created_at')
      .eq('id', id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Fetch all tickets for this customer
    const { data: tickets } = await admin
      .from('tickets')
      .select(`
        id,
        ticket_code,
        title,
        status,
        priority,
        created_at,
        updated_at,
        resolved_at,
        satisfaction_rating,
        product:products(id, name),
        category:categories(id, name)
      `)
      .eq('customer_id', id)
      .order('created_at', { ascending: false })

    const allTickets = tickets || []

    // Calculate stats
    const totalTickets = allTickets.length
    const openTickets = allTickets.filter((t) =>
      ['open', 'in_progress', 'awaiting_customer'].includes(t.status)
    ).length
    const resolvedTickets = allTickets.filter((t) =>
      ['resolved', 'resolved_ia', 'closed'].includes(t.status)
    ).length
    const resolvedByAi = allTickets.filter((t) => t.status === 'resolved_ia').length
    const ratingsArr = allTickets
      .map((t) => t.satisfaction_rating)
      .filter((r): r is number => r != null && r > 0)
    const avgSatisfaction = ratingsArr.length > 0
      ? Math.round((ratingsArr.reduce((a, b) => a + b, 0) / ratingsArr.length) * 10) / 10
      : null

    const sortedByDate = [...allTickets].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const firstContact = sortedByDate[0]?.created_at || null
    const lastContact = sortedByDate[sortedByDate.length - 1]?.created_at || null

    // Unique products
    const productSet = new Set<string>()
    for (const t of allTickets) {
      if (t.product && typeof t.product === 'object' && 'name' in t.product) {
        productSet.add(String((t.product as { name: string }).name))
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        customer,
        stats: {
          total_tickets: totalTickets,
          open_tickets: openTickets,
          resolved_tickets: resolvedTickets,
          resolved_by_ai: resolvedByAi,
          avg_satisfaction: avgSatisfaction,
          first_contact: firstContact,
          last_contact: lastContact,
        },
        tickets: allTickets,
        products: Array.from(productSet),
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
