// VERIFICAÇÃO MEDIDA da augmentação — read-only (só OpenAI, nenhum write).
// Prod embeda `${title}\n\n${content}`. Aqui embeda o título+content AUGMENTADO e
// faz cosine vs embed("[Produto: X] <pergunta do cliente>"). Prevê a similaridade pós-deploy.
import fs from 'fs'
const env = fs.readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8')
const get = k => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null }
const OK = get('OPENAI_API_KEY')
const THRESH = 0.6
async function embed(text) {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + OK },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  })
  const j = await r.json(); if (!r.ok) throw new Error('OpenAI ' + r.status)
  return j.data[0].embedding
}
const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] } return d / (Math.sqrt(na) * Math.sqrt(nb)) }

// ---- ALVOS: title + content ORIGINAL (fiel) + bloco AUGMENTADO (wording do cliente, L034-safe, sem veneno "7 dias") ----
const AUG = {
  P1a: {
    title: 'Teste dos Arquétipos — como acessar, refazer e troubleshooting',
    query: '[Produto: Teste dos Arquetipos] não consigo realizar o teste com o meu e-mail e a senha padrão',
    base: `# Teste dos Arquétipos — acesso e troubleshooting\n\n## Quando aplica\nCliente pergunta sobre o Teste dos Arquétipos (produto pago da Julia Ottoni).\n\n## Playbook\n1. Acesso é pela área de membros da Julia Academy: https://juliaacademy.com.br/ — login: e-mail da compra, senha padrão ottoni123.\n2. Senha errada/não entra: usar ottoni123 com o e-mail da compra; se não funcionar, clicar em "Esqueci minha senha"; se ainda assim não entrar, abrir ticket.\n3. Resultado do teste: exibido na tela ao final; não é enviado por e-mail; se fechou a página, refazer.\n4. Cliente confundiu com outro produto: confirmar o nome e rotear pra área correta.`,
    add: `\n\n## Frases comuns do cliente (mesmo problema, outras palavras)\n- "não consigo realizar o teste com o meu e-mail e a senha padrão"\n- "comprei o teste de arquétipos e a senha não está entrando"\n- "não consigo fazer o teste, não entra com meu e-mail e a senha padrão"\nResposta: o Teste dos Arquétipos abre pela área de membros da Julia Academy (https://juliaacademy.com.br/) com o e-mail exato da compra e a senha padrão ottoni123. Se a senha padrão não entra, confirme que está usando o mesmo e-mail da compra e clique em "Esqueci minha senha" para redefinir; persistindo, abra um ticket.`,
  },
  P2b: {
    title: 'Não encontrei meu produto na área de membros',
    query: '[Produto: Teste dos Arquetipos] comprei o produto e nos meus produtos está trancado',
    base: `Se você não encontra seu produto na área de membros, siga estes passos:\n1. Confirme que está logado com o e-mail correto (o mesmo usado na compra)\n2. Verifique se está na plataforma certa: Julia Ottoni https://juliaacademy.com.br/ ; Cleiton https://cleitonquerobin1.com.br/area-de-membros/ ; 50 Scripts https://50scripts.cleitonquerobin.com.br/\n3. Aguarde a liberação após a confirmação do pagamento\nSe persistir, abra um ticket com nome, e-mail da compra, nome do produto.`,
    add: `\n\nMeu produto ou minhas aulas aparecem bloqueados / trancados / com cadeado na área de membros:\nSe você está logado mas vê o produto, módulo ou as aulas como "bloqueado", "trancado" ou com cadeado:\n1. Confirme que entrou com o e-mail EXATO da compra — muita gente tem mais de um e-mail.\n2. Verifique se está tentando acessar o mesmo produto que comprou — produtos diferentes ficam em áreas e endereços diferentes.\n3. Se comprou há poucos minutos, aguarde a liberação e atualize a página.\nSe o produto continuar trancado ou as aulas bloqueadas, abra um ticket com o e-mail da compra, o nome do produto e um print da tela bloqueada.`,
  },
  P3: {
    title: 'Teste dos Arquétipos - Informações e FAQ',
    query: '[Produto: Teste dos Arquetipos] não recebi o resultado do meu teste em PDF',
    base: `O que é? O Teste dos Arquétipos é uma ferramenta da Julia Ottoni para identificar os arquétipos de marca; é simples, rápido e online, e ao final você recebe um diagnóstico com os três arquétipos dominantes.\nPara que serve? Construir uma marca mais autêntica.\nAcesso: produto pago da Julia Ottoni, acessado pela área de membros da Julia Academy (https://juliaacademy.com.br/), login pelo e-mail da compra e senha padrão ottoni123.\nRecebo o resultado na hora? Sim. Após responder o teste, o resultado é gerado na hora, mas não fica salvo. Por isso é muito importante anotar ou tirar um print da tela.`,
    add: `\n\nNão recebi o resultado do teste em PDF nem por e-mail. Como vejo o resultado?\nO resultado do Teste dos Arquétipos não é enviado em PDF nem por e-mail — ele aparece na tela, na hora, ao final do teste. Não existe um arquivo PDF para baixar. Por isso é importante anotar os três arquétipos ou tirar um print da tela assim que o resultado aparecer. Se você fechou a página antes de salvar, é só refazer o teste pela área de membros da Julia Academy (https://juliaacademy.com.br/) e tirar o print do novo resultado.`,
  },
  P4: {
    title: 'Implementação da Ferramenta de Inteligência Artificial - Informações e FAQ',
    query: '[Produto: Implementacao da Ferramenta de Inteligencia Artificial] pensei que viria algum aplicativo de instalação e execução imediata',
    base: `O que é? Uma implementação de IA personalizada, com aulas práticas para automatizar atendimento, vendas e qualificação de leads no WhatsApp; inclui passo a passo e acesso à ferramenta Nextrack IA.\nPara que serve? Você adquire a implementação, recebe acesso a uma área de membros com passo a passo; em 30 minutos conecta a IA ao seu WhatsApp.\nAcesso à área de membros: https://cleitonquerobin1.com.br/area-de-membros/ — login: e-mail da compra, senha performance123.\nPreciso saber programar? Não. O passo a passo é simples, cerca de 30 minutos.`,
    add: `\n\nEsperava um aplicativo para instalar — onde baixo o app da Implementação IA?\nA Implementação IA não é um aplicativo para baixar ou instalar e não vem nenhum instalador ou programa de execução imediata. É acessada 100% online pela área de membros do Cleiton (https://cleitonquerobin1.com.br/area-de-membros/), com o e-mail da compra e a senha performance123. Dentro da área de membros você encontra o passo a passo em vídeo para conectar a ferramenta ao seu WhatsApp — não há nada para instalar no computador ou no celular; é tudo pelo navegador.`,
  },
}

console.log('threshold de corte:', THRESH, '\n')
for (const [id, a] of Object.entries(AUG)) {
  const qE = await embed(a.query)
  const beforeE = await embed(`${a.title}\n\n${a.base}`)
  const afterE = await embed(`${a.title}\n\n${a.base}${a.add}`)
  const before = cos(qE, beforeE), after = cos(qE, afterE)
  const flag = after >= THRESH ? '✅ PASSA' : '❌ ainda abaixo'
  console.log(`[${id}] "${a.query.replace(/\[Produto:[^\]]+\]\s*/, '').slice(0, 50)}"`)
  console.log(`   antes(base)=${before.toFixed(3)}  →  depois(augmentado)=${after.toFixed(3)}  ${flag}\n`)
}
