import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`ticket-lookup:${ip}`, { limit: 30, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisicoes. Aguarde um momento.' },
        { status: 429 }
      )
    }

    const supabase = createAdminClient()
    const { token } = await params

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        id, ticket_code, title, description, status, priority,
        created_at, updated_at, resolved_at,
        satisfaction_rating, satisfaction_comment, satisfaction_rated_at,
        customer:customers(name, email),
        product:products(id, name),
        category:categories(id, name)
      `)
      .eq('access_token', token)
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
