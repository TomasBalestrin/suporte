import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const feedbackSchema = z.object({
  conversation_id: z.string().uuid(),
  helpful: z.boolean(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`ai-feedback:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisicoes. Aguarde um momento.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = feedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Dados invalidos' },
        { status: 400 }
      )
    }

    const { conversation_id, helpful } = parsed.data
    const supabase = createAdminClient()

    // Find the most recent assistant message in this conversation and update was_helpful
    const { data: msg } = await supabase
      .from('ai_conversation_messages')
      .select('id')
      .eq('conversation_id', conversation_id)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (msg) {
      await supabase
        .from('ai_conversation_messages')
        .update({ was_helpful: helpful })
        .eq('id', msg.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('AI feedback error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao registrar feedback' },
      { status: 500 }
    )
  }
}
