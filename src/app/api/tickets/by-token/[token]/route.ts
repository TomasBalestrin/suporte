import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { token } = await params

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        product:products(*),
        category:categories(*)
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
