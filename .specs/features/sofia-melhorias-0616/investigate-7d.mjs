// Investigacao read-only das conversas da Sofia nos ultimos 7 dias.
// Objetivo: achar ONDE a Sofia falha pra aplicar melhorias. PII mascarada.
// Rodar: node .specs/features/sofia-melhorias-0616/investigate-7d.mjs

import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const url = get('NEXT_PUBLIC_SUPABASE_URL'), key = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: key, Authorization: 'Bearer ' + key }
const SINCE = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

const mask = s => String(s || '')
  .replace(/[\w.+-]+@[\w.-]+\.\w+/g, '@')
  .replace(/\b\d[\d .()\-]{8,}\d\b/g, '#')
  .replace(/\s+/g, ' ').trim()

async function pull(table, qs) {
  let out = []
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${url}/rest/v1/${table}?${qs}&limit=1000&offset=${off}`, { headers: H })
    const j = await r.json()
    if (!Array.isArray(j)) { console.error('ERRO', table, JSON.stringify(j).slice(0, 200)); process.exit(1) }
    out = out.concat(j); if (j.length < 1000) break
  }
  return out
}

const msgs = await pull('ai_conversation_messages', `created_at=gte.${encodeURIComponent(SINCE)}&select=id,conversation_id,role,content,tool_name,confidence,was_helpful,fluxon_identificacao,fluxon_tem_link,created_at&order=created_at.asc`)
const convs = await pull('ai_conversations', `created_at=gte.${encodeURIComponent(SINCE)}&select=id,created_at,product_id,category_id,ticket_id,whatsapp_conversa_id`)
const prods = await pull('products', 'select=id,name')
const cats = await pull('categories', 'select=id,name')
const pName = id => (prods.find(p => p.id === id) || {}).name || '(?)'
const cName = id => (cats.find(c => c.id === id) || {}).name || '(?)'

const asst = msgs.filter(m => m.role === 'assistant')
const users = msgs.filter(m => m.role === 'user')
const tools = msgs.filter(m => m.role === 'tool')
console.log('=== INVESTIGACAO SOFIA — ultimos 7 dias ===')
console.log('Janela desde:', SINCE.slice(0, 16), '| agora:', new Date().toISOString().slice(0, 16))
console.log(`Conversas: ${convs.length} | mensagens: ${msgs.length} (user ${users.length} / assistant ${asst.length} / tool ${tools.length})`)

// 1) volume por dia
const byDay = {}
for (const m of asst) { const d = m.created_at.slice(0, 10); byDay[d] = (byDay[d] || 0) + 1 }
console.log('\n[1] Respostas/dia:', Object.entries(byDay).map(([d, n]) => `${d.slice(5)}=${n}`).join(' '))

// 2) confidence
const withConf = asst.filter(m => m.confidence != null)
const band = { 'conf=0': 0, '1-39': 0, '40-59': 0, '60-79': 0, '80+': 0 }
for (const m of withConf) { const c = m.confidence; if (c === 0) band['conf=0']++; else if (c < 40) band['1-39']++; else if (c < 60) band['40-59']++; else if (c < 80) band['60-79']++; else band['80+']++ }
const avg = withConf.length ? Math.round(withConf.reduce((s, m) => s + m.confidence, 0) / withConf.length) : 0
console.log(`\n[2] Confidence (n=${withConf.length}, avg=${avg}):`, JSON.stringify(band))

// 3) feedback
const fb = asst.filter(m => m.was_helpful != null)
const up = fb.filter(m => m.was_helpful).length, down = fb.length - up
console.log(`\n[3] Feedback: ${fb.length} votos | up ${up} / down ${down}` + (fb.length ? ` (thumbs-down ${Math.round(down / fb.length * 100)}%)` : ''))

// 4) tools
const tcount = {}
for (const t of tools) tcount[t.tool_name || '(null)'] = (tcount[t.tool_name || '(null)'] || 0) + 1
console.log('\n[4] Tool calls:', JSON.stringify(tcount))

// 5) pre-fetch fluxon
const idc = {}
for (const m of asst) { const k = String(m.fluxon_identificacao); idc[k] = (idc[k] || 0) + 1 }
console.log('\n[5] fluxon_identificacao (nas respostas):', JSON.stringify(idc))

// 6) veneno
const ven = { quiz_arq: 0, sete_dias: 0, atenciosamente: 0, abencoad: 0, teste_gratis: 0, quillforms_NN: 0 }
for (const m of asst) { const c = String(m.content || '')
  if (/quiz\.testedosarquetipos/i.test(c)) ven.quiz_arq++
  if (/7 dias/i.test(c)) ven.sete_dias++
  if (/atenciosamente/i.test(c)) ven.atenciosamente++
  if (/aben[çc]oa/i.test(c)) ven.abencoad++
  if (/teste gr[aá]tis|teste gratuito/i.test(c)) ven.teste_gratis++
  if (/quillforms\/[a-z-]+-\d+/i.test(c)) ven.quillforms_NN++
}
console.log('\n[6] Veneno (esperado ~0):', JSON.stringify(ven))

// 7) under-call do Fix B: answer sugere escala MAS sem tool escalar_para_humano na conversa
const ESCALA = /encaminh|abrir (um )?ticket|nossa equipe|atendente|chamado|falar com (a equipe|um humano)/i
const convTools = {}
for (const t of tools) { (convTools[t.conversation_id] ||= new Set()).add(t.tool_name) }
const convTicket = {}; for (const c of convs) convTicket[c.id] = c.ticket_id
let sugereEscala = 0, escalouTool = 0, gap = 0
for (const m of asst) {
  if (!ESCALA.test(String(m.content || ''))) continue
  sugereEscala++
  const hasTool = convTools[m.conversation_id]?.has('escalar_para_humano')
  if (hasTool) escalouTool++; else if (!convTicket[m.conversation_id]) gap++
}
console.log(`\n[7] Under-call (Fix B): respostas que sugerem escala=${sugereEscala} | com tool escalar_para_humano=${escalouTool} | SEM tool e SEM ticket (gap)=${gap}`)

// 8) KB gap: perguntas que cairam em confidence baixo (<40), amostradas
const firstUserByConv = {}
for (const m of users) { if (!firstUserByConv[m.conversation_id]) firstUserByConv[m.conversation_id] = m.content }
const lowConf = asst.filter(m => m.confidence != null && m.confidence < 40)
const lowQs = [...new Set(lowConf.map(m => firstUserByConv[m.conversation_id]).filter(Boolean))]
console.log(`\n[8] KB GAP — ${lowConf.length} respostas conf<40. Amostra de perguntas (1a msg do cliente, ${Math.min(20, lowQs.length)} de ${lowQs.length}):`)
for (const q of lowQs.slice(0, 20)) console.log('   -', mask(q).slice(0, 120))

// 9) thumbs-down: pergunta + resposta
console.log(`\n[9] THUMBS-DOWN (${down}) — pergunta -> resposta:`)
for (const m of fb.filter(x => !x.was_helpful).slice(0, 12)) {
  console.log(`   Q: ${mask(firstUserByConv[m.conversation_id]).slice(0, 90)}`)
  console.log(`   A: ${mask(m.content).slice(0, 120)} [conf=${m.confidence ?? '-'}]`)
}

// 10) conversas repetidas / longas (cliente voltando)
const turnsByConv = {}
for (const m of users) turnsByConv[m.conversation_id] = (turnsByConv[m.conversation_id] || 0) + 1
const longConvs = Object.entries(turnsByConv).filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1])
console.log(`\n[10] Conversas com >=4 turnos do cliente (sinal de nao-resolucao): ${longConvs.length}`)
for (const [cid, n] of longConvs.slice(0, 8)) console.log(`   conv ${cid.slice(0, 8)} = ${n} turnos | 1a: ${mask(firstUserByConv[cid]).slice(0, 80)}`)

// 11) produto/categoria do volume
const byProd = {}, byCat = {}
for (const c of convs) { byProd[pName(c.product_id)] = (byProd[pName(c.product_id)] || 0) + 1; byCat[cName(c.category_id)] = (byCat[cName(c.category_id)] || 0) + 1 }
console.log('\n[11] Por produto:', JSON.stringify(byProd))
console.log('[11] Por categoria:', JSON.stringify(byCat))

// 12) respostas curtas (fallback/erro silencioso)
const short = asst.filter(m => String(m.content || '').length < 50)
console.log(`\n[12] Respostas <50 chars (poss. fallback): ${short.length}`)
for (const m of short.slice(0, 6)) console.log('   -', mask(m.content).slice(0, 80))
