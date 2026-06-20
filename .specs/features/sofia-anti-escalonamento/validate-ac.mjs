// Validacao A+C (read-only) — feature sofia-anti-escalonamento, fixes A+C.
// Rodar: node .specs/features/sofia-anti-escalonamento/validate-ac.mjs
//
// PERGUNTA QUE RESPONDE (STATE.md): com C ativo, SEGMENTANDO pelo que o pre-fetch
// do Fluxon achou, a Sofia AINDA escala comprador real que tinha o link na mao?
//   - S1 comprador-real-com-link (match_* + tem_link=true): alvo do fix A.
//       prematuro ALTO aqui => A nao bastou, e prompt.
//   - S3 nao_encontrado: pre-fetch rodou e nao achou.
//       muito comprador-real caindo aqui => timing/cobertura do Fluxon, nao prompt.
//   - S4 sem-prefetch (null): cliente nao deu email/cpf -> pre-fetch nem rodou.
//
// Read-only. Le NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY do .env.local.
// PII mascarada em qualquer preview impresso.

import fs from 'fs'

// A+C deployado 2026-06-09 ~12:40 UTC (migration 018 + route.ts gravando C).
const AC_TS = '2026-06-09T12:40:00+00:00'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const url = get('NEXT_PUBLIC_SUPABASE_URL')
const key = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: key, Authorization: 'Bearer ' + key }

// mesma bateria de regex do audit-escalonamento (classificacao por bucket, nao regex cego)
const ESCALA = /abrir um ticket|abrir ticket|encaminh|vou conectar|nossa equipe|atendente|verificar (sua compra|manualmente|a compra)|comprovante/i
const TROUBLE = /esqueci minha senha|qual (mensagem|erro)|que erro|redefin|spam|n[aã]o (carrega|abre)|p[aá]gina/i
// LEGIT inclui insatisfacao/arrependimento (decisao de produto 06-09: insatisfacao -> humano)
const LEGIT = /reembolso|estorno|fraude|golpe|process[ao]|advogad|juridic|cancel|chargeback|n[aã]o gostei|insatisfa|arrepend|n[aã]o atende|quero (meu )?dinheiro/i
// produto citado NAO consta nas compras (juliana-type) -> escalar e o desenho (decisao A, 06-09)
const PRODUTO_NAO_CONSTA = /outros? (cursos?|produtos?)|outras? (compras?|aulas?)|n[aã]o (aparece|consta|veio|liberou|foi liberad)|comprei .{0,40}(mais|tamb[eé]m|outros)|s[oó] (liberou|veio|aparece) (um|o reels|parte)/i
// turno onde a Sofia so colhe o dado da compra (email/plataforma) antes de seguir -> nao e escala-cedo
const COLETA = /qual (a )?plataforma|hotmart ou pagtrust|informar? o e-mail|e-mail da compra|poderia (me )?(informar|confirmar)/i
const PEDE_HUMANO = /atendimento humano|falar com (humano|atendente|pessoa|algu[eé]m|gente)|quero (humano|atendente)|com uma pessoa/i
const NAO_RESOLVE = /n[aã]o tenho (essa|a|info)|n[aã]o sei (essa|informar)|n[aã]o consigo confirmar|n[aã]o foi liberad|n[aã]o liberou|bloquead|n[aã]o recebi|n[aã]o veio|n[aã]o chegou|continua sem acesso/i
const DEU_LINK = /quillforms|juliaacademy|cleitonquerobin\.com\.br\/|senha.{0,20}ottoni123|link de acesso/i

const mask = s => String(s || '')
  .replace(/[\w.+-]+@[\w.-]+\.\w+/g, '***@***')
  .replace(/\b\d[\d .()\-]{8,}\d\b/g, '***tel/cpf***')
  .replace(/\s+/g, ' ')

