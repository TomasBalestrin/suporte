import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question } = body

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pergunta nao pode ser vazia' },
        { status: 400 }
      )
    }

    // If OpenAI is not configured, return fallback
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          answer: null,
          requires_ticket: true,
        },
      })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const supabase = createAdminClient()

    // Get AI config
    const { data: configs } = await supabase
      .from('ai_config')
      .select('config_key, config_value')

    const configMap: Record<string, string> = {}
    configs?.forEach((c) => {
      configMap[c.config_key] = c.config_value
    })

    const threshold = parseFloat(configMap.confidence_threshold || '0.7')
    const systemPrompt = configMap.system_prompt || 'Voce e uma assistente de suporte.'
    const temperature = parseFloat(configMap.temperature || '0.3')
    const maxTokens = parseInt(configMap.max_tokens || '500', 10)
    const fallbackMessage = configMap.fallback_message ||
      'Nao encontrei uma resposta para sua duvida.'

    // Generate embedding for the question
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    })
    const embedding = embeddingRes.data[0].embedding

    // Search knowledge base
    const { data: articles } = await supabase.rpc('search_knowledge_base', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 5,
    })

    if (!articles || articles.length === 0) {
      // No relevant articles found
      await supabase.from('ai_unanswered_questions').insert({
        question,
        similarity_score: 0,
      })

      return NextResponse.json({
        success: true,
        data: {
          answer: fallbackMessage,
          requires_ticket: true,
        },
      })
    }

    // Build context from articles
    const context = articles
      .map((a: { title: string; content: string }) => `## ${a.title}\n${a.content}`)
      .join('\n\n')

    // Call GPT-4o Mini
    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Contexto dos artigos:\n${context}\n\nPergunta do cliente: ${question}\n\nResponda com base no contexto fornecido.`,
        },
      ],
    })

    const answer = chatRes.choices[0]?.message?.content || fallbackMessage

    // Update usage count for used articles
    for (const article of articles) {
      await supabase
        .from('knowledge_base')
        .update({
          usage_count: (article as { usage_count?: number }).usage_count
            ? (article as { usage_count: number }).usage_count + 1
            : 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', (article as { id: string }).id)
    }

    return NextResponse.json({
      success: true,
      data: {
        answer,
        requires_ticket: false,
        articles_used: articles.length,
      },
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao consultar IA' },
      { status: 500 }
    )
  }
}
