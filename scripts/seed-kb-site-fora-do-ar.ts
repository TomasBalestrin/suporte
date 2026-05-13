import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.vercel')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const openaiKey = process.env.OPENAI_API_KEY!

const supabase = createClient(url, key)
const openai = new OpenAI({ apiKey: openaiKey })

const respostas = [
  {
    title: 'Area de Membros Fora do Ar — Site Suspenso',
    category: 'Acesso e Login',
    keywords: 'this account has been suspended contact your hosting provider for more information site fora do ar suspenso erro servidor hospedagem nao carrega pagina nao abre',
    content: `QUANDO O CLIENTE REPORTAR QUE O SITE DE ACESSO ESTA FORA DO AR:

Sinais de identificacao (qualquer um destes indica SITE FORA DO AR, nao problema do cliente):
- "This Account has been suspended"
- "Contact your hosting provider for more information"
- "Site esta fora do ar"
- "Nao carrega" / "nao abre" / "pagina em branco"
- "404 not found" / "502 bad gateway" / "503 service unavailable"
- "Erro no servidor"

QUANDO RECONHECER UM DESSES SINAIS, NAO FORNECA LINK NEM SENHA. Responda:

Olá, tudo bem? Abençoado dia!

Identifiquei que o erro que você está vendo indica que nossa área de membros está temporariamente fora do ar — trata-se de uma instabilidade do nosso servidor de hospedagem, e não de um problema com o seu acesso.

Nossa equipe técnica já foi notificada e está trabalhando para restabelecer o acesso o mais rápido possível.

Pedimos que, por gentileza, aguarde alguns minutos e tente acessar novamente. Se o erro persistir, não se preocupe — assim que o serviço for restabelecido, você conseguirá acessar normalmente com suas credenciais.

Agradecemos a paciência.

Atenciosamente,
Time Bethel Educação`,
  },
]

async function main() {
  console.log(`Inserindo ${respostas.length} artigo(s) sobre site fora do ar...`)

  const titles = respostas.map(r => r.title)
  const { error: delErr } = await supabase.from('knowledge_base').delete().in('title', titles)
  if (delErr) console.warn('Aviso delete:', delErr.message)

  for (const r of respostas) {
    const embedInput = `${r.title}\n${r.keywords}\n${r.content}`
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embedInput,
    })
    const { error } = await supabase.from('knowledge_base').insert({
      title: r.title,
      content: r.content,
      category: r.category,
      embedding: emb.data[0].embedding,
      is_active: true,
    })
    if (error) console.error(`Falha ${r.title}:`, error.message)
    else console.log(`  ✓ ${r.title}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
