// Troca o system_prompt vivo pelo NEW (sem promessa de e-mail). Safety: só grava se o atual == LIVE backup.
// Verify-only por default. Para GRAVAR: APPLY=1 node prompt-apply.mjs
import fs from 'fs'
const here = new URL('.', import.meta.url)
const env = fs.readFileSync(new URL('../../../.env.local', here), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const SB = get('NEXT_PUBLIC_SUPABASE_URL'), SK = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }
const APPLY = process.env.APPLY === '1'

const LIVE = fs.readFileSync(new URL('system_prompt-LIVE-2026-06-19.txt', here), 'utf8')
const NEW = fs.readFileSync(new URL('system_prompt-NEW-2026-06-19.txt', here), 'utf8')

const r = await fetch(`${SB}/rest/v1/ai_config?config_key=eq.system_prompt&select=config_value`, { headers: H })
const cur = (await r.json())[0]?.config_value || ''
console.log(`atual=${cur.length} chars | LIVE backup=${LIVE.length} | NEW=${NEW.length}`)
console.log('atual == LIVE backup?', cur === LIVE)
console.log('promessa de e-mail no atual:', (cur.match(/detalhes por e-?mail/gi) || []).length, '| no NEW:', (NEW.match(/detalhes por e-?mail/gi) || []).length)

if (!APPLY) { console.log('\n🟢 verify-only — nada gravado'); process.exit(0) }
if (cur !== LIVE) { console.log('\n❌ ABORTADO: o prompt vivo mudou desde o backup — não vou sobrescrever cego. Re-puxar e re-aplicar.'); process.exit(1) }
const up = await fetch(`${SB}/rest/v1/ai_config?config_key=eq.system_prompt`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ config_value: NEW }) })
if (!up.ok) { console.log('❌ erro PATCH', up.status, (await up.text()).slice(0, 200)); process.exit(1) }
// read-back
const r2 = await fetch(`${SB}/rest/v1/ai_config?config_key=eq.system_prompt&select=config_value`, { headers: H })
const after = (await r2.json())[0]?.config_value || ''
console.log('\n💾 GRAVADO. read-back == NEW?', after === NEW, '| promessa de e-mail remanescente:', (after.match(/detalhes por e-?mail/gi) || []).length)