const seg = m => {
  const id = m.fluxon_identificacao
  if (id == null) return 'S4_sem_prefetch'
  if (/^match_/.test(id)) return m.fluxon_tem_link ? 'S1_comprador_com_link' : 'S2_achou_sem_link'
  if (id === 'nao_encontrado') return 'S3_nao_encontrado'
  return 'S5_outro(' + id + ')'
}

// classifica um escalonamento dado o thread ate ele (mesma logica do audit)
const classify = (m, thread) => {
  const idx = thread.findIndex(x => x.content === m.content && x.created_at === m.created_at)
  const antes = idx >= 0 ? thread.slice(0, idx) : []
  const txtCliente = antes.filter(x => x.role === 'user').map(x => String(x.content || '')).join(' | ')
  const assistantsAntes = antes.filter(x => x.role === 'assistant').length
  const houveTrouble = (idx >= 0 ? thread.slice(0, idx + 1) : thread).some(x => x.role === 'assistant' && TROUBLE.test(String(x.content || '')))
  const ehLegit = LEGIT.test(String(m.content || '')) || antes.some(x => LEGIT.test(String(x.content || '')))
  // follow-up: a Sofia JA escalou numa resposta anterior do mesmo thread -> este turno e continuacao, nao escala-cedo
  const jaEscalouAntes = antes.some(x => x.role === 'assistant' && ESCALA.test(String(x.content || '')))
  const txt = String(m.content || '')
  if (DEU_LINK.test(txt)) return 'naoEscala_deuLink'
  if (jaEscalouAntes) return 'ok_followup'
  if (PEDE_HUMANO.test(txtCliente)) return 'ok_pediuHumano'
  if (ehLegit) return 'ok_legit'
  if (PRODUTO_NAO_CONSTA.test(txt) || PRODUTO_NAO_CONSTA.test(txtCliente)) return 'ok_produtoNaoConsta'
  if (NAO_RESOLVE.test(txt) || NAO_RESOLVE.test(txtCliente)) return 'ok_naoResolve'
  if (COLETA.test(txt)) return 'ok_coletaDados'
  if (houveTrouble || assistantsAntes >= 2) return 'ok_troubleshootou'
  return 'PREMATURO'
}

// ---- pull respostas assistant pos A+C, com as colunas do C ----
let all = []
for (let off = 0; ; off += 1000) {
  const r = await fetch(`${url}/rest/v1/ai_conversation_messages?role=eq.assistant&created_at=gte.${encodeURIComponent(AC_TS)}&select=id,conversation_id,created_at,content,confidence,fluxon_identificacao,fluxon_tem_link&order=created_at.asc&limit=1000&offset=${off}`, { headers: H })
  const j = await r.json()
  if (!Array.isArray(j)) { console.error('ERRO REST:', JSON.stringify(j)); process.exit(1) }
  all = all.concat(j)
  if (j.length < 1000) break
}

const maxTs = all.map(m => m.created_at).sort().slice(-1)[0]
console.log('=== VALIDACAO A+C (sofia-anti-escalonamento) ===')
console.log('Janela: A+C ativo desde', AC_TS, '| agora (UTC):', new Date().toISOString())
console.log('Ultima resposta no banco:', maxTs || '(nenhuma)', '| total respostas assistant pos-A+C:', all.length)
console.log('')

if (all.length === 0) { console.log('SEM DADO no periodo. C nao gravou nada? Checar deploy/coluna.'); process.exit(0) }

// ---- cobertura do pre-fetch (C): quanto o Fluxon achou ----
const bySeg = {}
for (const m of all) { const s = seg(m); (bySeg[s] ||= []).push(m) }
console.log('--- COBERTURA DO PRE-FETCH (o que o C registrou) ---')
const segOrder = ['S1_comprador_com_link', 'S2_achou_sem_link', 'S3_nao_encontrado', 'S4_sem_prefetch']
for (const s of [...segOrder, ...Object.keys(bySeg).filter(k => !segOrder.includes(k))]) {
  if (!bySeg[s]) continue
  const n = bySeg[s].length
  console.log(`  ${s.padEnd(26)} ${String(n).padStart(4)}  (${Math.round(n / all.length * 100)}%)`)
}
const idCounts = {}
for (const m of all) { const k = String(m.fluxon_identificacao) ; idCounts[k] = (idCounts[k] || 0) + 1 }
console.log('  raw fluxon_identificacao:', JSON.stringify(idCounts))
console.log('')

