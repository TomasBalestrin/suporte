import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { code } = await params
    const email = request.nextUrl.searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email obrigatorio para verificacao' },
        { status: 400 }
      )
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        access_token,
        ticket_code,
        customer:customers!inner(email)
      `)
      .eq('ticket_code', code)
      .single()

    if (error || !ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket nao encontrado' },
        { status: 404 }
      )
    }

    // Verify email (same error message to prevent email enumeration)
    const customer = ticket.customer as unknown as { email: string }
    if (customer.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Ticket nao encontrado ou e-mail nao confere' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { access_token: ticket.access_token },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar ticket' },
      { status: 500 }
    )
  }
}
