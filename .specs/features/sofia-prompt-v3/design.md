# Design: sofia-prompt-v3

**Status**: design  
**Owner**: frenchie (design) → kimiko (execute) → starlight (review) → hughie (UAT) → butcher (merge)  
**Designed**: 2026-04-29

---

## Resumo executivo

O v3 corrige cinco comportamentos patológicos documentados em 413 respostas reais, com ênfase absoluta em zero alucinação financeira. A abordagem é: reescrever o `system_prompt` removendo a seção de tools morta e adicionando fast-paths explícitos para intent crítica; ajustar `temperature` de 0.8 para 0.2 e `confidence_threshold` de 0.4 para 0.6; e corrigir dois artigos da `knowledge_base` que são a origem rastreada da alucinação de "7 dias de teste grátis" e "assinatura mensal". O risco principal é regressão em fluxos que hoje funcionam (acesso, reembolso, site fora do ar) — mitigado pelo rollback documentado em `prompt-backup.md` e monitoramento SQL nas primeiras 48h.

---

## Auditoria da knowledge_base

### Resultado das queries

Total de artigos na KB: **~110** (incluindo duplicatas — a KB tem muitos artigos duplicados por título, dois IDs diferentes com conteúdo idêntico).

### Artigos suspeitos encontrados (causa-raiz confirmada)

**ARTIGO CRÍTICO — origem da alucinação de "7 dias"**

Dois artigos com título idêntico e conteúdo idêntico (duplicata):
- ID `f50e70a2-62df-428e-a914-9dcd793f4db3` (usage_count: 47, usado em 2026-04-29 11:46)
- ID `053bb8d0-6ad1-43a9-8bd8-83c0b0bd097c` (usage_count: 46, usado em 2026-04-29 11:46)

Título: **"Implementação da Ferramenta de Inteligência Artificial - Informações e FAQ"**

Trechos problemáticos confirmados:
```
"uma ferramenta com 7 dias de teste grátis"
"A ferramenta de IA tem 7 dias de teste grátis. Após o teste, há uma assinatura mensal para continuar usando."
"O que você adquiriu por R$29,90 foi a implementação de IA personalizada [...] por período de teste de 7 dias."
"O acesso ao plano mensal só é cobrado depois do período de teste gratuito."
"Nos primeiros 7 dias você usa a IA totalmente de graça. A assinatura só começa se você quiser continuar depois."
```

**Diagnóstico**: esses artigos descrevem a ferramenta de IA de terceiros (Nextrack) que acompanha o produto Implementação IA Cleiton — não a Bethel. O conteúdo é tecnicamente correto para o produto, mas ao ser injetado no contexto RAG da Sofia em qualquer pergunta sobre IA ou acesso, o modelo usa essas frases como base para inventar que a Sofia/Bethel opera com "7 dias de teste gratuito" para outros produtos ou para o próprio suporte. A alucinação documentada em 2026-04-29 (cliente perguntou sobre CRM) é consequência direta desse artigo sendo recuperado por similaridade semântica.

**Proposta de correção**: remover os trechos financeiros do corpo principal do artigo (o que pertence ao contexto do produto Nextrack, não ao suporte Bethel) e adicionar um aviso explícito que esse é um produto de terceiro. Ver SQL proposto abaixo.

---

**Artigos com "7 dias" legítimos (NÃO são problema)**

Os seguintes artigos contêm "7 dias" no contexto correto de **prazo de garantia de reembolso** (CDC) — são informativamente corretos e não devem ser alterados:
- "Quero solicitar reembolso, como faço" (IDs `9926e523`, `8b6d133a`)
- "Garantia e reembolso - como funciona" (IDs `3e880a04`, `c52c863c`)
- "Política geral de reembolso" (ID `6d390644`)
- "Reembolso via Hotmart" (ID `753e2d71`)
- "Reembolso via PagTrust" (ID `50515f85`)
- "Como solicitar reembolso de compra via Hotmart" (ID `7030a1b1`)
- "Como solicitar reembolso de compra via PagTrust" (ID `f5f968ee`)
- "Confirmacao de reembolso processado" (ID `7f34dd9a`)
- "Confirmação de Reembolso" (ID `495bfe54`)
- "Reembolso fora do prazo" (ID `30cbbff0`)

