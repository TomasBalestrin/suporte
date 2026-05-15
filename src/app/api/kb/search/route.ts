import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * Fatia 2 — endpoint público server-to-server pra Sofia do Fluxon (e outros
 * consumidores futuros) consultar a knowledge base unificada.
 *
 * Pattern de auth: mesma do `/api/support/*` (X-API-Key validado contra env).
 *
 * Body:
 *   { question: string, top_k?: number (default 5), threshold?: number (default ai_config.confidence_threshold) }
 *
 * Response:
 *   { success: true, articles: [{ slug, title, content, category, similarity }] }
 *
 * Falha gracioso: caller (Fluxon Sofia) deve cair pra prompt puro se 5xx ou timeout.
 */

const DEFAULT_TOP_K = 5
const MAX_TOP_K = 10
const REQUEST_TIMEOUT_MS = 15_000

export async function POST(request: NextRequest) {
  // Auth — server-to-server via X-API-Key.
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.KB_PUBLIC_API_KEY) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
  }

  // Rate limit por IP (mesmo caller pode mandar burst).
  const ip = getClientIp(request)
  const { allowed } = rateLimit(`kb-search:${ip}`, { limit: 120, windowSeconds: 60 })
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'rate limit exceeded' }, { status: 429 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ success: false, error: 'openai not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const question = String(body?.question ?? '').trim()
    if (!question) {
      return NextResponse.json({ success: false, error: 'question is required' }, { status: 400 })
    }
    const topK = Math.min(Math.max(1, Number(body?.top_k) || DEFAULT_TOP_K), MAX_TOP_K)

    const admin = createAdminClient()

    // Threshold do ai_config (mesma chave que chat/route.ts usa).
    let threshold = 0.7
    if (typeof body?.threshold === 'number') {
      threshold = body.threshold
    } else {
      const { data: thresholdCfg } = await admin
        .from('ai_config')
        .select('config_value')
        .eq('config_key', 'confidence_threshold')
        .maybeSingle()
      if (thresholdCfg?.config_value) {
        const parsed = parseFloat(thresholdCfg.config_value)
        if (!isNaN(parsed)) threshold = parsed
      }
    }

    // D-P3 — singleton OpenAI. Timeout aplicado ao request, não ao client.
    const { getOpenAIClient } = await import('@/lib/openai-client')
    const openai = await getOpenAIClient()
    const embRes = await openai.embeddings.create(
      {
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        input: question,
      },
      { timeout: REQUEST_TIMEOUT_MS },
    )
    const queryEmbedding = embRes.data[0]?.embedding
    if (!queryEmbedding || queryEmbedding.length !== 1536) {
      return NextResponse.json({ success: false, error: 'embedding generation failed' }, { status: 500 })
    }

    // RPC search_knowledge_base (mesma usada por chat/route.ts).
    const { data: articles, error: rpcError } = await admin.rpc('search_knowledge_base', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: topK,
    })

    if (rpcError) {
      console.error('[kb-search] rpc error:', rpcError)
      return NextResponse.json({ success: false, error: 'kb search failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      articles: articles || [],
      meta: {
        question_length: question.length,
        threshold,
        top_k: topK,
        embedding_model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      },
    })
  } catch (error: any) {
    console.error('[kb-search] error:', error)
    return NextResponse.json(
      { success: false, error: 'erro no kb search', detail: error?.message },
      { status: 500 },
    )
  }
}
