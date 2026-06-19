// Gera system_prompt-NEW a partir do LIVE removendo as 2 promessas de e-mail. Verificável.
import fs from 'fs'
const here = new URL('.', import.meta.url)
let p = fs.readFileSync(new URL('system_prompt-LIVE-2026-06-19.txt', here), 'utf8')
const reps = [
  ['que ele recebe os detalhes por e-mail e pode acompanhar por aqui mesmo', 'que ele pode acompanhar por aqui mesmo'],
  ['você vai receber os detalhes por e-mail e pode acompanhar por aqui', 'você pode acompanhar por aqui mesmo'],
]
let ok = true
for (const [from, to] of reps) {
  const n = p.split(from).length - 1
  if (n !== 1) { console.log(`❌ esperava 1 ocorrência de "${from.slice(0, 40)}…", achei ${n}`); ok = false; continue }
  p = p.replace(from, to)
  console.log(`✅ trocado: "…${from.slice(-30)}" → "…${to.slice(-30)}"`)
}
// resíduo: alguma promessa de RECEBER e-mail ainda no texto?
const promessas = (p.match(/receb\w* .{0,20}e-?mail|detalhes por e-?mail/gi) || [])
console.log('\nPromessas de receber e-mail remanescentes:', promessas.length, promessas)
console.log('chars LIVE:', fs.readFileSync(new URL('system_prompt-LIVE-2026-06-19.txt', here), 'utf8').length, '→ NEW:', p.length)
if (ok) { fs.writeFileSync(new URL('system_prompt-NEW-2026-06-19.txt', here), p); console.log('\n✅ system_prompt-NEW-2026-06-19.txt gravado') }
else console.log('\n❌ NÃO gravou — corrigir as strings primeiro')
