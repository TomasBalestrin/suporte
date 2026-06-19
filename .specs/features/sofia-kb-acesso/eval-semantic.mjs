#!/usr/bin/env node

/**
 * eval-semantic.mjs
 *
 * Avalia se os artigos novos (P1-P5) batem com os "wording-alvo" do cliente
 * usando embeddings OpenAI text-embedding-3-small.
 *
 * Roda LOCAL (read-only) — sem escrever no banco.
 * Computa cosine similarity vs threshold 0.6.
 *
 * Uso: node eval-semantic.mjs
 *
 * Exige: .env.local com OPENAI_API_KEY
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env.local está na raiz do projeto
const envPath = path.resolve(__dirname, '../../../.env.local');

// Carregar OPENAI_API_KEY de .env.local
if (!fs.existsSync(envPath)) {
  console.error(`❌ Arquivo .env.local não encontrado em ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
if (!apiKeyMatch) {
  console.error('❌ OPENAI_API_KEY não encontrada em .env.local');
  process.exit(1);
}

const OPENAI_API_KEY = apiKeyMatch[1].trim();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Definição dos artigos e seus wording-alvo
const articlesData = [
  {
    id: 'P1',
    title: 'Senha padrão não entra no primeiro acesso',
    content: `Se você não conseguiu fazer login com a senha padrão do seu produto na primeira vez, siga estes passos:

PASSO 1: Confirme o e-mail exato da compra
- A conta é criada automática e imediata na plataforma após a compra.
- Verifique qual e-mail você utilizou na compra: pode ter digitado errado ou usado um diferente na hora da compra.
- Se comprou pelo celular, às vezes o autocomplete da senha enche o e-mail de forma incorreta.

PASSO 2: Use a senha padrão correta do seu produto
- Julia Ottoni: ottoni123
- Cleiton Querobin: performance123
- 50 Scripts: Script@123
- Couply: 12345678

Dica: copie a senha (não digite) para evitar erros.

PASSO 3: Se a senha ainda não funciona, redefina pelo portal
- Clique em "Esqueci a senha" na tela de login.
- Insira o e-mail exato da compra.
- Siga as instruções no e-mail de reset.
- Crie uma nova senha que você consiga lembrar.

Se depois de fazer reset a senha ainda não entra:
Abra um ticket de atendimento com:
- E-mail exato da compra
- Nome do produto
- Comprovante de compra (screenshot ou e-mail da compra)

Nosso time vai verificar se houve algum problema na criação da conta.`,
    wordings: [
      'a senha padrão não entra',
      'e-mail e senha padrão não funcionam',
      'a senha não está entrando'
    ]
  },
  {
    id: 'P2',
    title: 'Produto ou aulas aparecem bloqueados dentro da área de membros',
    content: `Se você conseguiu entrar na área de membros, mas está vendo "Bloqueado", "Acesso restrito" ou o conteúdo não está visível, pode ser uma de 3 causas:

CAUSA 1: Progressão de módulo — você precisa concluir os passos anteriores
Alguns produtos liberam conteúdo progressivamente à medida que você avança.
- Solução: Verifique se há módulos ou aulas anteriores que você não completou.
- Se sim, conclua primeiro — o próximo vai desbloquear automaticamente.
- Se não, vá para a Causa 2.

CAUSA 2: Você comprou um produto diferente do que está tentando acessar
Exemplo: você comprou "50 Scripts", mas está tentando acessar "50 Modelos de Conteúdo".
- Solução: Verifique qual produto de fato está vinculado à sua conta.
- Se comprou pelo smartphone e usou outro e-mail sem perceber, pode estar entrando com a conta errada.
- Procure o e-mail de compra original na sua caixa de entrada ou spam.
- Se descobrir que é outro e-mail, faça login com aquele.

CAUSA 3: Sua compra ainda está sendo processada
Embora raramente (a conta é criada em segundos), se você comprou há poucos minutos, aguarde alguns minutos e tente novamente.
- Se comprou há mais de 1 hora e ainda não desbloqueia, vá para o Passo 4.

PASSO 4: Se nenhuma das causas acima, abra um ticket com:
- E-mail da compra
- Nome do produto que está bloqueado
- Screenshot da tela bloqueada

Nosso time vai liberar manualmente se houver algum problema no sistema.`,
    wordings: [
      'está trancado nos meus produtos',
      'acesso a plataforma mas não todas as aulas'
    ]
  },
  {
    id: 'P3',
    title: 'Resultado do Teste dos Arquetipos — onde ver e como refazer se expirou',
    content: `Onde o resultado do teste aparece?
O resultado do Teste dos Arquetipos aparece na tela do navegador quando você termina de responder as 12 perguntas. Não é enviado por e-mail, PDF ou outro formato — só na tela.

Isso é normal?
Sim. O teste é acessado online direto no navegador (https://juliaottoni.com/teste-dos-arquetipos/) e o resultado é exibido na hora, na mesma página.

Como não perdi o resultado?
- Assim que terminar o teste, tire um print da tela (Print Screen ou Cmd+A no Mac) para salvar.
- Ou anote os 3 arquetipos que aparecem (são sempre 3 únicos para você).
- Copie o texto inteiro e cole em um arquivo Word ou Google Docs.

E se fechar a página antes de anotar?
Não se preocupe — você pode refazer o teste quantas vezes quiser. Acesse novamente a URL https://juliaottoni.com/teste-dos-arquetipos/ e passe pela perguntas de novo. O resultado pode variar ligeiramente (geralmente 2 arquetipos se repetem e 1 muda), então tire print novamente.

Qual o link certo do teste?
https://juliaottoni.com/teste-dos-arquetipos/

Obs.: Não confunda com o acesso à área de membros (https://juliaacademy.com.br/) — o teste é uma página separada.

Quanto tempo o resultado fica válido?
A página pode expirar dependendo do navegador e cachê, mas você pode refazer sempre. Não há limite de vezes que você pode rodar o teste.`,
    wordings: [
      'não recebi o resultado em PDF',
      'não recebi o resultado do teste'
    ]
  },
  {
    id: 'P4',
    title: 'Implementação IA é acessada pela área de membros — não é um app para instalar',
    content: `O que é Implementação IA?
Implementação IA é uma ferramenta de inteligência artificial para automatizar o atendimento no seu WhatsApp, acessada 100% online pela área de membros do Cleiton Querobin.

NÃO é um aplicativo para baixar, instalar ou desinstalar. É tudo pelo navegador.

Como acessar Implementação IA:
1. Acesse a área de membros do Cleiton: https://cleitonquerobin1.com.br/area-de-membros/
2. Faça login com:
   - E-mail: o e-mail que você usou na compra
   - Senha: performance123
3. Dentro da área de membros, procure pela aula/módulo "Implementação da Ferramenta de Inteligência Artificial"
4. Clique na aula e siga o passo a passo para configurar a IA no seu WhatsApp

E se não consigo entrar na área de membros?
Siga o artigo "Senha padrão não entra no primeiro acesso".

O que preciso fazer depois de acessar?
O passo a passo (dentro da aula) mostra como conectar a IA ao seu WhatsApp em aproximadamente 30 minutos. Depois disso, a IA começa a responder seus clientes automaticamente, 24h por dia.

Tem teste gratuito?
Sim. Quando você configura a IA, você ganha 7 dias totalmente grátis. Depois desse período, há uma assinatura mensal (valores no passo a passo dentro da aula).

E se o link não abre ou diz "página não encontrada"?
Verifique se você está logado na área de membros corretamente. Às vezes, a sessão expira. Tente fazer logout (sair), limpar o cache do navegador e entrar novamente.`,
    wordings: [
      'esperava um aplicativo',
      'cadê o instalador',
      'implementação cleiton acesso'
    ]
  },
  {
    id: 'P5',
    title: 'Link do Teste dos Arquetipos não abre ou diz "página não encontrada"',
    content: `Qual é o link certo do Teste dos Arquetipos?
https://juliaottoni.com/teste-dos-arquetipos/

Diferença entre acesso ao produto e acesso ao teste:
- Para acessar a ÁREA DE MEMBROS (aulas, material, modelos) = https://juliaacademy.com.br/
  Precisa de login (e-mail da compra + senha ottoni123)
- Para rodar o TESTE DOS ARQUETIPOS = https://juliaottoni.com/teste-dos-arquetipos/
  Não precisa de login
  Funciona direto no navegador
  Resultado aparece na tela imediatamente após responder as perguntas

Se o teste não abre ou diz "página não encontrada":
1. Verifique se você digitou exatamente: https://juliaottoni.com/teste-dos-arquetipos/
   - Não há /login/, /admin/ ou outras variações
2. Limpe o cache do navegador:
   - Chrome: Ctrl+Shift+Delete (ou Cmd+Shift+Delete no Mac)
   - Selecione "Imagens e arquivos em cache"
   - Clique "Limpar dados"
3. Tente em outro navegador (Firefox, Edge, Safari) para descartar problema local
4. Verifique sua conexão de internet — às vezes páginas não carregam por conectividade
5. Desabilite extensões do navegador que podem bloquear conteúdo (adblocker, VPN)

Ainda não funciona?
Abra um ticket de atendimento e nos avise. Pode ser um problema temporário no servidor do teste.`,
    wordings: [
      'clico no link e diz que a página não existe',
      'não consigo fazer o teste'
    ]
  }
];

/**
 * Computa cosine similarity entre dois vetores
 */
