// DIAGNÓSTICO REAL de retrieval — replica a prod (/api/ai/chat):
//   enrichedQuestion = "[Produto: X] <pergunta>" -> embedding -> search_knowledge_base(threshold=0, count=5)
// Mostra o artigo mais próximo + similarity, COM e SEM prefixo de produto (mede o boost).
// READ-ONLY: só lê embeddings + chama OpenAI. Não escreve nada.
import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const SB = get('NEXT_PUBLIC_SUPABASE_URL'), SK = get('SUPABASE_SERVICE_ROLE_KEY'), OK = get('OPENAI_API_KEY')
const THRESH = 0.6

async function embed(text) {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + OK },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error('OpenAI ' + r.status + ' ' + JSON.stringify(j.error))
  return j.data[0].embedding
}
async function search(emb) {
  const r = await fetch(`${SB}/rest/v1/rpc/search_knowledge_base`, {
    method: 'POST', headers: { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_embedding: emb, match_threshold: 0, match_count: 5 }),
  })
  const j = await r.json()
  if (!Array.isArray(j)) throw new Error('RPC ' + r.status + ' ' + JSON.stringify(j).slice(0, 200))
  return j
}

// clusters reais (wording do cliente, dos conf=0/thumbs-down 7d) + produto da conversa
const CASES = [
  { id: 'P1', prod: '[Produto: Teste dos Arquetipos] ', q: 'não consigo realizar o teste com o meu e-mail e a senha padrão' },
  { id: 'P1', prod: '[Produto: 50 Scripts Prontos para o WhatsApp] ', q: 'a senha não está entrando' },
  { id: 'P2', prod: '[Produto: 50 Scripts Prontos para o WhatsApp] ', q: 'acesso a plataforma mas não consigo acessar todas as aulas, estão bloqueadas' },
  { id: 'P2', prod: '[Produto: Teste dos Arquetipos] ', q: 'comprei o produto e nos meus produtos está trancado' },
  { id: 'P3', prod: '[Produto: Teste dos Arquetipos] ', q: 'não recebi o resultado do meu teste em PDF' },
  { id: 'P4', prod: '[Produto: Implementacao da Ferramenta de Inteligencia Artificial] ', q: 'pensei que viria algum aplicativo de instalação e execução imediata' },
  { id: 'P5', prod: '[Produto: Teste dos Arquetipos] ', q: 'não estou conseguindo realizar o teste, clico no link e diz que a página não existe' },
]

console.log('threshold de corte:', THRESH, '(abaixo = conf=0 / requires_ticket)\n')
for (const c of CASES) {
  const withP = await search(await embed(c.prod + c.q))
  const noP = await search(await embed(c.q))
  const top = withP[0] || {}, topN = noP[0] || {}
  const flag = (top.similarity ?? 0) >= THRESH ? '✅ RECUPERA' : '❌ conf=0'
  console.log(`[${c.id}] "${c.q.slice(0, 55)}"`)
  console.log(`   COM produto : ${flag}  sim=${(top.similarity ?? 0).toFixed(3)}  → "${(top.title || '?').slice(0, 60)}"`)
  console.log(`   SEM produto : sim=${(topN.similarity ?? 0).toFixed(3)}  → "${(topN.title || '?').slice(0, 60)}"`)
  console.log(`   top-3 (c/ prod): ${withP.slice(0, 3).map(a => `${(a.similarity).toFixed(2)} ${a.title.slice(0, 28)}`).join(' | ')}`)
  console.log('')
}
