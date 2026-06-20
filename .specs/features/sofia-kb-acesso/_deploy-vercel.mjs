// Deploy do projeto suporte pra produção via API da Vercel (sem CLI).
// DRY por default (só enumera). Real: DEPLOY=1 node _deploy-vercel.mjs
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'

const ROOT = path.resolve(new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const TOKEN = (() => {
  const f = 'C:/Users/lluys/Desktop/PROJETOS/Disparotey/.env.local'
  const m = fs.readFileSync(f, 'utf8').match(/^VERCEL_TOKEN=(.*)$/m)
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null
})()
const proj = JSON.parse(fs.readFileSync(path.join(ROOT, '.vercel/project.json'), 'utf8'))
const PROJECT = proj.projectId, TEAM = proj.orgId
const DEPLOY = process.env.DEPLOY === '1'

// dirs/arquivos rastreados pelo git mas que NÃO entram no build do Next
const EXCLUDE = ['.claude/', '.specs/', '.agent/', '.fallow/', 'e2e/', 'scripts/', 'supabase/', 'respostasprontas/', 'Dockerfile', '.dockerignore', 'PR_DESCRIPTION.md', 'README.md']
const isExcluded = rel => EXCLUDE.some(e => e.endsWith('/') ? rel.startsWith(e) : rel === e)

const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').map(s => s.trim()).filter(Boolean)
const files = tracked
  .filter(rel => !isExcluded(rel))
  .map(rel => { const abs = path.join(ROOT, rel); return { rel, abs, size: fs.existsSync(abs) ? fs.statSync(abs).size : 0 } })
  .filter(f => f.size > 0)
const totalMB = (files.reduce((s, f) => s + f.size, 0) / 1048576).toFixed(1)
console.log('ROOT:', ROOT)
console.log('TOKEN:', TOKEN ? TOKEN.slice(0, 6) + '…' : '(FALTA)', '| project:', PROJECT, '| team:', TEAM)
console.log(`Arquivos a subir: ${files.length} | total ${totalMB} MB`)
console.log('Top-level incluído:', [...new Set(files.map(f => f.rel.split('/')[0]))].join(', '))
const big = files.filter(f => f.size > 1048576).map(f => `${f.rel} (${(f.size/1048576).toFixed(1)}MB)`)
if (big.length) console.log('Arquivos >1MB:', big.join(' | '))

if (!DEPLOY) { console.log('\n🟢 DRY — nada enviado. Para deployar: DEPLOY=1'); process.exit(0) }
if (!TOKEN) { console.log('❌ sem VERCEL_TOKEN'); process.exit(1) }

const H = { Authorization: 'Bearer ' + TOKEN }
function sha1(buf) { return crypto.createHash('sha1').update(buf).digest('hex') }

// 1) upload files
console.log('\n⬆️  subindo arquivos...')
const manifest = []
let done = 0, failed = 0
async function up(f) {
  const buf = fs.readFileSync(f.abs)
  const digest = sha1(buf)
  const r = await fetch(`https://api.vercel.com/v2/files?teamId=${TEAM}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': digest, 'Content-Length': String(buf.length) },
    body: buf,
  })
  if (!r.ok && r.status !== 409) { failed++; if (failed <= 5) console.log('  ❌', f.rel, r.status, (await r.text()).slice(0, 120)); return }
  manifest.push({ file: f.rel, sha: digest, size: buf.length })
  if (++done % 50 === 0) console.log(`  ...${done}/${files.length}`)
}
// pool de concorrência
const POOL = 8
for (let i = 0; i < files.length; i += POOL) {
  await Promise.all(files.slice(i, i + POOL).map(up))
}
console.log(`upload: ${manifest.length} ok, ${failed} falhas`)
if (failed) { console.log('❌ abortando — upload incompleto'); process.exit(1) }

// 2) cria deployment de produção
console.log('\n🚀 criando deployment (produção)...')
const dep = await fetch(`https://api.vercel.com/v13/deployments?teamId=${TEAM}&skipAutoDetectionConfirmation=1`, {
  method: 'POST',
  headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'suporte', project: PROJECT, target: 'production', files: manifest, projectSettings: { framework: 'nextjs' } }),
})
const dj = await dep.json()
if (!dep.ok) { console.log('❌ deployment', dep.status, JSON.stringify(dj).slice(0, 400)); process.exit(1) }
console.log('✅ deployment criado:', dj.url || dj.id, '| estado:', dj.readyState || dj.status)
console.log('inspector:', `https://vercel.com/${TEAM}/suporte/${dj.id}`)
console.log('id pra polling:', dj.id)
