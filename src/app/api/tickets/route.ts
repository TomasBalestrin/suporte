import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { createTicket } from '@/lib/tickets/create'
import { z } from 'zod'

const createTicketSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  cpf: z.string().min(1),
  phone: z.string().optional(),
  product_id: z.string().min(1),
  category_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(20),
  conversation_id: z.string().uuid().optional(),
  ai_messages: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
        confidence: z.number().optional(),
      })
    )
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`tickets:${ip}`, { limit: 5, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisicoes. Aguarde um momento.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = createTicketSchema.safeParse(body)

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      console.error('Ticket validation failed:', fieldErrors)
      return NextResponse.json(
        { success: false, error: `Dados invalidos: ${fieldErrors}` },
        { status: 400 }
      )
    }

    const { name, email, cpf, phone, product_id, category_id, title, description, conversation_id, ai_messages } = parsed.data

    const ticket = await createTicket(
      { name, email, cpf, phone, product_id, category_id, title, description, messages: ai_messages },
      { conversationId: conversation_id, source: 'portal' }
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          ticket_code: ticket.ticket_code,
          access_token: ticket.access_token,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar ticket' },
      { status: 500 }
    )
  }
}
