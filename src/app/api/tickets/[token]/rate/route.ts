import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { token } = await params
    const body = await request.json()

    const { rating, comment } = body
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Avaliacao deve ser entre 1 e 5' },
        { status: 400 }
      )
    }

    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('access_token', token)
      .single()

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket nao encontrado' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('tickets')
      .update({
        satisfaction_rating: rating,
        satisfaction_comment: comment || null,
        satisfaction_rated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar avaliacao' },
      { status: 500 }
    )
  }
}
