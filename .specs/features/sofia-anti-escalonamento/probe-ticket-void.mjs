// PROBE read-only: a promessa "vou encaminhar pra equipe / abrir ticket" vira ticket de verdade?
// ai_conversations tem ticket_id -> resposta direta. Rodar: node .specs/features/sofia-anti-escalonamento/probe-ticket-void.mjs
import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const url = get('NEXT_PUBLIC_SUPABASE_URL'); const key = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: key, Authorization: 'Bearer ' + key }
const q = async (path) => { const r = await fetch(url + '/rest/v1/' + path, { headers: H }); const j = await r.json(); return Array.isArray(j) ? j : [j] }

// uuids completos das conversas-queixa (do probe anterior)
const convs = {
  '41627097-3ce4-478d-b5ec-3c607cdd7e65': 'produtos bloqueados (pix ontem)',
  'ada9fb03-71ae-4838-aaae-e615726f067d': 'produto nao esta nos scripts',
  '5e4ff255-b3f2-450b-b295-bb7a3aca6eff': 'juliana: 3 cursos sem acesso',
  '4998fe68-530f-4ebe-bda2-4ff615dca2d2': 'juliana: email+pagtrust',
  '75a6b7b7-42c1-4408-ad20-37fdc7a1b049': 'juliana: cpf',
  'dedf82d3-984d-434e-bbe0-5e3ee8c582d6': 'comprei sabado nao resolveram',
  'ea41a33b-e13d-4f38-b07e-85a9cc3dde83': 'produto relacionado / nao atende',
  '283e235b-0000-0000-0000-000000000000': '(prefixo) vitalicio?',
}
console.log('=== conversas-queixa: virou ticket? canal? ===')
for (const [cid, desc] of Object.entries(convs)) {
  const rows = await q(`ai_conversations?id=eq.${cid}&select=id,customer_email,customer_cpf,customer_telefone,ticket_id,whatsapp_conversa_id,created_at`)
  const c = rows[0]
  if (!c || !c.id) { console.log(`- ${cid.slice(0,8)} (${desc}): NAO ACHEI a conversa`); continue }
  console.log(`- ${cid.slice(0,8)} (${desc}):`)
  console.log(`    email=${c.customer_email||'-'} cpf=${c.customer_cpf||'-'} tel=${c.customer_telefone||'-'}`)
  console.log(`    ticket_id=${c.ticket_id ? '✅ '+String(c.ticket_id).slice(0,8) : '🔴 NULL (sem ticket!)'}  whatsapp=${c.whatsapp_conversa_id ? 'SIM' : 'nao(form)'}`)
}

// sistemico: das conversas dos ultimos 14d, quantas tem ticket_id?
const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
const allConv = await q(`ai_conversations?created_at=gte.${encodeURIComponent(since)}&select=id,ticket_id,whatsapp_conversa_id,created_at&limit=2000`)
const comTk = allConv.filter(c => c.ticket_id).length
const wpp = allConv.filter(c => c.whatsapp_conversa_id).length
console.log(`\n=== SISTEMICO (14d): ${allConv.length} conversas Sofia ===`)
console.log(`  com ticket_id (viraram ticket): ${comTk} (${Math.round(comTk/allConv.length*100)}%)`)
console.log(`  sem ticket_id: ${allConv.length-comTk} (${Math.round((allConv.length-comTk)/allConv.length*100)}%)`)
console.log(`  via whatsapp/fluxon: ${wpp}  | via form/site: ${allConv.length-wpp}`)

// tickets criados na janela (colunas certas)
const tks = await q(`tickets?created_at=gte.${encodeURIComponent(since)}&select=id,ticket_code,title,status,source,created_at&order=created_at.desc&limit=300`)
console.log(`\n=== tickets criados 14d: ${tks.length && tks[0].id ? tks.length : 0} ===`)
if (tks.length && tks[0].id) {
  const porFonte = {}, porStatus = {}
  for (const t of tks) { const f=t.source||'?'; porFonte[f]=(porFonte[f]||0)+1; porStatus[t.status||'?']=(porStatus[t.status||'?']||0)+1 }
  console.log('  por fonte:', JSON.stringify(porFonte))
  console.log('  por status:', JSON.stringify(porStatus))
}
