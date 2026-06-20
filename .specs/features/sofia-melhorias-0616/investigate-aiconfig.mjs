// Puxar ai_config com schema real (sem assumir coluna 'key')
import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const SUPA_URL = get('NEXT_PUBLIC_SUPABASE_URL'), SUPA_KEY = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY }

// Pegar schema completo — select * limite 5
const r = await fetch(`${SUPA_URL}/rest/v1/ai_config?select=*&limit=5`, { headers: H })
const j = await r.json()
console.log('ai_config sample:', JSON.stringify(j, null, 2))