Esses artigos são contexto de reembolso, não de subscrição/assinatura. O modelo sabe distinguir quando o prompt está bem calibrado.

**Artigos com "Plano Prático: 7 Dias para Lotar a Sua Agenda"** (IDs `87b1ad8b`, `4248ea46`): é um nome de produto, não financeiro. OK.

---

**Artigos com contaminação de tom (Abençoado + Atenciosamente)**

Onze artigos têm "Abençoado dia" e "Atenciosamente, Time Bethel Educação" literalmente no corpo do conteúdo — são artigos que foram criados como templates de resposta humana e foram inseridos na KB para a Sofia copiar. Isso explica os 110/413 "Abençoado dia" e 47/413 "Atenciosamente" medidos. Os principais (por usage_count alto):

| ID | Título | usage_count |
|---|---|---|
| `05d496c9` | Informações de Acesso - Implementação Julia | 103 |
| `661df800` | Informações de Acesso - Implementação Cleiton | 86 |
| `ac20abca` | Informações de Acesso - 50 Scripts | 69 |
| `e89e8091` | Pedido de Dados Para Verificação | 54 |
| `6d390644` | Política geral de reembolso | 17 |
| `753e2d71` | Reembolso via Hotmart | 25 |
| `50515f85` | Reembolso via PagTrust | 22 |
| `30cbbff0` | Reembolso fora do prazo | 13 |
| `495bfe54` | Confirmação de Reembolso | 33 |
| `3a3dc67c` | Area de Membros Fora do Ar — Site Suspenso | 28 |
| `42d03906` | Suporte Técnico Nextrack IA | 38 |

**Proposta de correção**: remover "Olá, tudo bem? Abençoado dia!" e "Atenciosamente, Time Bethel Educação" do conteúdo de todos esses artigos. O tom deve ser instrução para a Sofia, não script humano copiado. Artigos de KB devem descrever *o que fazer*, não como o humano respondeu. Com `temperature=0.2` e o novo prompt proibindo assinatura, isso é mitigado parcialmente; mas limpar a KB elimina o sinal de contaminação na fonte.

**Prioridade**: ALTA para os artigos de acesso (usage_count 50+). MÉDIA para os de reembolso. A limpeza entra no escopo desta feature como task atômica da Kimiko.

---

**Artigo "período de teste" legítimo (IA do produto)**

O artigo "Implementação da Ferramenta de Inteligência Artificial" descreve corretamente que a ferramenta Nextrack tem 7 dias de teste. O problema não é o conteúdo em si — é que ele está sendo recuperado por RAG em perguntas que nada têm a ver com esse produto (ex: cliente perguntando sobre CRM). A solução não é deletar o artigo, mas reescrevê-lo para que o RAG o recupere apenas quando pertinente, e adicionar um aviso explícito de que isso se refere ao produto Nextrack de terceiro, não a um período de teste da Bethel.

---

### SQL proposto para Kimiko executar (fase Execute)

