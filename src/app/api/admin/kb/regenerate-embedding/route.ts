import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * F5 — endpoint chamado pelo trigger pg_net (migration 016) quando um artigo
 * é inserido/atualizado manualmente sem embedding.
 *
 * Pipeline (vault Obsidian → GitHub Action) sempre escreve embedding direto,
 * então o trigger faz no-op nesse caso. Este endpoint só é exercitado em:
 * - operador editando artigo direto no Supabase Studio
 * - admin Web (futuro) que insere artigo sem embedding pré-calculado
 *
 * Auth: Bearer token via ai_config.kb_embedding_webhook_token.
 * Não é fim-a-fim do user — é call interna do banco para o servidor.
 */
export async function POST(request: NextRequest) {
  const admin = createAdminClient()

  // Validate internal token (ai_config.kb_embedding_webhook_token)
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Auth missing' }, { status: 401 })
  }
  const providedToken = auth.slice('Bearer '.length)

  const { data: tokenCfg } = await admin
    .from('ai_config')
    .select('config_value')
    .eq('config_key', 'kb_embedding_webhook_token')
    .maybeSingle()

  if (!tokenCfg?.config_value || tokenCfg.config_value !== providedToken) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 403 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ success: false, error: 'OPENAI_API_KEY missing' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const articleId = body?.article_id
    if (!articleId) {
      return NextResponse.json({ success: false, error: 'article_id missing' }, { status: 400 })
    }

    const { data: article } = await admin
      .from('knowledge_base')
      .select('id, title, content')
      .eq('id', articleId)
      .maybeSingle()

    if (!article) {
      return NextResponse.json({ success: false, error: 'article not found' }, { status: 404 })
    }

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const embRes = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: `${article.title}\n\n${article.content}`,
    })

    const embedding = embRes.data[0]?.embedding
    if (!embedding || embedding.length !== 1536) {
      return NextResponse.json({ success: false, error: 'invalid embedding' }, { status: 500 })
    }

    await admin
      .from('knowledge_base')
      .update({
        embedding,
        embedding_model: 'text-embedding-3-small',
        updated_at: new Date().toISOString(),
      })
      .eq('id', articleId)

    console.log(`[regenerate-embedding] article ${articleId} updated`)
    return NextResponse.json({ success: true, article_id: articleId })
  } catch (error) {
    console.error('[regenerate-embedding] error:', error)
    return NextResponse.json({ success: false, error: 'erro na regeneracao' }, { status: 500 })
  }
}
