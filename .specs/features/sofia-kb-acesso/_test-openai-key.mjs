// Testa a OPENAI_API_KEY do .env.local — read-only, 1 chamada mínima de embedding.
import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const key = get('OPENAI_API_KEY')
console.log('OPENAI_API_KEY presente?', !!key, '| prefixo:', key ? key.slice(0, 7) + '…' + key.slice(-4) : '(null)', '| len:', key ? key.length : 0)
// alguns projetos usam outra var
for (const alt of ['OPENAI_KEY', 'OPENAI_API_KEY_SUPORTE', 'OPENAI']) { const v = get(alt); if (v) console.log('  (também existe', alt, '=', v.slice(0,7) + '…)') }

if (!key) { console.log('Sem chave pra testar.'); process.exit(0) }
const r = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
  body: JSON.stringify({ model: 'text-embedding-3-small', input: 'teste de chave' }),
})
console.log('HTTP', r.status)
const j = await r.json()
if (r.ok) console.log('✅ CHAVE VIVA — dims:', j.data?.[0]?.embedding?.length)
else console.log('❌ ERRO:', JSON.stringify(j.error || j).slice(0, 300))
