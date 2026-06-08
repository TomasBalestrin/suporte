// Monitor 48h da feature sofia-anti-escalonamento.
// Rodar: node .specs/features/sofia-anti-escalonamento/monitor-escalonamento.mjs
// Read-only. Le NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY do .env.local.
//
// Baseline pre-fix (7d, medido 2026-06-07): ESCALONAMENTO 42% · TROUBLESHOOTING 12%.
// Fix aplicado: prompt em 2026-06-07T22:25:31Z + deploy suporte-8rkdzn9w8.
// ALVO: escalonamento despencar, troubleshooting subir, no tráfego POS-fix.

import fs from 'fs'

const FIX_TS = '2026-06-07T22:25:31.579974+00:00'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const url = get('NEXT_PUBLIC_SUPABASE_URL')
const key = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: key, Authorization: 'Bearer ' + key }

const ESCALA = /abrir um ticket|abrir ticket|encaminh|vou conectar|nossa equipe|atendente|verificar (sua compra|manualmente|a compra)|comprovante/i
const TROUBLE = /esqueci minha senha|qual (mensagem|erro)|que erro|redefin|spam|n[aã]o (carrega|abre)|p[aá]gina/i

const stats = rows => {
  let esc = 0, tro = 0
  for (const m of rows) { const c = String(m.content || ''); if (ESCALA.test(c)) esc++; if (TROUBLE.test(c)) tro++ }
  const pct = n => rows.length ? Math.round(n / rows.length * 100) + '%' : '-'
  return { n: rows.length, esc, tro, escPct: pct(esc), troPct: pct(tro) }
}

const fetchAssistant = async (op, ts) => {
  const r = await fetch(`${url}/rest/v1/ai_conversation_messages?role=eq.assistant&created_at=${op}.${encodeURIComponent(ts)}&select=created_at,content,confidence&order=created_at.desc&limit=1000`, { headers: H })
  const j = await r.json()
  return Array.isArray(j) ? j : []
}

const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
const pre = (await fetchAssistant('gte', since7d)).filter(m => m.created_at < FIX_TS)
const pos = await fetchAssistant('gt', FIX_TS)

// frescor: a tabela viva ja recebeu INSERT pos-fix? (staleness check, licao da observabilidade)
const maxTs = [...pre, ...pos].map(m => m.created_at).sort().pop()

console.log('=== MONITOR sofia-anti-escalonamento ===')
console.log('Agora (UTC):', new Date().toISOString(), '| ultima resposta no banco:', maxTs || '(nenhuma)')
console.log('')
const sp = stats(pre), ss = stats(pos)
console.log(`PRE-fix  (7d ate ${FIX_TS.slice(0, 16)}): n=${sp.n}  escalonamento=${sp.escPct}  troubleshooting=${sp.troPct}`)
console.log(`POS-fix  (apos o fix):                 n=${ss.n}  escalonamento=${ss.escPct}  troubleshooting=${ss.troPct}`)
console.log('')
if (ss.n < 10) console.log('⚠️  Amostra pos-fix pequena (<10) — ainda sem trafego real suficiente pra cravar. Rodar de novo mais tarde.')
else if (ss.esc / ss.n > 0.30) console.log('🔴 ALERTA: escalonamento pos-fix >30% — possivel recaida, investigar.')
else console.log('🟢 OK: escalonamento pos-fix caiu vs baseline 42%.')
