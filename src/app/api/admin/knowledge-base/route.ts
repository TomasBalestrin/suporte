import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { escapeIlike, isAdmin, isAgentOrAdmin } from '@/lib/supabase/guards'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }
    if (!(await isAgentOrAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const url = request.nextUrl
    const search = url.searchParams.get('search') || ''
    const category = url.searchParams.get('category') || ''
    const productId = url.searchParams.get('product_id') || ''
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    const admin = createAdminClient()
    let query = admin
      .from('knowledge_base')
      .select('*, product:products(name)', { count: 'exact' })

    if (search) {
      const escaped = escapeIlike(search)
      query = query.or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar artigos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Apenas admins podem criar artigos' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.title?.trim() || !body.content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Titulo e conteudo sao obrigatorios' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Generate embedding if OpenAI is configured
    let embedding: number[] | null = null
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const embeddingRes = await openai.embeddings.create({
          model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
          input: `${body.title}\n\n${body.content}`,
        })
        embedding = embeddingRes.data[0].embedding
      } catch (e) {
        console.error('Failed to generate embedding:', e)
      }
    }

    const { data, error } = await admin
      .from('knowledge_base')
      .insert({
        title: body.title.trim(),
        content: body.content.trim(),
        category: body.category?.trim() || null,
        product_id: body.product_id || null,
        embedding,
        is_active: body.is_active !== false,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao criar artigo' },
      { status: 500 }
    )
  }
}