// ---- escalonamento por segmento (bucket, nao regex cego) ----
const escAll = all.filter(m => ESCALA.test(String(m.content || '')))
const convIds = [...new Set(escAll.map(m => m.conversation_id))]
const threads = {}
for (const cid of convIds) {
  const tr = await fetch(`${url}/rest/v1/ai_conversation_messages?conversation_id=eq.${cid}&select=role,created_at,content&order=created_at.asc&limit=200`, { headers: H })
  threads[cid] = await tr.json()
}

console.log('--- ESCALONAMENTO POR SEGMENTO (classificado por bucket) ---')
const prematurosS1 = []
for (const s of segOrder) {
  const rows = bySeg[s]; if (!rows) continue
  const esc = rows.filter(m => ESCALA.test(String(m.content || '')))
  const buckets = {}
  for (const m of esc) {
    const tag = classify(m, threads[m.conversation_id] || [])
    buckets[tag] = (buckets[tag] || 0) + 1
    if (s === 'S1_comprador_com_link' && tag === 'PREMATURO') prematurosS1.push(m)
  }
  const prem = buckets.PREMATURO || 0
  console.log(`\n  [${s}] n=${rows.length}  casou-ESCALA=${esc.length}  PREMATURO=${prem} (${rows.length ? Math.round(prem / rows.length * 100) : 0}% do segmento)`)
  console.log('     buckets:', JSON.stringify(buckets))
}

console.log('\n=== VEREDITO A (fix do ramo com-compra) ===')
const s1 = bySeg.S1_comprador_com_link || []
const s1prem = prematurosS1.length
if (s1.length === 0) {
  console.log('S1 (comprador real + link) = 0 respostas no periodo. Pre-fetch raramente achou compra COM link.')
  console.log('-> O gargalo NAO e o ramo com-compra; e cobertura do pre-fetch (ver S3/S4). Fix A tem pouca superficie.')
} else {
  const pct = Math.round(s1prem / s1.length * 100)
  console.log(`S1 = ${s1.length} respostas de comprador real com link. Escalonamento PREMATURO = ${s1prem} (${pct}%).`)
  if (pct >= 20) console.log('🔴 A NAO BASTOU: Sofia ainda escala comprador com link na mao em taxa relevante. Investigar prompt do ramo com-compra.')
  else console.log('🟢 A SEGUROU: comprador com link raramente e escalado prematuramente. Fix A validado nesse segmento.')
}
const s3 = (bySeg.S3_nao_encontrado || []).length, s4 = (bySeg.S4_sem_prefetch || []).length
console.log(`\nCobertura: ${s3} resp nao_encontrado + ${s4} sem-prefetch de ${all.length}. ` +
  `Se muito comprador real cai em nao_encontrado => debito Fluxon (timing/cobertura), nao prompt.`)

// ---- detalhe dos prematuros de S1 (a recaida real, se houver) — PII mascarada ----
if (prematurosS1.length) {
  console.log('\n=== DETALHE PREMATUROS S1 (comprador real + link, escalado cedo) ===')
  for (const m of prematurosS1.slice(0, 20)) {
    const th = threads[m.conversation_id] || []
    const idx = th.findIndex(x => x.content === m.content && x.created_at === m.created_at)
    console.log(`\n--- conv ${m.conversation_id.slice(0, 8)} ${m.created_at.slice(0, 16)} conf=${m.confidence ?? '-'} id=${m.fluxon_identificacao} link=${m.fluxon_tem_link} ---`)
    for (const x of th.slice(Math.max(0, idx - 2), idx + 1)) console.log(`  [${x.role}] ${mask(x.content).slice(0, 260)}`)
  }
}
