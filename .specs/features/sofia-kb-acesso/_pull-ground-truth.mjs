// Read-only: puxa o ground truth real (prompt vivo + KB de acesso + products).
// Rodar com o node do Cursor. NÃO escreve no banco.
import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const url = get('NEXT_PUBLIC_SUPABASE_URL'), key = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: key, Authorization: 'Bearer ' + key }
const here = new URL('.', import.meta.url)

async function q(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: H })
  const j = await r.json()
  if (!Array.isArray(j)) { console.error('ERRO', path, JSON.stringify(j).slice(0, 300)); process.exit(1) }
  return j
}

// 1) system_prompt vivo
const cfg = await q(`ai_config?select=config_key,config_value`)
const sp = cfg.find(c => c.config_key === 'system_prompt')
fs.writeFileSync(new URL('system_prompt-LIVE-2026-06-19.txt', here), sp?.config_value || '(VAZIO)')
console.log('=== system_prompt vivo ===')
console.log('chars:', (sp?.config_value || '').length)
console.log('outras config_keys:', cfg.map(c => `${c.config_key}=${String(c.config_value).slice(0,40)}`).join(' | '))

// 2) products (id + name reais)
const prods = await q(`products?select=id,name&order=name`)
console.log('\n=== products ===')
for (const p of prods) console.log(`  ${p.id} | ${p.name}`)

// 3) KB de acesso/teste/implementação (real URLs/senhas)
const kb = await q(`knowledge_base?select=id,title,category,product_id,is_active,content&is_active=eq.true&order=category`)
const rel = kb.filter(a => /acess|login|senha|teste|arqu[eé]t|implementa|membro|troubleshoot|app|instal/i.test(a.title + ' ' + a.category))
console.log(`\n=== KB ativos relevantes: ${rel.length} de ${kb.length} ===`)
const dump = rel.map(a => `### [${a.category}] ${a.title}\nproduct_id: ${a.product_id}\n\n${a.content}\n`).join('\n---\n')
fs.writeFileSync(new URL('kb-existente-acesso.md', here), dump)
for (const a of rel) console.log(`  [${a.category}] ${a.title} (prod ${a.product_id ? a.product_id.slice(0,8) : 'null'})`)

console.log('\nArquivos: system_prompt-LIVE-2026-06-19.txt + kb-existente-acesso.md')
