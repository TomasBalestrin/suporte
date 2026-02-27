import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`rate:${ip}`, { limit: 10, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisições. Aguarde um momento.' },
        { status: 429 }
      )
    }

    const supabase = createAdminClient()
    const { token } = await params
    const body = await request.json()

    const rating = Number(body.rating)
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Avaliacao deve ser um numero inteiro entre 1 e 5' },
        { status: 400 }
      )
    }

    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, satisfaction_rating')
      .eq('access_token', token)
      .single()

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket nao encontrado' },
        { status: 404 }
      )
    }

    if (ticket.satisfaction_rating) {
      return NextResponse.json(
        { success: false, error: 'Ticket ja foi avaliado' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('tickets')
      .update({
        satisfaction_rating: rating,
        satisfaction_comment: body.comment?.trim() || null,
        satisfaction_rated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id)

    if (error) throw error

    // Log activity
    await supabase.from('activity_log').insert({
      ticket_id: ticket.id,
      actor_type: 'customer',
      action: 'ticket_rated',
      details: { rating, comment: body.comment?.trim() || null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar avaliacao' },
      { status: 500 }
    )
  }
}