```sql
-- 1. Corrigir artigos da Implementação de IA (remover trechos de assinatura/trial financeiro)
-- Os dois IDs são duplicatas com conteúdo idêntico
UPDATE knowledge_base
SET content = '**O que é?**
É uma implementação de Inteligência Artificial personalizada, com aulas práticas para aplicar no seu negócio. Essa IA já vem pronta, com estrutura pensada para atendimento, vendas e qualificação de leads no WhatsApp.

Inclui: um passo a passo completo de como usar IA para automatizar o atendimento no WhatsApp; acesso à ferramenta Nextrack IA para conectar ao seu WhatsApp.

**Para que serve?**
Você adquire a implementação, recebe acesso a uma área de membros com um passo a passo super simples. Em 30 minutos, você conecta a IA ao seu WhatsApp. A partir daí, ela começa a responder seus clientes automaticamente, 24h por dia, de forma inteligente e personalizada.

**ATENÇÃO — Ferramenta Nextrack (produto de terceiro):**
A ferramenta de IA (Nextrack) é um serviço de terceiro que acompanha a implementação. Ela possui condições próprias de uso e cobrança definidas pelo fornecedor Nextrack — **não pela Bethel Educação**. Para dúvidas sobre planos, cobranças ou acesso à Nextrack, contate o suporte Nextrack diretamente: +55 11 94605-4203.

**Acesso à área de membros da implementação:**
- Acesse: https://cleitonquerobin1.com.br/area-de-membros/
- Login: Seu e-mail de compra
- Senha: performance123

**É adaptável a qualquer nicho?** Sim, mas funciona melhor em alguns processos de venda específicos no WhatsApp.

**Preciso saber programar?** Não. O passo a passo é simples e você consegue implementar em cerca de 30 minutos.

**A IA substitui completamente o atendimento humano?** Não. Ela automatiza a primeira etapa do atendimento e qualifica leads. Para situações mais complexas, o atendimento humano continua sendo importante.'
WHERE id IN ('f50e70a2-62df-428e-a914-9dcd793f4db3', '053bb8d0-6ad1-43a9-8bd8-83c0b0bd097c');

-- 2. Limpar "Abençoado dia" e assinaturas dos artigos de acesso de alto impacto
-- (Informações de Acesso - Implementação Julia)
UPDATE knowledge_base
SET content = 'Para clientes que compraram produtos da Julia Ottoni (Implementação IA, Reels Magnéticos, Método Posicionamento Milionário, Teste dos Arquétipos):

Link de acesso: https://juliaacademy.com.br/
Login: e-mail usado na compra
Senha: ottoni123'
WHERE id = '05d496c9-944f-4f1f-b1ae-8351d715a3fc';

-- (Informações de Acesso - Implementação Cleiton)
UPDATE knowledge_base
SET content = 'Para clientes que compraram Implementação Cleiton e precisam do link de acesso:

https://cleitonquerobin1.com.br

Login: e-mail usado na compra
Senha: performance123'
WHERE id = '661df800-16d8-4e8f-8cce-72d8a6fa1d0a';

-- (Informações de Acesso - 50 Scripts)
UPDATE knowledge_base
SET content = 'Para clientes que compraram 50 Scripts Prontos para o WhatsApp:

https://50scripts.cleitonquerobin.com.br/
Login: e-mail de compra
Senha: performance123'
WHERE id = 'ac20abca-83b4-4ae9-96bd-0b0a42021668';

-- (Pedido de Dados Para Verificação)
UPDATE knowledge_base
SET content = 'Quando a Sofia não encontra o cliente com os dados iniciais e precisa de informações adicionais:

Por gentileza, poderia enviar o nome completo, e-mail de compra e CPF?'
WHERE id = 'e89e8091-f444-4d56-b21a-0a5ad7dc0e01';
```

Os demais artigos (reembolso, site fora do ar, Nextrack) têm usage_count menor ou conteúdo mais complexo — Kimiko pode limpar em tarefa separada ou deixar para iteração posterior. O impacto maior está nos 4 artigos acima.

---

## Decisão sobre `[Produto: X]`

### Análise do código atual (route.ts:109-126)

O código em `src/app/api/ai/chat/route.ts` faz:
1. Recebe `product_id` do body do request (vem do form do portal `/suporte`)
2. Busca o nome do produto na tabela `products` por esse ID
3. Prefixa a pergunta do cliente com `[Produto: NomeDoProduto]`
4. Usa esse `enrichedQuestion` para gerar o embedding e buscar artigos na KB

O problema está na linha 117: `enrichedQuestion = '[Produto: ${product.name}] ${enrichedQuestion}'`. Isso concatena o produto na string que vai pro RAG — o modelo recebe tudo junto como "pergunta do cliente", sem distinção entre "produto do form" e "o que o cliente disse". Quando o cliente diz "comprei 50 Scripts" mas o form diz `[Produto: Julia Academy]`, o modelo vê a contradição mas não tem como diferenciar o que veio do form vs. do cliente.

### Opções avaliadas

**Opção A (só prompt)**: Adicionar instrução no prompt: "o prefixo `[Produto: X]` indica o produto registrado no formulário de abertura do chat — ignore-o se o cliente não mencionar produto algum; mencione a divergência apenas uma vez se o cliente mencionar produto diferente". Simples, sem mexer em código. **Risco**: o modelo com temperature 0.8 (atual) interpreta mal. Com temperature 0.2 o risco diminui bastante. Ainda assim, a injeção dentro da string de pergunta mistura sinais.

