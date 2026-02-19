import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const admin = createAdminClient()

    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.content !== undefined) updateData.content = body.content.trim()
    if (body.category !== undefined) updateData.category = body.category?.trim() || null
    if (body.product_id !== undefined) updateData.product_id = body.product_id || null
    if (body.is_active !== undefined) updateData.is_active = body.is_active

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
          model: 'text-embedding-3-small',
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
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
