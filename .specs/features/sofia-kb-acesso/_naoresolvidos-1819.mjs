// Conversas da Sofia 18-19/06 — quais NÃO resolveram + por quê. Read-only, PII mascarada.
import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const url = get('NEXT_PUBLIC_SUPABASE_URL'), key = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: key, Authorization: 'Bearer ' + key }
const SINCE = '2026-06-18T00:00:00Z'
const mask = s => String(s || '').replace(/[\w.+-]+@[\w.-]+\.\w+/g, '<email>').replace(/\b\d[\d .()\-]{8,}\d\b/g, '<tel>').replace(/\s+/g, ' ').trim()

async function pull(table, qs) {
  let out = []
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${url}/rest/v1/${table}?${qs}&limit=1000&offset=${off}`, { headers: H })
    const j = await r.json(); if (!Array.isArray(j)) { console.error('ERRO', table, JSON.stringify(j).slice(0, 200)); process.exit(1) }
    out = out.concat(j); if (j.length < 1000) break
  }
  return out
}

const msgs = await pull('ai_conversation_messages', `created_at=gte.${SINCE}&select=conversation_id,role,content,tool_name,confidence,was_helpful,fluxon_identificacao,created_at&order=created_at.asc`)
const convs = await pull('ai_conversations', `created_at=gte.${SINCE}&select=id,created_at,product_id,category_id,ticket_id,whatsapp_conversa_id`)
const prods = await pull('products', 'select=id,name'); const cats = await pull('categories', 'select=id,name')
const pN = id => (prods.find(p => p.id === id) || {}).name || '(sem produto)'
const cN = id => (cats.find(c => c.id === id) || {}).name || '(sem cat)'

const byConv = {}
for (const m of msgs) (byConv[m.conversation_id] ||= []).push(m)

const rows = []
for (const c of convs) {
  const ms = byConv[c.id] || []
  const users = ms.filter(m => m.role === 'user')
  const asst = ms.filter(m => m.role === 'assistant')
  const tools = ms.filter(m => m.role === 'tool').map(m => m.tool_name)
  if (!users.length && !asst.length) continue
  const lastA = asst[asst.length - 1] || {}
  const votes = asst.filter(m => m.was_helpful != null)
  const down = votes.some(m => m.was_helpful === false)
  const up = votes.length && votes.every(m => m.was_helpful === true)
  const conf = lastA.confidence ?? null
  const escalou = tools.includes('escalar_para_humano') || c.ticket_id != null
  // heurística de NÃO-RESOLVIDO
  let status = 'ok?'
  if (down) status = 'NAO (thumbs-down)'
  else if (escalou) status = 'ESCALOU (ticket)'
  else if (conf != null && conf < 60) status = 'NAO (conf baixa)'
  else if (users.length >= 3) status = 'NAO (cliente voltou)'
  else if (up) status = 'OK (thumbs-up)'
  rows.push({ c, ms, users, asst, tools, conf, status, escalou, down })
}

const nao = rows.filter(r => /^NAO|^ESCALOU/.test(r.status))
console.log(`Janela desde ${SINCE} | conversas: ${rows.length} | NÃO-resolvidas/escaladas: ${nao.length}`)
console.log('Distribuição:', JSON.stringify(rows.reduce((a, r) => { a[r.status.split(' ')[0]] = (a[r.status.split(' ')[0]] || 0) + 1; return a }, {})))
console.log('\n================ NÃO-RESOLVIDAS / ESCALADAS (detalhe) ================')
for (const r of nao) {
  const { c } = r
  console.log(`\n— conv ${c.id.slice(0, 8)} | ${c.created_at.slice(5, 16)} | ${pN(c.product_id)} / ${cN(c.category_id)} | ${r.status} | conf=${r.conf ?? '-'} | tools=[${r.tools.join(',') || '-'}] | wpp=${c.whatsapp_conversa_id ? 'sim' : 'nao'}`)
  for (const m of r.ms) {
    if (m.role === 'tool') { console.log(`   [tool ${m.tool_name}] ${mask(m.content).slice(0, 90)}`); continue }
    const tag = m.role === 'user' ? 'CLIENTE' : 'SOFIA'
    console.log(`   ${tag}${m.role === 'assistant' && m.confidence != null ? '(c' + m.confidence + ')' : ''}: ${mask(m.content).slice(0, 240)}`)
  }
}
