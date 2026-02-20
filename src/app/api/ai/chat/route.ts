import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`ai-chat:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisicoes. Aguarde um momento.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { question, product_id, category_id } = body

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pergunta nao pode ser vazia' },
        { status: 400 }
      )
    }

    if (question.trim().length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Pergunta muito longa (maximo 2000 caracteres)' },
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

    const supabase = createAdminClient()

    // Get AI config
    const { data: configs } = await supabase
      .from('ai_config')
      .select('config_key, config_value')

    const configMap: Record<string, string> = {}
    configs?.forEach((c) => {
      configMap[c.config_key] = c.config_value
    })

    // Check if AI is enabled
    if (configMap.ai_enabled === 'false') {
      return NextResponse.json({
        success: true,
        data: {
          answer: null,
          requires_ticket: true,
          ai_name: configMap.ai_name || 'Sofia',
        },
      })
    }

    const threshold = parseFloat(configMap.confidence_threshold || '0.7')
    const systemPrompt = configMap.system_prompt || 'Voce e uma assistente de suporte.'
    const temperature = parseFloat(configMap.temperature || '0.3')
    const maxTokens = parseInt(configMap.max_tokens || '500', 10)
    const aiName = configMap.ai_name || 'Sofia'
    const fallbackMessage = configMap.fallback_message ||
      'Nao encontrei uma resposta para sua duvida. Vou encaminhar para um atendente.'

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Build enriched question with product/category context
    let enrichedQuestion = question
    if (product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', product_id)
        .single()
      if (product) enrichedQuestion = `[Produto: ${product.name}] ${enrichedQuestion}`
    }
    if (category_id) {
      const { data: category } = await supabase
        .from('categories')
        .select('name')
        .eq('id', category_id)
        .single()
      if (category) enrichedQuestion = `[Categoria: ${category.name}] ${enrichedQuestion}`
    }

    // Generate embedding for the question
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: enrichedQuestion,
    })
    const embedding = embeddingRes.data[0].embedding

    // Search knowledge base
    const { data: articles } = await supabase.rpc('search_knowledge_base', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 5,
    })

    // Calculate best similarity score
    const bestSimilarity = articles?.[0]
      ? (articles[0] as { similarity?: number }).similarity || 0
      : 0

    if (!articles || articles.length === 0) {
      // No relevant articles found — log unanswered
      await supabase.from('ai_unanswered_questions').insert({
        question,
        similarity_score: 0,
        context: product_id || category_id
          ? `Produto: ${product_id || '-'}, Categoria: ${category_id || '-'}`
          : null,
      })

      return NextResponse.json({
        success: true,
        data: {
          answer: fallbackMessage,
          requires_ticket: true,
          confidence: 0,
          ai_name: aiName,
        },
      })
    }

    // Build context from articles
    const context = articles
      .map((a: { title: string; content: string; similarity?: number }) =>
        `## ${a.title} (relevancia: ${((a.similarity || 0) * 100).toFixed(0)}%)\n${a.content}`
      )
      .join('\n\n')

    // Enhanced system prompt with AI name
    const fullSystemPrompt = `Voce se chama ${aiName}. ${systemPrompt}\n\nIMPORTANTE: Responda APENAS com base nas informacoes fornecidas no contexto. Se o contexto nao cobrir completamente a pergunta, informe ao cliente que nao tem certeza e sugira abrir um ticket. Nunca invente informacoes.`

    // Call GPT-4o Mini
    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        {
          role: 'user',
          content: `Contexto dos artigos da base de conhecimento:\n${context}\n\nPergunta do cliente: ${question}\n\nResponda de forma clara e objetiva com base no contexto.`,
        },
      ],
    })

    const answer = chatRes.choices[0]?.message?.content || fallbackMessage

    // Low confidence — also log as potentially unanswered
    if (bestSimilarity < threshold + 0.1) {
      await supabase.from('ai_unanswered_questions').insert({
        question,
        similarity_score: bestSimilarity,
        context: `Melhor artigo: ${(articles[0] as { title: string }).title}`,
      })
    }

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

    // Update ai_usage_stats (non-blocking)
    try {
      await supabase.from('ai_usage_stats').insert({
        query: question,
        response: answer,
        articles_found: articles.length,
        confidence_score: bestSimilarity,
        was_helpful: null,
      })
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      data: {
        answer,
        requires_ticket: false,
        articles_used: articles.length,
        confidence: Math.round(bestSimilarity * 100),
        ai_name: aiName,
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
