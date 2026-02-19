import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: true,
        data: { suggestion: null, message: 'OpenAI nao configurada' },
      })
    }

    const body = await request.json()
    const { ticket_description, messages, customer_question } = body

    if (!customer_question?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Pergunta do cliente obrigatoria' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Get AI config
    const { data: configs } = await admin
      .from('ai_config')
      .select('config_key, config_value')

    const configMap: Record<string, string> = {}
    configs?.forEach((c) => {
      configMap[c.config_key] = c.config_value
    })

    // Generate embedding and search knowledge base
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: customer_question,
    })

    const { data: articles } = await admin.rpc('search_knowledge_base', {
      query_embedding: embeddingRes.data[0].embedding,
      match_threshold: 0.5,
      match_count: 3,
    })

    const context = articles?.length
      ? articles
          .map((a: { title: string; content: string }) => `## ${a.title}\n${a.content}`)
          .join('\n\n')
      : 'Nenhum artigo relevante encontrado na base de conhecimento.'

    // Build conversation context
    const conversationHistory = messages?.length
      ? messages
          .slice(-6)
          .map((m: { sender_type: string; content: string }) =>
            `${m.sender_type === 'customer' ? 'Cliente' : m.sender_type === 'agent' ? 'Agente' : 'IA'}: ${m.content}`
          )
          .join('\n')
      : ''

    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: `Voce e um co-piloto para agentes de suporte. Sugira uma resposta profissional e util para o agente enviar ao cliente. Use o contexto da base de conhecimento quando disponivel. Seja direto e objetivo. Responda APENAS com o texto da sugestao, sem prefixos como "Sugestao:" ou "Resposta:".`,
        },
        {
          role: 'user',
          content: `Base de conhecimento:\n${context}\n\n${ticket_description ? `Descricao do ticket: ${ticket_description}\n\n` : ''}${conversationHistory ? `Historico da conversa:\n${conversationHistory}\n\n` : ''}Ultima mensagem do cliente: ${customer_question}\n\nSugira uma resposta para o agente enviar:`,
        },
      ],
    })

    const suggestion = chatRes.choices[0]?.message?.content || null

    return NextResponse.json({
      success: true,
      data: {
        suggestion,
        articles_count: articles?.length || 0,
      },
    })
  } catch (error) {
    console.error('AI suggest error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar sugestao' },
      { status: 500 }
    )
  }
}
