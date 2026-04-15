import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Carrega .env.vercel
const envPath = path.resolve(process.cwd(), '.env.vercel')
const content = fs.readFileSync(envPath, 'utf8')
for (const line of content.split('\n')) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(url, key)

async function main() {
  // 1. Achar ticket do John
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, description, product_id, category_id, customer_id, customers(name, email, phone, cpf)')
    .order('created_at', { ascending: false })
    .limit(100)

  const johnTicket = (tickets || []).find((t: any) => t.customers?.email === 'johnalmeida38@gmail.com')
  if (!johnTicket) {
    console.log('Ticket do John nao encontrado nos ultimos 100')
    return
  }
  console.log('Ticket:', johnTicket.id, 'product_id:', johnTicket.product_id)
  const customer = johnTicket.customers as any

  // 2. Listar mensagens do ticket
  const { data: msgs } = await supabase
    .from('messages')
    .select('id, sender_type, content, created_at')
    .eq('ticket_id', johnTicket.id)
    .order('created_at', { ascending: true })

  console.log('\nMensagens:')
  for (const m of (msgs || [])) {
    console.log(`  [${m.sender_type}] ${m.content.slice(0, 80)}...`)
  }

  const lastAI = (msgs || []).slice().reverse().find((m: any) => m.sender_type === 'ai')
  const firstCust = (msgs || []).find((m: any) => m.sender_type === 'customer')

  if (!lastAI) {
    console.log('\nSem mensagem da IA pra corrigir')
    return
  }

  // 3. Chamar Sofia v2 com dados reais do ticket
  const question = firstCust?.content || johnTicket.description
  console.log('\nPergunta original:', question?.slice(0, 100))

  const chatRes = await fetch('https://suporte-amber.vercel.app/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      product_id: johnTicket.product_id,
      category_id: johnTicket.category_id,
      customer: {
        email: customer.email,
        cpf: customer.cpf,
        telefone: customer.phone,
      },
    }),
  })
  const chatData = await chatRes.json()
  if (!chatData.success) {
    console.log('Falha chat:', chatData.error)
    return
  }

  const novaResposta = chatData.data.answer
  console.log('\nNova resposta (gerada):')
  console.log(novaResposta)

  // 4. Apagar antiga + inserir nova
  const { error: delErr } = await supabase.from('messages').delete().eq('id', lastAI.id)
  if (delErr) { console.log('Erro delete:', delErr.message); return }

  const { data: novaMsg, error: insErr } = await supabase
    .from('messages')
    .insert({
      ticket_id: johnTicket.id,
      sender_type: 'ai',
      content: novaResposta,
    })
    .select()
    .single()

  if (insErr) { console.log('Erro insert:', insErr.message); return }

  console.log('\n✓ Corrigido! Msg antiga apagada:', lastAI.id, '→ Msg nova:', novaMsg.id)
}

main().catch(err => { console.error(err); process.exit(1) })
