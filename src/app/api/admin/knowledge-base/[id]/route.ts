import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin, isAgentOrAdmin } from '@/lib/supabase/guards'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }
    if (!(await isAgentOrAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('knowledge_base')
      .select('*, product:products(name)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Artigo nao encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar artigo' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Apenas admins podem editar artigos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const admin = createAdminClient()

    const { knowledgeBaseSchema } = await import('@/lib/utils/validation')
    const parsed = knowledgeBaseSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Dados invalidos' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title.trim()
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content.trim()
    if (parsed.data.category !== undefined) updateData.category = parsed.data.category?.trim() || null
    if (body.product_id !== undefined) updateData.product_id = body.product_id || null
    if (parsed.data.is_active !== undefined) updateData.is_active = parsed.data.is_active

    // Regenerate embedding if title or content changed
    if ((body.title || body.content) && process.env.OPENAI_API_KEY) {
      try {
        // Get current article for full text
        const { data: current } = await admin
          .from('knowledge_base')
          .select('title, content')
          .eq('id', id)
          .single()

        const title = body.title?.trim() || current?.title || ''
        const content = body.content?.trim() || current?.content || ''

        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const embeddingRes = await openai.embeddings.create({
          model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
          input: `${title}\n\n${content}`,
        })
        updateData.embedding = embeddingRes.data[0].embedding
      } catch (e) {
        console.error('Failed to regenerate embedding:', e)
      }
    }

    const { data, error } = await admin
      .from('knowledge_base')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar artigo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Apenas admins podem excluir artigos' }, { status: 403 })
    }

    const { id } = await params
    const admin = createAdminClient()

    const { error } = await admin
      .from('knowledge_base')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir artigo' },
      { status: 500 }
    )
  }
}
