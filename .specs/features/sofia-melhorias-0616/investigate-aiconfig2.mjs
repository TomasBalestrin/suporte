// Puxar todos os registros de ai_config com schema correto (config_key / config_value)
import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const SUPA_URL = get('NEXT_PUBLIC_SUPABASE_URL'), SUPA_KEY = get('SUPABASE_SERVICE_ROLE_KEY')
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY }

const r = await fetch(`${SUPA_URL}/rest/v1/ai_config?select=config_key,config_value&limit=100&order=config_key.asc`, { headers: H })
const j = await r.json()
for (const c of j) {
  if (c.config_key === 'system_prompt') {
    console.log(`\n[system_prompt] (${String(c.config_value||'').length} chars):`)
    console.log(String(c.config_value || ''))
  } else {
    console.log(`${c.config_key}: ${String(c.config_value||'').slice(0,120)}`)
  }
}