**Opção B (separar campos no código)**: Mudar a injeção para passar `formProduct` e `fluxonProduct` como campos distintos no `userContent` (não na pergunta em si). Mover o prefixo do `enrichedQuestion` para o `userContent`, de forma que o modelo veja explicitamente: "Contexto do formulário: produto X" + "Pergunta do cliente: [texto puro]". Mais limpo, o modelo raciocina sobre os dois campos separadamente.

**Opção C (injetar apenas quando mencionado)**: Detectar se o cliente mencionou produto na pergunta e só injetar então. Exige classificação leve ou regex — caro para o benefício marginal.

### Decisão: **Opção B**

Razão: com temperature 0.2, a Opção A provavelmente resolve 80% dos casos, mas a mistura de sinais na string de pergunta é um design ruim que vai criar edge cases. A Opção B é uma mudança cirúrgica de ~5 linhas no código que elimina a ambiguidade na fonte. O custo de implementação é mínimo e o ganho em previsibilidade é alto — especialmente para o caso documentado de loop de divergência (42 ocorrências, 10.2%).

### Diff de código para Kimiko (Opção B)

**Arquivo**: `src/app/api/ai/chat/route.ts`

**Antes** (linhas 109-126):
```typescript
// Build enriched question with product/category context
let enrichedQuestion = question
if (product_id) {
  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('id', product_id)
    .single()
  if (product) enrichedQuestion = `[Produto: ${product.name}] ${enrichedQuestion}`
}
if (category_id) {
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', category_id)
    .single()
  if (category) enrichedQuestion = `[Categoria: ${category.name}] ${enrichedQuestion}`
}
```

**Depois** (manter embedding com context, mas separar no userContent):
```typescript
// Build enriched question with product/category context
let enrichedQuestion = question
let formProductName: string | null = null
let formCategoryName: string | null = null

if (product_id) {
  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('id', product_id)
    .single()
  if (product) {
    formProductName = product.name
    // Ainda usa no embedding para busca RAG relevante ao produto
    enrichedQuestion = `[Produto: ${product.name}] ${enrichedQuestion}`
  }
}
if (category_id) {
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', category_id)
    .single()
  if (category) {
    formCategoryName = category.name
  }
}
```

**E nas linhas 185-190 (userContent)**, adicionar campo separado:
```typescript
const userContent = [
  formProductName ? `Contexto do formulário: cliente abriu o chat selecionando o produto "${formProductName}". Use essa informação para contextualizar, mas NÃO a mencione a não ser que o cliente mencione produto diferente.` : null,
  fluxonContext ? `Dados operacionais do cliente (Fluxon):\n${fluxonContext}` : null,
  `Artigos da base de conhecimento:\n${context}`,
  `Pergunta do cliente: ${question}`,
  'Responda de forma clara e objetiva com base nos dados acima.',
].filter(Boolean).join('\n\n')
```

Desta forma:
- O embedding ainda usa `enrichedQuestion` com o prefixo para encontrar artigos relevantes ao produto (bom para o RAG)
- O modelo vê a pergunta do cliente limpa, sem o prefixo misturado
- O contexto do produto do form vai em campo separado com instrução explícita de uso

---

## Estrutura do prompt v3 (esqueleto)

### Princípio de organização

LLMs prestam mais atenção ao topo e ao final do prompt. Regras críticas (anti-alucinação, escalação obrigatória) vão no topo como hard rules. Conteúdo de referência (credenciais, produtos) fica no meio. Regras de formato e tom ficam perto do final mas antes da seção NUNCA, que é o último bloco.

### Tamanho

Prompt atual: ~1400 tokens (estimativa baseada no conteúdo copiado).  
Meta v3: ~1100-1200 tokens. Removendo a seção TOOLS (morta, ~100 tokens) e condensando redundâncias, fica mais enxuto sem perder cobertura.

### Esqueleto comentado

