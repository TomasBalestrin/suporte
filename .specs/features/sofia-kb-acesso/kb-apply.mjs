// Augmenta artigos de KB existentes (append) + regenera embedding. VERIFICA ≥0.6 antes.
// Verify-only por default. Para GRAVAR em prod: APPLY=1 node kb-apply.mjs
import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const SB = get('NEXT_PUBLIC_SUPABASE_URL'), SK = get('SUPABASE_SERVICE_ROLE_KEY'), OK = get('OPENAI_API_KEY')
const H = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }
const THRESH = 0.6, APPLY = process.env.APPLY === '1'

async function embed(t) {
  const r = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + OK }, body: JSON.stringify({ model: 'text-embedding-3-small', input: t }) })
  const j = await r.json(); if (!r.ok) throw new Error('OpenAI ' + r.status); return j.data[0].embedding
}
const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] } return d / (Math.sqrt(na) * Math.sqrt(nb)) }
const toVec = e => Array.isArray(e) ? e : (typeof e === 'string' ? JSON.parse(e) : null)

const TARGETS = [
  { tag: 'P4', title: 'Implementação da Ferramenta de Inteligência Artificial - Informações e FAQ',
    q: '[Produto: Implementacao da Ferramenta de Inteligencia Artificial] pensei que viria algum aplicativo de instalação e execução imediata',
    add: `\n\nEsperava um aplicativo para instalar — onde baixo o app da Implementação IA?\nA Implementação IA não é um aplicativo para baixar ou instalar e não vem nenhum instalador ou programa de execução imediata. É acessada 100% online pela área de membros do Cleiton (https://cleitonquerobin1.com.br/area-de-membros/), com o e-mail da compra e a senha performance123. Dentro da área de membros você encontra o passo a passo em vídeo para conectar a ferramenta ao seu WhatsApp — não há nada para instalar no computador ou no celular; é tudo pelo navegador.` },
  { tag: 'P3', title: 'Teste dos Arquétipos - Informações e FAQ',
    q: '[Produto: Teste dos Arquetipos] não recebi o resultado do meu teste em PDF',
    add: `\n\nNão recebi o resultado do teste em PDF nem por e-mail. Como vejo o resultado?\nO resultado do Teste dos Arquétipos não é enviado em PDF nem por e-mail — ele aparece na tela, na hora, ao final do teste. Não existe um arquivo PDF para baixar. Por isso é importante anotar os três arquétipos ou tirar um print da tela assim que o resultado aparecer. Se você fechou a página antes de salvar, é só refazer o teste pela área de membros da Julia Academy (https://juliaacademy.com.br/) e tirar o print do novo resultado.` },
  { tag: 'P1a', title: 'Teste dos Arquétipos — como acessar, refazer e troubleshooting',
    q: '[Produto: Teste dos Arquetipos] não consigo realizar o teste com o meu e-mail e a senha padrão',
    add: `\n\n## Frases comuns do cliente (mesmo problema, outras palavras)\n- "não consigo realizar o teste com o meu e-mail e a senha padrão"\n- "comprei o teste de arquétipos e a senha não está entrando"\n- "não consigo fazer o teste, não entra com meu e-mail e a senha padrão"\nResposta: o Teste dos Arquétipos abre pela área de membros da Julia Academy (https://juliaacademy.com.br/) com o e-mail exato da compra e a senha padrão ottoni123. Se a senha padrão não entra, confirme que está usando o mesmo e-mail da compra e clique em "Esqueci minha senha" para redefinir; persistindo, abra um chamado.` },
  { tag: 'P2b', title: 'Não encontrei meu produto na área de membros',
    q: '[Produto: Teste dos Arquetipos] comprei o produto e nos meus produtos está trancado',
    add: `\n\nMeu produto ou minhas aulas aparecem bloqueados / trancados / com cadeado na área de membros:\nSe você está logado mas vê o produto, módulo ou as aulas como "bloqueado", "trancado" ou com cadeado:\n1. Confirme que entrou com o e-mail EXATO da compra — muita gente tem mais de um e-mail.\n2. Verifique se está tentando acessar o mesmo produto que comprou — produtos diferentes ficam em áreas e endereços diferentes.\n3. Se comprou há poucos minutos, aguarde a liberação e atualize a página.\nSe o produto continuar trancado ou as aulas bloqueadas, abra um chamado com o e-mail da compra, o nome do produto e um print da tela bloqueada.` },
]

console.log(`MODO: ${APPLY ? '🔴 APPLY (grava em prod)' : '🟢 verify-only'} | threshold ${THRESH}\n`)
for (const t of TARGETS) {
  const r = await fetch(`${SB}/rest/v1/knowledge_base?title=eq.${encodeURIComponent(t.title)}&is_active=eq.true&select=id,title,content,embedding`, { headers: H })
  const rows = await r.json()
  if (!Array.isArray(rows) || !rows.length) { console.log(`[${t.tag}] ❌ artigo não encontrado: "${t.title}"`); continue }
  if (rows.length > 1) { console.log(`[${t.tag}] ⚠️ ${rows.length} artigos com esse título — usando o 1º (${rows[0].id.slice(0,8)})`) }
  const a = rows[0]
  const newContent = a.content + t.add
  const qE = await embed(t.q)
  const beforeVec = toVec(a.embedding)
  const before = beforeVec ? cos(qE, beforeVec) : null
  const newEmb = await embed(`${a.title}\n\n${newContent}`)
  const after = cos(qE, newEmb)
  const flag = after >= THRESH ? '✅ PASSA' : '❌ abaixo'
  console.log(`[${t.tag}] ${a.id.slice(0, 8)} "${a.title.slice(0, 45)}"`)
  console.log(`   antes(stored)=${before != null ? before.toFixed(3) : '?'}  →  depois=${after.toFixed(3)}  ${flag}  (+${a.add?.length || t.add.length} chars)`)
  if (APPLY) {
    if (after < THRESH) { console.log('   ⏭️ não grava (abaixo do corte)'); continue }
    const up = await fetch(`${SB}/rest/v1/knowledge_base?id=eq.${a.id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ content: newContent, embedding: newEmb }) })
    console.log(`   ${up.ok ? '💾 GRAVADO' : '❌ erro PATCH ' + up.status + ' ' + (await up.text()).slice(0,150)}`)
  }
}
