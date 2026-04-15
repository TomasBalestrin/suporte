import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAgentOrAdmin } from '@/lib/supabase/guards'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Varre tickets abertos (status em aberto/em_andamento) que tenham mensagem da IA
 * e re-executa Sofia v2. Se a nova resposta diferir, apaga a antiga e posta a corrigida.
 *
 * Query params:
 *   ?limit=20 — quantos tickets processar (default 20, max 50)
 *   ?dry_run=1 — apenas simula, não altera mensagens
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    if (!(await isAgentOrAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const sp = request.nextUrl.searchParams
    const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 50)
    const dryRun = sp.get('dry_run') === '1'

    const admin = createAdminClient()

    // Pega tickets em aberto/em_andamento que tenham mensagem de AI.
    const { data: candidatos } = await admin
      .from('tickets')
      .select('id, ticket_code, status, product_id, category_id, description, customer_id, customers(email, phone, cpf), messages!inner(sender_type)')
      .in('status', ['open', 'in_progress'])
      .eq('messages.sender_type', 'ai')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!candidatos || candidatos.length === 0) {
      return NextResponse.json({ success: true, processados: 0, alterados: 0, detalhes: [] })
    }

    // Dedup (pode vir com joins repetidos)
    const uniq = Array.from(new Map(candidatos.map(c => [c.id, c])).values())

    const detalhes: any[] = []
    let alterados = 0

    for (const t of uniq) {
      const customer = t.customers as any
      if (!customer) { detalhes.push({ ticket_code: t.ticket_code, skip: 'sem cliente' }); continue }

      // Lê mensagens do ticket
      const { data: msgs } = await admin
        .from('messages')
        .select('id, sender_type, content, created_at')
        .eq('ticket_id', t.id)
        .order('created_at', { ascending: true })

      const lastAI = (msgs || []).slice().reverse().find(m => m.sender_type === 'ai')
      const firstCust = (msgs || []).find(m => m.sender_type === 'customer')
      const question = firstCust?.content || t.description

      if (!lastAI || !question) {
        detalhes.push({ ticket_code: t.ticket_code, skip: !lastAI ? 'sem msg IA' : 'sem pergunta' })
        continue
      }

      // Chama /api/ai/chat
      const origin = request.nextUrl.origin
      const chatRes = await fetch(`${origin}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          product_id: t.product_id,
          category_id: t.category_id,
          customer: {
            email: customer.email,
            cpf: customer.cpf,
            telefone: customer.phone,
          },
        }),
      })

      const chatData = await chatRes.json()
      if (!chatData.success || !chatData.data?.answer) {
        detalhes.push({ ticket_code: t.ticket_code, skip: 'chat falhou', err: chatData.error })
        continue
      }

      const nova = (chatData.data.answer as string).trim()
      const antiga = (lastAI.content as string).trim()

      if (nova === antiga) {
        detalhes.push({ ticket_code: t.ticket_code, status: 'identica' })
        continue
      }

      if (dryRun) {
        detalhes.push({ ticket_code: t.ticket_code, status: 'difere (dry_run)', tools: chatData.data.tools_used })
        alterados++
        continue
      }

      await admin.from('messages').delete().eq('id', lastAI.id)
      const { data: novaMsg } = await admin
        .from('messages')
        .insert({ ticket_id: t.id, sender_type: 'ai', content: nova })
        .select('id')
        .single()

      detalhes.push({
        ticket_code: t.ticket_code,
        status: 'corrigido',
        removido_id: lastAI.id,
        nova_id: novaMsg?.id,
        tools: chatData.data.tools_used,
      })
      alterados++
    }

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      processados: uniq.length,
      alterados,
      detalhes,
    })
  } catch (error: any) {
    console.error('[sofia-corrigir-lote]', error)
    return NextResponse.json(
      { success: false, error: 'Erro no lote', detail: error?.message },
      { status: 500 }
    )
  }
}