```
## [IDENTIDADE — 2 linhas]
Quem é, o que faz. Sem floreio.

## [FAST-PATHS DE ESCALAÇÃO OBRIGATÓRIA — topo por prioridade máxima]
# Antes de qualquer consulta RAG, verificar se a pergunta bate em algum desses triggers:
- "quero humano" / "falar com pessoa" / "atendimento humano" → escalar imediatamente, sem etapa intermediária
- "golpe" / "fraude" / "Procon" / "processar" / "chargeback" → escalar, tom acolhedor
- 3+ reclamações do mesmo problema no mesmo chat → escalar
- Qualquer menção a valor de assinatura, período de teste, prazo de cobrança, desconto, promoção → escalar
  (NUNCA responder sobre isso — a Sofia não tem essa informação e não deve inventar)

## [ANTI-ALUCINAÇÃO — REGRAS INEGOCIÁVEIS]
# Segunda posição, logo após fast-paths — crítico ficar no topo
- NUNCA usar "verifiquei", "confirmei", "encontrei sua compra" sem dado Fluxon no contexto
- NUNCA inventar URL com sufixo numérico
- NUNCA mencionar teste gratuito, assinatura, prazo de cobrança, desconto, promoção
- Credenciais APENAS das 3 plataformas documentadas abaixo — nada mais

## [PRIORIDADE DE DADOS]
# Mantida do prompt atual, condensa em 4 linhas

## [PRODUTOS E CREDENCIAIS-PADRÃO]
# Mantido do prompt atual — 3 plataformas + Teste dos Arquétipos

## [COMPORTAMENTO COM PRODUTO DO FORMULÁRIO]
# Novo bloco — instrui sobre o contexto formProduct separado
- Se o contexto do formulário indicar produto X e o cliente não mencionar produto → ignore o contexto do form, responda direto
- Se o cliente mencionar produto Y diferente do form → levante UMA vez de forma educada, siga sem voltar ao assunto
- Se o cliente mencionar produto que bate com o form → responda sem comentar

## [REGRAS OPERACIONAIS]
# Versão condensada das "REGRAS CRÍTICAS" atuais (sem a 2 que vai para anti-alucinação)
- Não misturar credenciais entre produtores
- Dados já fornecidos não se pedem de novo
- Compra não localizada: estrutura em 4 passos (mantida)

## [SITE FORA DO AR]
# Mantido do prompt atual — esse fluxo funciona, não mudar

## [TOM E FORMATO]
# Atualizado: saudação APENAS na primeira mensagem, opcional. Regras de assinatura proibida explícita.
# Respostas curtas. Uma pergunta por vez. Sem loop de coleta de dados.

## [ESCALAÇÃO HUMANA — horário]
# Mantido, com adição: quando retornar requires_ticket: true, incluir UMA frase confirmando que o ticket foi aberto

## [PROIBIÇÕES ABSOLUTAS — final do prompt]
# Mantido + adição: nunca mencionar valores financeiros, nunca mencionar seção de tools
```

**Seções REMOVIDAS em relação ao prompt atual**:
- `## USO DE FERRAMENTAS (tools)` — inteiramente removida (decisão Hughie 2026-04-29)

**Seções ADICIONADAS**:
- `## FAST-PATHS DE ESCALAÇÃO OBRIGATÓRIA` (nova, no topo)
- `## COMPORTAMENTO COM PRODUTO DO FORMULÁRIO` (nova)
- Regra anti-alucinação financeira explícita na seção `## ANTI-ALUCINAÇÃO`

---

## Mudanças concretas a aplicar (lista para Kimiko)

### Código (src/)

1. **[route.ts] Separar `formProductName` do `enrichedQuestion` no `userContent`** — diff completo acima na seção "Decisão sobre `[Produto: X]`". Arquivo: `src/app/api/ai/chat/route.ts`. Linhas afetadas: 109-126 (variáveis) e 185-190 (userContent).

### ai_config (Supabase)

2. **[ai_config] Atualizar `temperature` de `0.8` para `0.2`**
   ```sql
   UPDATE ai_config SET config_value = '0.2' WHERE config_key = 'temperature';
   ```

3. **[ai_config] Atualizar `confidence_threshold` de `0.4` para `0.6`**
   ```sql
   UPDATE ai_config SET config_value = '0.6' WHERE config_key = 'confidence_threshold';
   ```

4. **[ai_config] Substituir `system_prompt`** — pelo novo prompt v3 conforme esqueleto acima. Kimiko escreve o texto completo baseado no esqueleto desta seção + casos de uso do spec.

