/**
 * Seed: importa respostas prontas como artigos na knowledge_base com embeddings.
 * Uso: npx tsx scripts/seed-respostas-prontas.ts
 */
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import 'dotenv/config'

// Carrega .env.vercel se existir (prioriza sobre .env)
const envVercelPath = path.resolve(process.cwd(), '.env.vercel')
if (fs.existsSync(envVercelPath)) {
  const content = fs.readFileSync(envVercelPath, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiKey = process.env.OPENAI_API_KEY

if (!url || !key || !openaiKey) {
  console.error('Faltam envs: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)
const openai = new OpenAI({ apiKey: openaiKey })

interface Resposta {
  title: string
  content: string
  category: string
  keywords: string
}

// 8 respostas prontas + 2 adicionais para cobrir casos comuns
const respostas: Resposta[] = [
  {
    title: 'Confirmação de Reembolso',
    category: 'Pagamento e Reembolso',
    keywords: 'reembolso confirmado processado aguardar prazo 7 dias uteis estorno',
    content: `Quando o reembolso já foi processado pela plataforma:

Olá, tudo bem? Abençoado dia!

Seu reembolso foi feito, a plataforma tem um prazo de até 7 dias úteis. Agora é só aguardar, combinado?

Tenha um ótimo e abençoado dia!

Atenciosamente,
Time Bethel Educação`,
  },
  {
    title: 'Informações de Acesso - Implementação Cleiton',
    category: 'Acesso e Login',
    keywords: 'acesso login senha cleiton implementacao area membros nao entro nao recebi',
    content: `Para clientes que compraram Implementação Cleiton e precisam do link de acesso:

Olá, tudo bem? Abençoado dia!

Para acessar basta clicar no link abaixo:

https://cleitonquerobin1.com.br

E utilizar o seguinte login:

E-mail: (é o mesmo e-mail que você utilizou no momento da compra)
Senha: performance123

Atenciosamente,
Time Cleiton Querobin`,
  },
  {
    title: 'Informações de Acesso - Implementação Julia',
    category: 'Acesso e Login',
    keywords: 'acesso login senha julia ottoni implementacao ia inteligencia artificial',
    content: `Para clientes que compraram produtos da Julia Ottoni (Implementação IA, Reels Magnéticos, Método Posicionamento Milionário, Teste dos Arquétipos):

Olá, tudo bem? Abençoado dia!

Para acessar basta clicar no link abaixo:

Link de acesso: https://juliaacademy.com.br/
Login: (é o mesmo e-mail que você utilizou no momento da compra)
Senha: ottoni123

Atenciosamente,
Time Bethel Educação`,
  },
  {
    title: 'Informações de Acesso - 50 Scripts',
    category: 'Acesso e Login',
    keywords: 'acesso login senha 50 scripts cleiton prontos whatsapp',
    content: `Para clientes que compraram 50 Scripts Prontos para o WhatsApp:

Olá, tudo bem? Abençoado dia!

Você pode estar acessando no seguinte link:

https://50scripts.cleitonquerobin.com.br/
Login: seu e-mail de compra
Senha: performance123

Atenciosamente,
Time Bethel Educação`,
  },
  {
    title: 'Pedido de Dados Para Verificação',
    category: 'Outros',
    keywords: 'pedir dados nome email cpf nao encontrei compra verificar identificacao',
    content: `Quando a Sofia não encontra o cliente com os dados iniciais e precisa de informações adicionais para buscar a compra em outras plataformas:

Olá, tudo bem? Abençoado dia!

Por gentileza, poderia enviar o nome completo, e-mail de compra e CPF?`,
  },
  {
    title: 'Reembolso via Hotmart',
    category: 'Pagamento e Reembolso',
    keywords: 'reembolso hotmart solicitar plataforma 7 dias link como pedir',
    content: `Quando o cliente solicita reembolso e a compra foi feita via Hotmart (dentro do prazo de 7 dias):

Olá, tudo bem? Abençoado dia!

A solicitação do reembolso deve ocorrer diretamente nas plataformas a qual você realizou aquisição dos produtos. O prazo é de até 07 dias após a data da compra.

Sua compra foi feita através da plataforma Hotmart, logo, o reembolso deve ser solicitado via esse link: https://help.hotmart.com/pt-br/article/360061973392/como-solicitar-o-reembolso-da-minha-compra

Atenciosamente,
Time Bethel Educação`,
  },
  {
    title: 'Reembolso via PagTrust',
    category: 'Pagamento e Reembolso',
    keywords: 'reembolso pagtrust solicitar plataforma 7 dias link como pedir',
    content: `Quando o cliente solicita reembolso e a compra foi feita via PagTrust (dentro do prazo de 7 dias):

Olá, tudo bem? Abençoado dia!

A solicitação do reembolso deve ocorrer diretamente nas plataformas a qual você realizou aquisição dos produtos. O prazo é de até 07 dias após a data da compra.

Sua compra foi feita através da plataforma PagTrust, logo, o reembolso deve ser solicitado via esse link: https://dashboard.pagtrust.com.br/reembolso.html

Atenciosamente,
Time Bethel Educação`,
  },
  {
    title: 'Suporte Técnico Nextrack IA',
    category: 'Uso do Produto',
    keywords: 'nextrack nextia ia agente configuracao nao funciona whatsapp bug tecnico',
    content: `Quando o cliente reporta problema técnico com a ferramenta Nextrack IA (agente de WhatsApp que acompanha a Implementação de IA) — Sofia NÃO resolve bugs técnicos desta ferramenta:

Olá, tudo bem? Abençoado dia!

Nesse caso, por gentileza, poderia entrar em contato com o suporte específico da IA?

Segue o contato abaixo (WhatsApp):

+55 11 94605-4203

Atenciosamente,
Time Bethel Educação`,
  },
  {
    title: 'Reembolso fora do prazo',
    category: 'Pagamento e Reembolso',
    keywords: 'reembolso fora prazo mais de 7 dias negado politica nao elegivel',
    content: `Quando o cliente solicita reembolso mas já passou do prazo de 7 dias da compra:

Olá, tudo bem? Abençoado dia!

Pela nossa política (alinhada com Código de Defesa do Consumidor e regras das plataformas Hotmart/PagTrust), o prazo de reembolso é de até 07 dias após a data da compra.

Infelizmente, como sua compra foi realizada há mais de 7 dias, não é mais possível solicitar o reembolso automático. Se deseja uma revisão especial do seu caso, por favor descreva em detalhe o motivo que fica a nosso critério avaliação.

Atenciosamente,
Time Bethel Educação`,
  },
  {
    title: 'Política geral de reembolso',
    category: 'Pagamento e Reembolso',
    keywords: 'politica reembolso garantia 7 dias como funciona direito consumidor',
    content: `Para perguntas gerais sobre a política de reembolso:

Olá, tudo bem? Abençoado dia!

Nossa política de reembolso segue o Código de Defesa do Consumidor: você tem até 07 dias corridos após a data da compra para solicitar o reembolso integral, sem necessidade de justificativa.

A solicitação deve ser feita diretamente na plataforma onde você realizou a compra:
• Hotmart: https://help.hotmart.com/pt-br/article/360061973392/como-solicitar-o-reembolso-da-minha-compra
• PagTrust: https://dashboard.pagtrust.com.br/reembolso.html

Após a solicitação, o estorno leva até 7 dias úteis para ser processado pela operadora do seu cartão.

Atenciosamente,
Time Bethel Educação`,
  },
]

async function main() {
  console.log(`Gerando embeddings para ${respostas.length} respostas prontas...`)

  // Limpar imports anteriores (identifica pelo prefixo do título ou re-roda idempotente)
  const titles = respostas.map(r => r.title)
  const { error: delErr } = await supabase
    .from('knowledge_base')
    .delete()
    .in('title', titles)
  if (delErr) console.warn('Aviso ao limpar:', delErr.message)

  let inserted = 0
  for (const r of respostas) {
    // Texto para embedding combina title + keywords + content
    const embedInput = `${r.title}\n${r.keywords}\n${r.content}`

    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embedInput,
    })
    const embedding = emb.data[0].embedding

    const { error } = await supabase.from('knowledge_base').insert({
      title: r.title,
      content: r.content,
      category: r.category,
      embedding,
      is_active: true,
    })

    if (error) {
      console.error(`Falha em "${r.title}":`, error.message)
      continue
    }
    inserted++
    console.log(`  ✓ ${r.title}`)
  }

  console.log(`\nTotal inserido: ${inserted}/${respostas.length}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
