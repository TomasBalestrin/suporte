import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAgentOrAdmin } from '@/lib/supabase/guards'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Re-executa Sofia v2 sobre o ticket e, se gerar resposta diferente da
 * ultima mensagem da IA, apaga a antiga e posta a nova.
 * Util para corrigir tickets respondidos antes da v2 / com mismatch de produto.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    if (!(await isAgentOrAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const { id: ticketId } = await params
    const admin = createAdminClient()

    const { data: ticket } = await admin
      .from('tickets')
      .select('id, description, product_id, category_id, customer_id, customers(name, email, phone, cpf)')
      .eq('id', ticketId)
      .single()

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket nao encontrado' }, { status: 404 })
    }

    const customer = ticket.customers as any
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Ticket sem cliente associado' }, { status: 400 })
    }

    const { data: messages } = await admin
      .from('messages')
      .select('id, sender_type, content, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    const lastAIMsg = (messages || []).slice().reverse().find(m => m.sender_type === 'ai')
    const firstCustomerMsg = (messages || []).find(m => m.sender_type === 'customer')
    const question = firstCustomerMsg?.content || ticket.description

    if (!question) {
      return NextResponse.json({ success: false, error: 'Ticket sem pergunta identificavel' }, { status: 400 })
    }

    // Chamar /api/ai/chat internamente reutiliza TODA a logica (Fluxon + KB + tools + mismatch)
    const origin = request.nextUrl.origin
    const chatRes = await fetch(`${origin}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        product_id: ticket.product_id,
        category_id: ticket.category_id,
        customer: {
          email: customer.email,
          cpf: customer.cpf,
          telefone: customer.phone,
        },
        notify_telegram: false, // correção do admin, não é interação de cliente
      }),
    })

    const chatData = await chatRes.json()
    if (!chatData.success || !chatData.data?.answer) {
      return NextResponse.json({
        success: false,
        error: 'Sofia nao gerou resposta',
        detail: chatData.error,
      }, { status: 502 })
    }

    const novaResposta = chatData.data.answer as string
    const respostaAntiga = lastAIMsg?.content || ''

    if (novaResposta.trim() === respostaAntiga.trim()) {
      return NextResponse.json({
        success: true,
        alterado: false,
        mensagem: 'Resposta da Sofia identica a anterior. Nada a corrigir.',
      })
    }

    // Apagar a ultima mensagem da IA (se existir) e postar a nova corrigida
    if (lastAIMsg) {
      await admin.from('messages').delete().eq('id', lastAIMsg.id)
    }

    const { data: novaMsg, error: insertErr } = await admin
      .from('messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'ai',
        content: novaResposta,
      })
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({
        success: false,
        error: 'Falha ao inserir nova mensagem',
        detail: insertErr.message,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      alterado: true,
      removido_id: lastAIMsg?.id || null,
      nova_mensagem_id: novaMsg.id,
      resposta_antiga: respostaAntiga.slice(0, 300),
      resposta_nova: novaResposta.slice(0, 500),
      tools_usadas: chatData.data.tools_used || [],
    })
  } catch (error: any) {
    console.error('[sofia-corrigir]', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao corrigir ticket', detail: error?.message },
      { status: 500 }
    )
  }
}
