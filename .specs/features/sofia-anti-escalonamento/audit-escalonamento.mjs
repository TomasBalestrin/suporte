// Audit read-only: classifica os escalonamentos POS-fix (legitimo vs recaida).
// O monitor agregado deu 33% (>30% alerta), mas o regex e cego. Aqui leio caso a caso.
// Rodar: node .specs/features/sofia-anti-escalonamento/audit-escalonamento.mjs

import fs from 'fs'

const FIX_TS = '2026-06-07T22:25:31.579974+00:00'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const url = get('NEXT_PUBLIC_SUPABASE_URL')
const key = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: key, Authorization: 'Bearer ' + key }

const ESCALA = /abrir um ticket|abrir ticket|encaminh|vou conectar|nossa equipe|atendente|verificar (sua compra|manualmente|a compra)|comprovante/i
const TROUBLE = /esqueci minha senha|qual (mensagem|erro)|que erro|redefin|spam|n[aã]o (carrega|abre)|p[aá]gina/i
// gatilhos de escalacao IMEDIATA legitima (mantidos de proposito na decisao de produto)
const LEGIT = /reembolso|estorno|fraude|golpe|process[ao]|advogad|juridic|cancel|chargeback/i
// pedido EXPLICITO de humano (no texto do CLIENTE) -> escalar e o certo
const PEDE_HUMANO = /atendimento humano|falar com (humano|atendente|pessoa|algu[eé]m|gente)|quero (humano|atendente)|com uma pessoa/i
// Sofia escala o que ela NAO RESOLVE -> tambem legitimo pela decisao de produto:
//  (a) info que ela nao tem (billing/vitalicio) (b) entrega/fulfillment (comprou e nao liberou)
const NAO_RESOLVE = /n[aã]o tenho (essa|a|info)|n[aã]o sei (essa|informar)|n[aã]o consigo confirmar|n[aã]o foi liberad|n[aã]o liberou|bloquead|n[aã]o recebi|n[aã]o veio|n[aã]o chegou|continua sem acesso/i
// resposta que JA deu o link de acesso (quillforms/area de membros) nao e escalonamento
const DEU_LINK = /quillforms|juliaacademy|cleitonquerobin\.com\.br\/|senha.{0,20}ottoni123|link de acesso/i

// pos-fix assistant messages
const r = await fetch(`${url}/rest/v1/ai_conversation_messages?role=eq.assistant&created_at=gt.${encodeURIComponent(FIX_TS)}&select=id,conversation_id,created_at,content,confidence&order=created_at.asc&limit=2000`, { headers: H })
const all = await r.json()

const escalas = all.filter(m => ESCALA.test(String(m.content || '')))
console.log(`POS-fix: ${all.length} respostas assistant | ${escalas.length} casaram ESCALA (${Math.round(escalas.length/all.length*100)}%)`)
console.log('')

// pra cada escalonamento, puxa a conversa inteira pra ver se houve troubleshooting ANTES
const convIds = [...new Set(escalas.map(m => m.conversation_id))]
const threads = {}
for (const cid of convIds) {
  const tr = await fetch(`${url}/rest/v1/ai_conversation_messages?conversation_id=eq.${cid}&select=role,created_at,content&order=created_at.asc&limit=200`, { headers: H })
  threads[cid] = await tr.json()
}

let legit = 0, comTrouble = 0, prematuro = 0, naoResolve = 0, humano = 0, deuLink = 0
const prematuros = []
for (const m of escalas) {
  const thread = threads[m.conversation_id] || []
  const idx = thread.findIndex(x => x.content === m.content && x.created_at === m.created_at)
  const antes = thread.slice(0, idx) // tudo que veio antes desta resposta
  const assistantsAntes = antes.filter(x => x.role === 'assistant')
  const userAntes = antes.filter(x => x.role === 'user').concat(antes.filter(x => x.role === 'user')) // texto do cliente no thread
  const txtCliente = antes.filter(x => x.role === 'user').map(x => String(x.content||'')).join(' | ')
  const houveTrouble = thread.slice(0, idx + 1).some(x => x.role === 'assistant' && TROUBLE.test(String(x.content || '')))
  const ehLegit = LEGIT.test(String(m.content || '')) || antes.some(x => LEGIT.test(String(x.content || '')))
  const pediuHumano = PEDE_HUMANO.test(txtCliente)
  const naoResolveCase = NAO_RESOLVE.test(String(m.content||'')) || NAO_RESOLVE.test(txtCliente)
  const deuLinkCase = DEU_LINK.test(String(m.content||''))
  const turnos = assistantsAntes.length // quantas respostas a Sofia ja deu antes desta

  let tag
  if (deuLinkCase) { tag = 'NAO-E-ESCALA(deu link de acesso)'; deuLink++ }
  else if (pediuHumano) { tag = 'OK(cliente pediu humano)'; humano++ }
  else if (ehLegit) { tag = 'LEGIT(reembolso/fraude/etc)'; legit++ }
  else if (naoResolveCase) { tag = 'OK(entrega/info que ela nao resolve)'; naoResolve++ }
  else if (houveTrouble || turnos >= 2) { tag = 'OK(troubleshootou/repetiu)'; comTrouble++ }
  else { tag = '🔴 PREMATURO(escalou cedo)'; prematuro++; prematuros.push({ m, thread, idx }) }

  console.log(`[${tag}] ${m.created_at.slice(0,16)} conf=${m.confidence ?? '-'} turno#${turnos+1} conv=${m.conversation_id.slice(0,8)}`)
}

console.log('')
console.log(`RESUMO POS-fix (${escalas.length} matches ESCALA de ${all.length} respostas):`)
console.log(`  nao-e-escala(deu link)=${deuLink}  cliente-pediu-humano=${humano}  legit(reembolso/etc)=${legit}  nao-resolve(entrega/info)=${naoResolve}  troubleshootou/repetiu=${comTrouble}  🔴 prematuro=${prematuro}`)
console.log(`Taxa de escalonamento PREMATURO real = ${Math.round(prematuro/all.length*100)}% (de ${all.length} respostas)`)
console.log('')

// dump dos prematuros pra leitura humana
console.log('=== DETALHE DOS PREMATUROS (a recaida real, se houver) ===')
for (const p of prematuros.slice(0, 12)) {
  console.log('\n--- conv', p.m.conversation_id.slice(0,8), p.m.created_at.slice(0,16), '---')
  const ctx = p.thread.slice(Math.max(0, p.idx - 2), p.idx + 1)
  for (const x of ctx) {
    console.log(`  [${x.role}] ${String(x.content||'').replace(/\s+/g,' ').slice(0, 280)}`)
  }
}
