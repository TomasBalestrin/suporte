// Polla o status do deployment até READY/ERROR.
import fs from 'fs'
const TOKEN = (() => { const m = fs.readFileSync('C:/Users/lluys/Desktop/PROJETOS/Disparotey/.env.local', 'utf8').match(/^VERCEL_TOKEN=(.*)$/m); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null })()
const ID = process.argv[2] || 'dpl_4QVbP5GBspGmge6HXXXPMjwuxrzK'
const TEAM = 'team_JTdOmuSStCjZuqbEKSRGggCN'
const H = { Authorization: 'Bearer ' + TOKEN }
const sleep = ms => new Promise(r => setTimeout(r, ms))

for (let i = 0; i < 40; i++) {
  const r = await fetch(`https://api.vercel.com/v13/deployments/${ID}?teamId=${TEAM}`, { headers: H })
  const j = await r.json()
  const st = j.readyState || j.status
  console.log(`[${i}] ${st}${j.aliasAssigned ? ' | alias OK' : ''}`)
  if (st === 'READY') {
    console.log('\n✅ READY')
    console.log('URL:', 'https://' + (j.url || ''))
    console.log('aliases:', (j.alias || []).join(', ') || '(produção será o domínio do projeto)')
    process.exit(0)
  }
  if (st === 'ERROR' || st === 'CANCELED') {
    console.log('\n❌', st, '—', j.errorMessage || '(ver eventos)')
    const ev = await fetch(`https://api.vercel.com/v3/deployments/${ID}/events?teamId=${TEAM}&builds=1&limit=40`, { headers: H })
    const evj = await ev.json()
    const arr = Array.isArray(evj) ? evj : (evj.events || [])
    for (const e of arr.slice(-25)) { const t = e.text || e.payload?.text; if (t) console.log('  ', String(t).slice(0, 200)) }
    process.exit(1)
  }
  await sleep(8000)
}
console.log('⏱️ timeout de polling — checar inspector')
