import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const myTicketsSchema = z.object({
  email: z.string().email(),
  cpf: z.string().min(11),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`my-tickets:${ip}`, { limit: 10, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisições. Aguarde um momento.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = myTicketsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    const { email, cpf } = parsed.data
    const cleanCpf = cpf.replace(/\D/g, '')

    const supabase = createAdminClient()

    // Find all customers with this email
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, email, cpf')
      .ilike('email', email)

    // Match by CPF (stored with or without formatting)
    const customer = customers?.find((c) => {
      if (!c.cpf) return false
      return c.cpf.replace(/\D/g, '') === cleanCpf
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Dados não conferem. Verifique seu e-mail e CPF.' },
        { status: 404 }
      )
    }

    // Fetch all tickets for this customer
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        id,
        ticket_code,
        title,
        description,
        status,
        priority,
        access_token,
        created_at,
        updated_at,
        resolved_at,
        satisfaction_rating,
        product:products(id, name),
        category:categories(id, name)
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar tickets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        customer: { name: customer.name, email: customer.email },
        tickets: tickets || [],
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
