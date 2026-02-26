import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { aiFeedbackSchema } from '@/lib/utils/validation'

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
    const parsed = aiFeedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Dados invalidos' },
        { status: 400 }
      )
    }

    const { usage_stat_id, was_helpful } = parsed.data

    const supabase = createAdminClient()

    // Update the stat by ID
    await supabase
      .from('ai_usage_stats')
      .update({ was_helpful })
      .eq('id', usage_stat_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('AI feedback error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao registrar feedback' },
      { status: 500 }
    )
  }
}
