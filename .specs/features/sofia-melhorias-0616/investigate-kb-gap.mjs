// Research read-only — KB gap analysis + veneno timestamps + RAG config.
// Rodar: & "C:\Users\lluys\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe" investigate-kb-gap.mjs
// (cwd = .specs/features/sofia-melhorias-0616)

import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const SUPA_URL = get('NEXT_PUBLIC_SUPABASE_URL'), SUPA_KEY = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' }

async function q(table, qs = '') {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}&limit=200`, { headers: H })
  const j = await r.json()
  if (!Array.isArray(j) && !j?.id) { console.error('ERRO', table, JSON.stringify(j).slice(0, 300)); return [] }
  return Array.isArray(j) ? j : [j]
}

// ─── 1. KB atual ───────────────────────────────────────────────────────────
const kb = await q('knowledge_base', 'select=id,title,category,is_active,embedding&order=category.asc,title.asc')
console.log('\n=== 1. KNOWLEDGE BASE ATUAL ===')
console.log(`Total: ${kb.length} artigos`)
const nullEmb = kb.filter(a => a.embedding === null)
console.log(`Embedding NULL: ${nullEmb.length}`)
for (const a of kb) {
  const emb = a.embedding === null ? 'NULL' : 'OK'
  console.log(`  [${emb}] [${a.is_active ? 'ativo' : 'INATIVO'}] (${a.category}) ${a.title}`)
}

// ─── 2. ai_config (RAG config, system_prompt) ──────────────────────────────
const cfg = await q('ai_config', 'select=key,value&order=key.asc')
console.log('\n=== 2. AI CONFIG (RAG / sistema) ===')
const cfgMap = {}
for (const c of cfg) {
  cfgMap[c.key] = c.value
  if (c.key === 'system_prompt') {
    console.log(`  system_prompt: [${String(c.value || '').length} chars]`)
    console.log(String(c.value || '').slice(0, 800))
  } else {
    console.log(`  ${c.key}: ${String(c.value || '').slice(0, 120)}`)
  }
}

// ─── 3. Veneno com timestamps (janela 14d para pegar antes/depois do deploy 16/06) ──
const SINCE_14D = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
const DEPLOY_M1M2 = '2026-06-16T00:00:00.000Z'

async function pullPaged(table, qs) {
  let out = []
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}&limit=1000&offset=${off}`, { headers: H })
    const j = await r.json()
    if (!Array.isArray(j)) { console.error('ERRO paged', table, JSON.stringify(j).slice(0, 200)); return out }
    out = out.concat(j); if (j.length < 1000) break
  }
  return out
}

const msgs14d = await pullPaged('ai_conversation_messages', `created_at=gte.${encodeURIComponent(SINCE_14D)}&select=id,conversation_id,role,content,created_at&order=created_at.asc`)
const asst14d = msgs14d.filter(m => m.role === 'assistant')

console.log(`\n=== 3. VENENO — últimas 2 semanas (${asst14d.length} msgs assistant) ===`)
console.log(`Deploy M1/M2 em: ${DEPLOY_M1M2}`)

// 3a. "7 dias" (não "7 dias úteis" vindo do artigo de reembolso — mas vamos pegar tudo e marcar)
const sete_dias = asst14d.filter(m => /7 dias/i.test(String(m.content || '')))
console.log(`\n  [veneno: "7 dias"] total=${sete_dias.length}`)
for (const m of sete_dias) {
  const quando = m.created_at < DEPLOY_M1M2 ? 'ANTES' : 'DEPOIS'
  const trecho = String(m.content || '').match(/(.{0,60}7 dias.{0,60})/i)?.[1] || ''
  console.log(`    ${quando} | ${m.created_at.slice(0,19)} | conv=${m.conversation_id.slice(0,8)} | "${trecho.trim()}"`)
}

