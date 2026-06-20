// PROBE read-only: dump cru das conversas-queixa de entrega (com mensagens de tool)
// pra calibrar o parser. Rodar: node .specs/features/sofia-anti-escalonamento/probe-fulfillment.mjs
import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const url = get('NEXT_PUBLIC_SUPABASE_URL'); const key = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: key, Authorization: 'Bearer ' + key }

// conversas que ja identifiquei como queixa de entrega
const ids = ['41627097', 'ada9fb03', '5e4ff255', '4998fe68', '75a6b7b7', 'dedf82d3', 'ea41a33b']
// resolver uuid completo: pega as msgs recentes e casa o prefixo
const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
const r = await fetch(`${url}/rest/v1/ai_conversation_messages?created_at=gte.${encodeURIComponent(since)}&select=conversation_id,role,created_at,content&order=created_at.asc&limit=5000`, { headers: H })
const all = await r.json()
console.log('total msgs 14d:', all.length, '| roles:', [...new Set(all.map(m => m.role))].join(','))

const byConv = {}
for (const m of all) (byConv[m.conversation_id] ??= []).push(m)
for (const pref of ids) {
  const cid = Object.keys(byConv).find(k => k.startsWith(pref))
  if (!cid) { console.log(`\n### ${pref} — (fora da janela de 14d)`); continue }
  console.log(`\n############### conv ${cid} ###############`)
  for (const m of byConv[cid]) {
    console.log(`[${m.role}] ${m.created_at.slice(11,16)} ${String(m.content||'').replace(/\s+/g,' ').slice(0, 400)}`)
  }
}
