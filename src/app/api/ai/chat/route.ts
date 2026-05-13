import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// ─── TOOL HELPERS ───
async function consultar_fluxon(cpf?: string, email?: string, telefone?: string) {
  if (!process.env.FLUXON_SUPPORT_API_KEY || !process.env.FLUXON_BASE_URL) return "Erro: Integracao Fluxon nao configurada."
  if (!cpf && !email && !telefone) return "Erro: Informe pelo menos um dado (cpf, email ou telefone)."
  
  const params = new URLSearchParams()
  if (cpf) params.set('cpf', cpf)
  if (email) params.set('email', email)
  if (telefone) params.set('telefone', telefone)

  try {
    const flRes = await fetch(`${process.env.FLUXON_BASE_URL}/api/support/lead?${params.toString()}`, {
      headers: { 'X-API-Key': process.env.FLUXON_SUPPORT_API_KEY },
      signal: AbortSignal.timeout(8000),
    })
    if (!flRes.ok) return `Erro na API do Fluxon: ${flRes.statusText}`
    const fl = await flRes.json()
    return JSON.stringify(fl)
  } catch (err) {
    return `Erro ao consultar Fluxon: ${err instanceof Error ? err.message : String(err)}`
  }
}

async function consultar_wordpress(email: string) {
  if (!process.env.FLUXON_SUPPORT_API_KEY || !process.env.FLUXON_BASE_URL) return "Erro: Integracao Fluxon nao configurada."
  try {
    const wpRes = await fetch(`${process.env.FLUXON_BASE_URL}/api/support/wordpress/consultar-acesso`, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.FLUXON_SUPPORT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(15000),
    })
    if (!wpRes.ok) return `Erro na API do WP: ${wpRes.statusText}`
    const wp = await wpRes.json()
    return JSON.stringify(wp)
  } catch (err) {
    return `Erro ao consultar WordPress: ${err instanceof Error ? err.message : String(err)}`
  }
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'consultar_fluxon',
      description: 'Busca o perfil 360 do cliente no Fluxon (compras, status de entrega do WhatsApp, link de acesso, carrinho abandonado). Use sempre que precisar saber o que o cliente comprou, se o link de acesso foi enviado ou para pegar instrucoes de login.',
      parameters: {
        type: 'object',
        properties: {
          cpf: { type: 'string', description: 'Apenas numeros' },
          email: { type: 'string' },
          telefone: { type: 'string', description: 'Telefone do cliente com DDD' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'consultar_wordpress',
      description: 'Verifica se o cliente tem conta nas areas de membros (Tutor LMS) e gera uma senha temporaria/lembrete de acesso. Use se o cliente disser que perdeu a senha ou o acesso ao portal.',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Email do cliente' }
        },
        required: ['email']
      }
    }
  }
]

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
    const { question, messages, product_id, category_id, customer } = body

    const lastMessageContent = messages && messages.length > 0
      ? messages[messages.length - 1].content
      : question

    if (!lastMessageContent || typeof lastMessageContent !== 'string' || lastMessageContent.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pergunta nao pode ser vazia' },
        { status: 400 }
      )
    }

    if (lastMessageContent.trim().length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Pergunta muito longa (maximo 2000 caracteres)' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: true,
        data: { answer: null, requires_ticket: true },
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

    if (configMap.ai_enabled === 'false') {
      return NextResponse.json({
        success: true,
        data: { answer: null, requires_ticket: true, ai_name: configMap.ai_name || 'Sofia' },
      })
    }

    const threshold = parseFloat(configMap.confidence_threshold || '0.7')
    const systemPrompt = configMap.system_prompt || 'Voce e uma assistente de suporte.'
    const temperature = parseFloat(configMap.temperature || '0.3')
    const maxTokens = parseInt(configMap.max_tokens || '500', 10)
    const aiName = configMap.ai_name || 'Sofia'
    const fallbackMessage = configMap.fallback_message || 'Nao encontrei uma resposta para sua duvida. Vou encaminhar para um atendente.'

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Build enriched question for RAG search
    let enrichedQuestion = lastMessageContent
    let formProductName: string | null = null
    let formCategoryName: string | null = null

    if (product_id) {
      const { data: product } = await supabase.from('products').select('name').eq('id', product_id).single()
      if (product) {
        formProductName = product.name
        enrichedQuestion = `[Produto: ${product.name}] ${enrichedQuestion}`
      }
    }
    if (category_id) {
      const { data: category } = await supabase.from('categories').select('name').eq('id', category_id).single()
      if (category) {
        formCategoryName = category.name
        enrichedQuestion = `[Categoria: ${category.name}] ${enrichedQuestion}`
      }
    }

    // Embeddings & KB Search
    const embeddingRes = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: enrichedQuestion,
    })
    const embedding = embeddingRes.data[0].embedding

    const { data: articles } = await supabase.rpc('search_knowledge_base', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 5,
    })

    const bestSimilarity = articles?.[0] ? (articles[0] as any).similarity || 0 : 0
    const articlesArr = articles || []
    
    const contextStr = articlesArr
      .map((a: any) => `## ${a.title} (relevancia: ${((a.similarity || 0) * 100).toFixed(0)}%)\n${a.content}`)
      .join('\n\n') || '(sem artigos relevantes)'

    // Build System Prompt
    const customerInfo = `Email: ${customer?.email || 'N/A'}, CPF: ${customer?.cpf || 'N/A'}, Telefone: ${customer?.telefone || 'N/A'}`
    const toolsInstrucao = `\n\n[FERRAMENTAS]\nVoce possui ferramentas (tools) para consultar dados em tempo real no Fluxon e WordPress. O cliente atual informou os dados: ${customerInfo}. USE as ferramentas caso o cliente pergunte sobre compras, links de acesso, envios de WhatsApp ou reclamacao de senha. NUNCA diga que nao localizou a compra sem antes usar a ferramenta 'consultar_fluxon'.`
    const fullSystemPrompt = `Voce se chama ${aiName}. ${systemPrompt}\n\n[BASE DE CONHECIMENTO]\nAbaixo estao artigos relevantes da base de conhecimento (use como guia):\n${contextStr}${toolsInstrucao}`

    // Mapear historico
    const openaiMessages: any[] = [ { role: 'system', content: fullSystemPrompt } ]
    
    if (messages && Array.isArray(messages) && messages.length > 0) {
      for (let i = 0; i < messages.length - 1; i++) {
        const m = messages[i]
        openaiMessages.push({
          role: m.role === 'ai' || m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })
      }
    }

    const formContextParts: string[] = []
    if (formProductName) formContextParts.push(`produto "${formProductName}"`)
    if (formCategoryName) formContextParts.push(`categoria "${formCategoryName}"`)
    const formContextLine = formContextParts.length > 0
      ? `(Contexto invisivel: cliente selecionou ${formContextParts.join(' e ')})`
      : ''

    openaiMessages.push({ role: 'user', content: `${formContextLine}\n\n${lastMessageContent}`.trim() })

    // LLM Loop para Tool Calling
    let answer = fallbackMessage
    let iterations = 0
    let requiresTicket = false

    while (iterations < 3) {
      const chatRes = await openai.chat.completions.create({
        model: typeof process !== "undefined" && process.env.OPENAI_MODEL ? process.env.OPENAI_MODEL : 'gpt-4o-mini',
        temperature,
        max_tokens: maxTokens,
        messages: openaiMessages,
        tools: TOOLS as any,
        tool_choice: 'auto'
      })

      const msg = chatRes.choices[0]?.message
      if (!msg) break

      openaiMessages.push(msg)

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls as any[]) {
          if (tc.type === 'function' && tc.function.name === 'consultar_fluxon') {
            const args = JSON.parse(tc.function.arguments || '{}')
            const resStr = await consultar_fluxon(args.cpf, args.email, args.telefone)
            openaiMessages.push({ role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: resStr })
          } else if (tc.type === 'function' && tc.function.name === 'consultar_wordpress') {
            const args = JSON.parse(tc.function.arguments || '{}')
            const resStr = await consultar_wordpress(args.email)
            openaiMessages.push({ role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: resStr })
          }
        }
        iterations++
      } else {
        answer = msg.content || fallbackMessage
        break
      }
    }

    if ((!articles || articles.length === 0) && iterations === 0) {
       // Se nao achou artigo na base e nem chamou ferramenta, provavelmente nao sabe responder bem
       requiresTicket = true
       await supabase.from('ai_unanswered_questions').insert({
        question: lastMessageContent,
        similarity_score: 0,
        context: product_id || category_id ? `Produto: ${product_id || '-'}, Categoria: ${category_id || '-'}` : null,
      })
    }

    if (bestSimilarity < threshold + 0.1 && iterations === 0) {
      await supabase.from('ai_unanswered_questions').insert({
        question: lastMessageContent,
        similarity_score: bestSimilarity,
        context: articlesArr[0] ? `Melhor artigo: ${(articlesArr[0] as any).title}` : null,
      })
    }

    const now = new Date().toISOString()
    try {
      await Promise.all(
        articlesArr.map((article: any) =>
          supabase.rpc('increment_usage_count', { article_id: article.id, used_at: now }).then(() => {}, () => {
            return supabase.from('knowledge_base').update({ last_used_at: now }).eq('id', article.id)
          })
        )
      )
    } catch {}

    try {
      await supabase.from('ai_usage_stats').insert({
        query: lastMessageContent,
        response: answer,
        articles_found: articlesArr.length,
        confidence_score: bestSimilarity,
      })
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        answer,
        requires_ticket: requiresTicket,
        articles_used: articlesArr.length,
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