### knowledge_base (Supabase)

5. **[KB] Corrigir artigos "Implementação da Ferramenta de Inteligência Artificial"** (IDs `f50e70a2` e `053bb8d0`) — remover trechos de trial/assinatura do corpo principal, adicionar aviso de que Nextrack é produto de terceiro. SQL completo na seção "Auditoria da knowledge_base".

6. **[KB] Limpar "Abençoado dia" + "Atenciosamente" dos 4 artigos de acesso de alto impacto** (IDs `05d496c9`, `661df800`, `ac20abca`, `e89e8091`). SQL completo na seção "Auditoria da knowledge_base".

7. **[KB] Limpeza secundária** (pode ser task separada ou iteração posterior): remover "Abençoado dia" + "Atenciosamente" dos artigos de reembolso e site fora do ar (IDs `6d390644`, `753e2d71`, `50515f85`, `30cbbff0`, `495bfe54`, `3a3dc67c`, `42d03906`).

---

## Plano de rollback

**Quem executa**: qualquer admin com acesso ao painel `/admin/settings/ai` OU ao Supabase SQL Editor.

**Como**: restaurar os valores exatos documentados em `prompt-backup.md` (mesmo diretório). O backup inclui `system_prompt` completo, `temperature=0.8`, `confidence_threshold=0.4`.

**Janela de observação crítica**: 48h após deploy do v3. Monitorar via SQL a cada 12h:

```sql
-- Taxa de thumbs-down (meta v3: < 0.08)
SELECT
  COUNT(*) FILTER (WHERE was_helpful = false)::float / NULLIF(COUNT(*) FILTER (WHERE was_helpful IS NOT NULL), 0) AS taxa_thumbsdown,
  AVG(confidence_score) AS confidence_media,
  COUNT(*) AS total_respostas
FROM ai_usage_stats
WHERE created_at > NOW() - INTERVAL '48 hours';

-- Padrões proibidos pós-deploy (deve retornar 0 linhas)
SELECT id, created_at, LEFT(response, 200)
FROM ai_usage_stats
WHERE created_at > NOW() - INTERVAL '48 hours'
  AND (
    response ILIKE '%Atenciosamente%'
    OR response ILIKE '%7 dias%'
    OR response ILIKE '%teste gratuito%'
    OR response ILIKE '%período de avaliação%'
    OR response ILIKE '%assinatura mensal%'
  )
ORDER BY created_at DESC;
```

**Critério de rollback automático**: thumbs-down superar 25% nas primeiras 48h (pior do que a baseline de 17.2%). Nesse caso, rollback imediato sem esperar UAT.

**Critério de sucesso** (14 dias): thumbs-down < 8%, confidence média > 0.55, zero ocorrências dos padrões proibidos no SQL acima.

**Janela de medição estendida**: 14 dias após deploy para métricas definitivas.

---

## Snapshot do prompt atual

Ver `prompt-backup.md` (mesmo diretório).

---

## Pontos em aberto para Kimiko

1. **Duplicatas na KB**: a base tem ~55 artigos com títulos duplicados (dois IDs com conteúdo idêntico). Isso dobra o risco de recuperação de conteúdo problemático pelo RAG. Recomendo que Kimiko mapeie e desative (`is_active = false`) as duplicatas como task separada — é escopo `sofia-kb-dedup`, não desta feature, mas merece ticket.

2. **Artigo "Troubleshooting: cliente confunde produto comprado vs. produto que quer acessar"** (ID `017a00f3`, usage_count 0): tem conteúdo útil mas nunca foi usado. Pode ser que o threshold atual (0.4) nunca o recupera, ou que o embedding está ruim. Com threshold 0.6, pode piorar. Kimiko deve verificar se o conteúdo desse artigo cobre o caso de divergência de produto — se sim, pode ser que o esqueleto do prompt v3 + esse artigo resolva o loop sem precisar de instrução específica.

3. **Escrita do prompt v3 completo**: o esqueleto define estrutura e intenção de cada seção. Kimiko escreve o texto palavra-por-palavra. O critério de aprovação é: cada seção deve ser verificável contra os 8 casos de uso do spec.md.