function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

/**
 * Main evaluation loop
 */
async function evaluate() {
  console.log('\n🧪 eval-semantic.mjs — Avaliação semântica de artigos KB\n');
  console.log('📊 Modelo: text-embedding-3-small (1536 dim)');
  console.log('📊 Threshold: 0.6 (confidence_threshold padrão)\n');

  const results = [];
  const THRESHOLD = 0.6;

  try {
    for (const article of articlesData) {
      console.log(`\n⏳ Processando artigo: ${article.id} — "${article.title}"\n`);

      // Gera embedding para o artigo (title + content)
      const articleText = `${article.title}\n\n${article.content}`;
      const articleEmbedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: articleText,
      });
      const articleVec = articleEmbedding.data[0].embedding;

      // Para cada wording-alvo, computa similarity
      for (const wording of article.wordings) {
        const wordingEmbedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: wording,
        });
        const wordingVec = wordingEmbedding.data[0].embedding;

        const similarity = cosineSimilarity(articleVec, wordingVec);
        const pass = similarity >= THRESHOLD;

        results.push({
          articleId: article.id,
          articleTitle: article.title,
          wording,
          similarity: similarity.toFixed(4),
          pass
        });

        const status = pass ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${status} | "${wording}"`);
        console.log(`       → cosine = ${similarity.toFixed(4)} (threshold: ${THRESHOLD})`);
      }
    }

    // Tabela resumida
    console.log('\n\n📋 Tabela de Resultados\n');
    console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ Artigo │ Wording-alvo              │ Cosine  │ Status │ Pass/Fail         │');
    console.log('├─────────────────────────────────────────────────────────────────────────────┤');

    for (const r of results) {
      const wordingTrunc = r.wording.length > 25 ? r.wording.substring(0, 22) + '...' : r.wording;
      const status = r.pass ? '✅ PASS' : '❌ FAIL';
      const paddedWording = wordingTrunc.padEnd(25);
      const paddedCosine = r.similarity.padStart(6);
      const paddedStatus = status.padEnd(16);
      console.log(`│ ${r.articleId}     │ ${paddedWording} │ ${paddedCosine} │  ${paddedStatus} │`);
    }
    console.log('└─────────────────────────────────────────────────────────────────────────────┘');

    // Sumário
    const totalTests = results.length;
    const passCount = results.filter(r => r.pass).length;
    const passRate = ((passCount / totalTests) * 100).toFixed(1);

    console.log(`\n📊 Resumo:`);
    console.log(`   Total: ${totalTests} tests`);
    console.log(`   ✅ PASS: ${passCount}`);
    console.log(`   ❌ FAIL: ${totalTests - passCount}`);
    console.log(`   Taxa de sucesso: ${passRate}%\n`);

    // Verdict
    if (passCount === totalTests) {
      console.log('✅ VERDICT: TODOS OS ARTIGOS BATEM COM O WORDING-ALVO. Pronto para deploy.\n');
      process.exit(0);
    } else {
      console.log('⚠️  VERDICT: ALGUNS ARTIGOS NÃO BATERAM. Revisar conteúdo antes de deploy.\n');
      console.log('Sugestão: aumentar a relevância das palavras-chave no texto do artigo.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Erro durante avaliação:', error.message);
    process.exit(1);
  }
}

// Run
evaluate();
