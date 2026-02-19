import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, helpful } = body

    if (!query || typeof helpful !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Dados invalidos' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Update the most recent stat matching this query
    const { data: stat } = await supabase
      .from('ai_usage_stats')
      .select('id')
      .eq('query', query)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (stat) {
      await supabase
        .from('ai_usage_stats')
        .update({ was_helpful: helpful })
        .eq('id', stat.id)
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
