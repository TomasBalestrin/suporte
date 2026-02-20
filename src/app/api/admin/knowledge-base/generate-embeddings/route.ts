import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/supabase/guards'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Apenas admins podem gerar embeddings' }, { status: 403 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY nao configurada' },
        { status: 500 }
      )
    }

    const admin = createAdminClient()

    // Find articles without embeddings
    const { data: articles, error: fetchError } = await admin
      .from('knowledge_base')
      .select('id, title, content')
      .is('embedding', null)
      .eq('is_active', true)

    if (fetchError) throw fetchError

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todos os artigos ja possuem embeddings',
        updated: 0,
      })
    }

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    let updated = 0
    const errors: string[] = []

    for (const article of articles) {
      try {
        const embeddingRes = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: `${article.title}\n\n${article.content}`,
        })
        const embedding = embeddingRes.data[0].embedding

        const { error: updateError } = await admin
          .from('knowledge_base')
          .update({ embedding })
          .eq('id', article.id)

        if (updateError) {
          errors.push(`Erro ao atualizar artigo "${article.title}": ${updateError.message}`)
        } else {
          updated++
        }
      } catch (e) {
        errors.push(`Erro ao gerar embedding para "${article.title}": ${(e as Error).message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Embeddings gerados com sucesso`,
      total: articles.length,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Generate embeddings error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar embeddings' },
      { status: 500 }
    )
  }
}
