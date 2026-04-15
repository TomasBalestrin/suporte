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
    const { question, product_id, category_id, customer, conversation_id: clientConvId } = body

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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: true,
        data: { answer: null, requires_ticket: true },
      })
    }

    const supabase = createAdminClient()

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
    const fallbackMessage = configMap.fallback_message ||
      'Nao encontrei uma resposta para sua duvida. Vou encaminhar para um atendente.'

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // ─── Memória de conversa ───
    let conversationId: string | null = clientConvId || null
    let priorMessages: Array<{ role: 'user' | 'assistant' | 'tool'; content: string; tool_name?: string | null }> = []

    if (!conversationId && customer && (customer.cpf || customer.email || customer.telefone)) {
      const orClauses = [
        customer.cpf ? `customer_cpf.eq.${String(customer.cpf).replace(/\D/g, '')}` : null,
        customer.email ? `customer_email.eq.${String(customer.email).toLowerCase()}` : null,
        customer.telefone ? `customer_telefone.eq.${String(customer.telefone)}` : null,
      ].filter(Boolean).join(',')

      if (orClauses) {
        const { data: existing } = await supabase
          .from('ai_conversations')
          .select('id')
          .or(orClauses)
          .gte('updated_at', new Date(Date.now() - 2 * 3600 * 1000).toISOString())
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existing) conversationId = existing.id
      }
    }

    if (!conversationId && customer) {
      try {
        const { data: created } = await supabase
          .from('ai_conversations')
          .insert({
            customer_email: customer.email || null,
            customer_cpf: customer.cpf ? String(customer.cpf).replace(/\D/g, '') : null,
            customer_telefone: customer.telefone || null,
            product_id: product_id || null,
            category_id: category_id || null,
          })
          .select('id')
          .single()
        if (created) conversationId = created.id
      } catch {
        // Tabela pode não existir ainda — não bloqueia o fluxo
      }
    }

    if (conversationId) {
      try {
        const { data: msgs } = await supabase
          .from('ai_conversation_messages')
          .select('role, content, tool_name')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(20)
        if (msgs) priorMessages = msgs as any[]
      } catch {}
    }

    // ─── Consultar Fluxon ───
    let fluxonContext: string | null = null
    let fluxonData: any = null
    if (customer && (customer.cpf || customer.email || customer.telefone) && process.env.FLUXON_SUPPORT_API_KEY && process.env.FLUXON_BASE_URL) {
      try {
        const params = new URLSearchParams()
        if (customer.cpf) params.set('cpf', String(customer.cpf))
        if (customer.email) params.set('email', String(customer.email))
        if (customer.telefone) params.set('telefone', String(customer.telefone))

        const flRes = await fetch(`${process.env.FLUXON_BASE_URL}/api/support/lead?${params.toString()}`, {
          headers: { 'X-API-Key': process.env.FLUXON_SUPPORT_API_KEY },
          signal: AbortSignal.timeout(8000),
        })
        if (flRes.ok) {
          fluxonData = await flRes.json()
          const parts: string[] = [fluxonData.diagnostico_resumido || '']
          if (Array.isArray(fluxonData.compras) && fluxonData.compras.length > 0) {
            parts.push(`\nHistorico de compras (${fluxonData.compras.length}):`)
            for (const c of fluxonData.compras) {
              parts.push(`- ${c.produto} (${c.plataforma}, ha ${c.dias_desde_compra} dia(s)) | WhatsApp: ${c.whatsapp_entrega?.delivery_status || 'sem status'} | Link: ${c.link_acesso || '(sem link)'} | Login: ${c.login_instrucao || '(sem instrucao)'}`)
            }
          }
          fluxonContext = parts.filter(Boolean).join('\n')
        }
      } catch (err) {
        console.error('[ai/chat] Falha ao consultar Fluxon:', err)
      }
    }

    let enrichedQuestion = question
    if (product_id) {
      const { data: product } = await supabase.from('products').select('name').eq('id', product_id).single()
      if (product) enrichedQuestion = `[Produto: ${product.name}] ${enrichedQuestion}`
    }
    if (category_id) {
      const { data: category } = await supabase.from('categories').select('name').eq('id', category_id).single()
      if (category) enrichedQuestion = `[Categoria: ${category.name}] ${enrichedQuestion}`
    }

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

    const articlesArr = articles || []
    const bestSimilarity = articles?.[0]
      ? (articles[0] as { similarity?: number }).similarity || 0
      : 0

    if (articlesArr.length === 0 && !fluxonContext) {
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
          conversation_id: conversationId,
        },
      })
    }

    const context = articlesArr
      .map((a: { title: string; content: string; similarity?: number }) =>
        `## ${a.title} (relevancia: ${((a.similarity || 0) * 100).toFixed(0)}%)\n${a.content}`
      )
      .join('\n\n') || '(sem artigos relevantes)'

    // ─── Prompts ───
    const toneInstrucao = '\n\nTOM DE VOZ: Portugues brasileiro formal. Cumprimento cordial no inicio ("Ola, tudo bem? Abencoado dia!"). Assinatura final "Atenciosamente, Time Bethel Educacao". Seja objetiva.'

    const fluxonInstrucao = fluxonContext
      ? '\n\nDADOS DO CLIENTE (FLUXON): Voce tem dados reais de compra, entrega e status do cliente. Priorize esses dados sobre a base de conhecimento em perguntas sobre acesso, login, link, entrega, reembolso ou status de compra. Se o cliente ja tem link e login, forneca direto. Se nao encontrou compra no Fluxon e o cliente afirma ter comprado, use a tool solicitar_mais_dados.'
      : '\n\nATENCAO: Nenhum dado do Fluxon disponivel (cliente ainda nao identificado). Se a pergunta for sobre compra/acesso/entrega, use a tool solicitar_mais_dados para obter nome completo, email e CPF.'

    const toolsInstrucao = `\n\nFERRAMENTAS:
- reenviar_whatsapp_entrega: quando cliente nao recebeu o WhatsApp de entrega ou quer reenvio. Requer dados do Fluxon.
- orientar_reembolso: quando cliente solicita reembolso. <=7 dias direciona plataforma, >7 explica fora do prazo.
- solicitar_mais_dados: quando nao conseguiu identificar o cliente ou precisa de info adicional.

Use tools apenas quando fizer sentido. Perguntas genericas cobertas pela KB = responda direto.`

    const fullSystemPrompt = `Voce se chama ${aiName}. ${systemPrompt}\n\nIMPORTANTE: Responda com base nas informacoes fornecidas. Nunca invente.${toneInstrucao}${fluxonInstrucao}${toolsInstrucao}`

    const userContent = [
      fluxonContext ? `Dados do cliente (Fluxon):\n${fluxonContext}` : null,
      `Artigos da base de conhecimento:\n${context}`,
      `Pergunta atual do cliente: ${question}`,
    ].filter(Boolean).join('\n\n')

    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'reenviar_whatsapp_entrega',
          description: 'Reenvia o WhatsApp com link de acesso da ultima compra do cliente. Use quando cliente disser que nao recebeu ou perdeu o link/senha/email de acesso e voce ja tem dados do Fluxon.',
          parameters: {
            type: 'object',
            properties: {
              motivo: { type: 'string', description: 'Breve motivo do reenvio' },
            },
            required: ['motivo'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'orientar_reembolso',
          description: 'Retorna instrucoes formais de reembolso conforme plataforma e prazo. Use sempre que cliente solicitar reembolso.',
          parameters: {
            type: 'object',
            properties: {
              plataforma: { type: 'string', enum: ['hotmart', 'pagtrust', 'desconhecida'] },
              dias_desde_compra: { type: 'number', description: 'Dias desde a compra. -1 se desconhecido.' },
            },
            required: ['plataforma', 'dias_desde_compra'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'solicitar_mais_dados',
          description: 'Use quando nao conseguir identificar o cliente ou precisar de info adicional.',
          parameters: {
            type: 'object',
            properties: {
              motivo: { type: 'string', description: 'Por que precisa dos dados' },
            },
            required: ['motivo'],
          },
        },
      },
    ]

    const messages: any[] = [{ role: 'system', content: fullSystemPrompt }]
    for (const m of priorMessages) {
      if (m.role === 'tool') continue
      messages.push({ role: m.role, content: m.content })
    }
    messages.push({ role: 'user', content: userContent })

    // ─── Loop de tool calling (max 3 iteracoes) ───
    let finalAnswer: string | null = null
    const toolCallsExecuted: Array<{ name: string; args: any; result: any }> = []

    for (let iter = 0; iter < 3; iter++) {
      const res = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature,
        max_tokens: maxTokens,
        messages,
        tools,
        tool_choice: 'auto',
      })

      const msg = res.choices[0]?.message
      if (!msg) break

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push(msg)
        for (const tc of msg.tool_calls) {
          if (tc.type !== 'function') continue
          const fn = (tc as any).function
          const name = fn.name
          let args: any = {}
          try { args = JSON.parse(fn.arguments || '{}') } catch {}

          const toolResult = await executarTool(name, args, { customer, fluxonData })
          toolCallsExecuted.push({ name, args, result: toolResult })

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult),
          })
        }
        continue
      }

      finalAnswer = msg.content || null
      break
    }

    const answer = finalAnswer || fallbackMessage

    // ─── Persistir conversa ───
    if (conversationId) {
      const toInsert: any[] = [
        { conversation_id: conversationId, role: 'user', content: question },
      ]
      for (const tc of toolCallsExecuted) {
        toInsert.push({
          conversation_id: conversationId,
          role: 'tool',
          content: JSON.stringify(tc.result),
          tool_name: tc.name,
          tool_args: tc.args,
          tool_result: tc.result,
        })
      }
      toInsert.push({ conversation_id: conversationId, role: 'assistant', content: answer })

      try {
        await supabase.from('ai_conversation_messages').insert(toInsert)
        await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
      } catch {}
    }

    if (bestSimilarity < threshold + 0.1 && articlesArr.length > 0) {
      await supabase.from('ai_unanswered_questions').insert({
        question,
        similarity_score: bestSimilarity,
        context: `Melhor artigo: ${(articlesArr[0] as { title: string }).title}`,
      })
    }

    const now = new Date().toISOString()
    try {
      await Promise.all(
        articlesArr.map((article: { id: string }) =>
          supabase.rpc('increment_usage_count', { article_id: article.id, used_at: now })
            .then(() => {}, () => {
              return supabase.from('knowledge_base').update({ last_used_at: now }).eq('id', article.id)
            })
        )
      )
    } catch {}

    try {
      await supabase.from('ai_usage_stats').insert({
        query: question,
        response: answer,
        articles_found: articlesArr.length,
        confidence_score: bestSimilarity,
        was_helpful: null,
      })
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        answer,
        requires_ticket: false,
        articles_used: articlesArr.length,
        confidence: Math.round(bestSimilarity * 100),
        ai_name: aiName,
        conversation_id: conversationId,
        tools_used: toolCallsExecuted.map(t => t.name),
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

async function executarTool(
  name: string,
  args: any,
  ctx: { customer: any; fluxonData: any }
): Promise<any> {
  try {
    if (name === 'reenviar_whatsapp_entrega') {
      if (!process.env.FLUXON_BASE_URL || !process.env.FLUXON_SUPPORT_API_KEY) {
        return { ok: false, error: 'Integracao Fluxon nao configurada' }
      }
      const body: any = {}
      if (ctx.customer?.cpf) body.cpf = ctx.customer.cpf
      if (ctx.customer?.email) body.email = ctx.customer.email
      if (ctx.customer?.telefone) body.telefone = ctx.customer.telefone

      const res = await fetch(`${process.env.FLUXON_BASE_URL}/api/support/reenviar-entrega`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.FLUXON_SUPPORT_API_KEY,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Falha no reenvio', motivo: args.motivo }
      return { ok: true, produto: data.produto, telefone_mascarado: data.telefone_mascarado, motivo: args.motivo }
    }

    if (name === 'orientar_reembolso') {
      const plataforma = args.plataforma || 'desconhecida'
      const dias = typeof args.dias_desde_compra === 'number' ? args.dias_desde_compra : -1

      if (dias > 7) {
        return {
          ok: true,
          fora_do_prazo: true,
          instrucao: 'Compra feita ha mais de 7 dias — fora do prazo de garantia. Orientar cliente que nao e mais possivel solicitar reembolso automatico e sugerir contato humano se houver motivo especial.',
        }
      }

      if (plataforma === 'hotmart') {
        return {
          ok: true, fora_do_prazo: false, plataforma: 'Hotmart',
          link_reembolso: 'https://help.hotmart.com/pt-br/article/360061973392/como-solicitar-o-reembolso-da-minha-compra',
          prazo: '7 dias apos a data da compra',
          instrucao: 'Direcionar cliente para a plataforma Hotmart para solicitar reembolso. Estorno: ate 7 dias uteis.',
        }
      }
      if (plataforma === 'pagtrust') {
        return {
          ok: true, fora_do_prazo: false, plataforma: 'PagTrust',
          link_reembolso: 'https://dashboard.pagtrust.com.br/reembolso.html',
          prazo: '7 dias apos a data da compra',
          instrucao: 'Direcionar cliente para PagTrust para solicitar reembolso. Estorno: ate 7 dias uteis.',
        }
      }

      return {
        ok: true, fora_do_prazo: false, plataforma: 'desconhecida',
        instrucao: 'Plataforma nao identificada. Explicar politica geral (7 dias, solicitar diretamente na plataforma da compra).',
        links: {
          hotmart: 'https://help.hotmart.com/pt-br/article/360061973392/como-solicitar-o-reembolso-da-minha-compra',
          pagtrust: 'https://dashboard.pagtrust.com.br/reembolso.html',
        },
      }
    }

    if (name === 'solicitar_mais_dados') {
      return {
        ok: true,
        motivo: args.motivo,
        mensagem_sugerida: 'Por gentileza, poderia enviar o nome completo, e-mail de compra e CPF? Assim consigo localizar sua compra e te ajudar com mais precisao.',
      }
    }

    return { ok: false, error: `Tool desconhecida: ${name}` }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro ao executar tool' }
  }
}