// 3b. quillforms/<slug>-<num>
const quillf = asst14d.filter(m => /quillforms\/[a-z-]+-\d+/i.test(String(m.content || '')))
console.log(`\n  [veneno: quillforms/<slug>-<num>] total=${quillf.length}`)
for (const m of quillf) {
  const quando = m.created_at < DEPLOY_M1M2 ? 'ANTES' : 'DEPOIS'
  const match = String(m.content || '').match(/quillforms\/[a-z\-]+\-\d+/i)?.[0] || ''
  console.log(`    ${quando} | ${m.created_at.slice(0,19)} | conv=${m.conversation_id.slice(0,8)} | ${match}`)
}

// ─── 4. Amostra de conversas conf=0 / thumbs-down últimos 7d ──────────────
const SINCE_7D = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
const msgs7d = await pullPaged('ai_conversation_messages', `created_at=gte.${encodeURIComponent(SINCE_7D)}&select=id,conversation_id,role,content,confidence,was_helpful,fluxon_identificacao,created_at&order=created_at.asc`)
const asst7d = msgs7d.filter(m => m.role === 'assistant')
const user7d = msgs7d.filter(m => m.role === 'user')

const firstUserByConv = {}
for (const m of user7d) { if (!firstUserByConv[m.conversation_id]) firstUserByConv[m.conversation_id] = m.content }

const mask = s => String(s || '').replace(/[\w.+-]+@[\w.-]+\.\w+/g, '@').replace(/\b\d[\d .()\-]{8,}\d\b/g, '#')

const conf0 = asst7d.filter(m => m.confidence === 0)
const thumbsDown = asst7d.filter(m => m.was_helpful === false)

console.log(`\n=== 4. CONF=0 últimos 7d — ${conf0.length} mensagens ===`)
for (const m of conf0.slice(0, 20)) {
  const q1 = mask(firstUserByConv[m.conversation_id] || '').slice(0, 100)
  const a1 = mask(m.content || '').slice(0, 120)
  console.log(`  [${m.created_at.slice(0,10)}] conv=${m.conversation_id.slice(0,8)} fluxon=${m.fluxon_identificacao}`)
  console.log(`    Q: ${q1}`)
  console.log(`    A: ${a1}`)
}

console.log(`\n=== 5. THUMBS-DOWN últimos 7d — ${thumbsDown.length} mensagens ===`)
for (const m of thumbsDown.slice(0, 15)) {
  const q1 = mask(firstUserByConv[m.conversation_id] || '').slice(0, 100)
  const a1 = mask(m.content || '').slice(0, 120)
  console.log(`  [${m.created_at.slice(0,10)}] conf=${m.confidence} conv=${m.conversation_id.slice(0,8)}`)
  console.log(`    Q: ${q1}`)
  console.log(`    A: ${a1}`)
}

// ─── 5. fluxon_identificacao breakdown nos conf=0 ─────────────────────────
const idc = {}
for (const m of conf0) { const k = String(m.fluxon_identificacao); idc[k] = (idc[k] || 0) + 1 }
console.log('\n=== 6. fluxon_identificacao dos conf=0:', JSON.stringify(idc))

// ─── 6. Contagem por categoria KB ─────────────────────────────────────────
const bycat = {}
for (const a of kb) { bycat[a.category] = (bycat[a.category] || 0) + 1 }
console.log('\n=== 7. KB por categoria:', JSON.stringify(bycat))

// ─── 7. Amostra de respostas longas conf=0 com fluxon=nao_encontrado ───────
const confNF = conf0.filter(m => m.fluxon_identificacao === 'nao_encontrado')
console.log(`\n=== 8. conf=0 + fluxon=nao_encontrado: ${confNF.length} ===`)
for (const m of confNF.slice(0, 10)) {
  const q1 = mask(firstUserByConv[m.conversation_id] || '').slice(0, 120)
  console.log(`  [${m.created_at.slice(0,10)}] ${q1}`)
}
