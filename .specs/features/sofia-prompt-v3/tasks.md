# Tasks — sofia-prompt-v3

**Status**: execute  
**Owner**: Kimiko  
**Iniciada**: 2026-04-29  
**Estratégia**: SQL em prod AGORA, edição route.ts sem commit, UAT pulada, monitoramento via SQL

---

## T1. Escrever prompt-v3 completo

**Status**: ✅ completed  
**Ação**: criar arquivo `.specs/features/sofia-prompt-v3/prompt-v3.md` com texto COMPLETO do novo system_prompt  
**Arquivo**: `.specs/features/sofia-prompt-v3/prompt-v3.md`  
**Critério de verificação**: arquivo existe com 11 seções bem definidas e ~1100 tokens estimados  
**Tokens estimados**: 1087 (estimativa manual de palavras × 1.3 fator)

---

## T2. GATE — Aguardar review do Butcher do prompt-v3

**Status**: pending  
**Ação**: Kimiko reporta que prompt-v3.md está pronto, Butcher revisa e aprova antes de T3  
**Bloqueador**: Butcher não aprovou  
**Critério de verificação**: Butcher confirmou via chat que prompt está OK para deploy

---

## T3. UPDATE ai_config.system_prompt = prompt-v3

**Status**: pending  
**Ação**: executar SQL UPDATE na tabela `ai_config` do Supabase prod  
**Comando exato**:
```sql
UPDATE ai_config 
SET config_value = 'Você é Sofia, assistente virtual de suporte da Bethel Educação. Atende clientes que compraram produtos digitais da Julia Ottoni ou do Cleiton Querobin.

## FAST-PATHS DE ESCALAÇÃO OBRIGATÓRIA

Antes de consultar a base de conhecimento ou o Fluxon, verifique se a pergunta bate em algum desses triggers. Se sim, escale imediatamente com `requires_ticket: true` — sem etapas intermediárias.

- **Pedido explícito de humano**: "quero falar com um humano", "falar com pessoa", "atendimento humano", "falar com atendente" → escala imediatamente, confirme que abrirá ticket.
- **Sinais de golpe ou fraude**: "golpe", "fraude", "Procon", "Decon", "processar", "chargeback", "vou denunciar" → escala, tom acolhedor e firme, sem minimizar a preocupação.
- **3+ reclamações repetidas no mesmo chat**: cliente reclamou do mesmo problema 3 ou mais vezes → escala, reconheça o incômodo.
- **Pergunta sobre financeiro que a Sofia não tem**: "qual é o valor da mensalidade?", "quando vence meu período de teste?", "há desconto disponível?", "quanto custa a assinatura?", "qual é o prazo de cobrança?" → NUNCA responda, escale com "Não tenho essa informação aqui, vou conectar você com nossa equipe que pode confirmar."

## ANTI-ALUCINAÇÃO — REGRAS INEGOCIÁVEIS

- **NUNCA use "verifiquei", "confirmei", "encontrei sua compra" ou "localizei seu pedido"** se o contexto do Fluxon estiver vazio. Use "vou tentar localizar" ou "não consegui encontrar ainda" — afirmar verificação sem evidência destrói confiança.
- **NUNCA invente URL com sufixo numérico** (ex: `https://cleitonquerobin.com.br/quillforms/formulario-67/`). Use APENAS o link que veio explicitamente do campo `access_link` do Fluxon, ou links documentados abaixo em credenciais-padrão.
- **NUNCA mencione teste gratuito, período de avaliação, assinatura, valor de cobrança, desconto ou promoção.** Se cliente perguntar sobre qualquer um desses, escale para humano. Esses dados não existem no seu contexto operacional — inventar é alucinação garantida.
- **Credenciais: APENAS 3 plataformas documentadas** abaixo. Nada além disso. Se o produto não for nenhuma das 3 e o Fluxon não retornar link específico, informe honestamente que não localizou e escale.

## PRIORIDADE DE DADOS

1. **Dados do Fluxon** (compras reais, links específicos da entrega) — SEMPRE prevalecem.
2. **Artigos da base de conhecimento** — use quando Fluxon não cobre.
3. **Credenciais-padrão abaixo** — só como fallback quando nem Fluxon nem KB trouxerem a credencial.
4. **Nada acima cobre?** Diga claramente que não encontrou e sugira abrir ticket humano.

## PRODUTOS E CREDENCIAIS-PADRÃO

**Produtos Julia Ottoni** (50 Modelos, Stories, Gatilhos, Reels Magnéticos, Teste dos Arquétipos, Posicionamento, Máquinas de Conteúdos IA, Método Posicionamento Milionário, Implementação IA Julia, demais):
- Área de membros: https://juliaacademy.com.br/
- Login: e-mail usado na compra
- Senha: ottoni123

**Produtos Cleiton Querobin** (Implementação IA Cleiton, Quebrando Objeções, Modelos de Áudio, 50 Clientes Novos, demais — EXCETO 50 Scripts):
- Área de membros: https://cleitonquerobin1.com.br/
- Login: e-mail usado na compra
- Senha: performance123

**50 Scripts Prontos para o WhatsApp** (plataforma própria):
- Link: https://50scripts.cleitonquerobin.com.br/
- Login: e-mail de compra
- Senha: performance123

**Teste dos Arquétipos** (Julia Ottoni, sem login necessário):
- Link direto: https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/

**IMPORTANTE**: alguns produtos têm link específico no Fluxon (formato quillforms com acesso direto). Se o Fluxon retornar o link específico da compra, USE-O — é o link oficial daquela entrega.

## COMPORTAMENTO COM PRODUTO DO FORMULÁRIO

O contexto do formulário pode indicar um produto ("Contexto do formulário: cliente abriu selecionando o produto ''X''"). Esse dado é um sinal, não uma verdade absoluta — use assim:

- **Cliente NÃO menciona produto na pergunta** → ignore o contexto do formulário, responda a pergunta diretamente.
- **Cliente menciona produto que bate com o contexto do formulário** → responda sem comentar sobre divergência.
- **Cliente menciona produto DIFERENTE do contexto do formulário** → mencione UMA única vez de forma educada ("vi aqui que sua compra está registrada como X, mas se comprou Y vou ajudar assim mesmo") e siga resolvendo sem voltar ao assunto.

## REGRAS OPERACIONAIS

- **Não misture credenciais entre produtores.** Julia = ottoni123. Cleiton = performance123. Se não souber qual o cliente comprou, PERGUNTE antes de enviar senha.
- **Múltiplas compras no Fluxon?** Pergunte qual produto o cliente quer acessar AGORA antes de enviar links ou senhas. Nunca despeje credenciais de vários produtos numa mensagem.
- **Dados já fornecidos não se pedem de novo.** Se o sistema já tem nome, telefone, email ou CPF, use-os — NÃO peça de novo. Pede APENAS dados específicos faltantes (data aproximada da compra, plataforma, número do pedido).

## COMPRA NÃO LOCALIZADA

Siga esta estrutura de 4 passos:

1. Reconheça a busca: "busquei com e-mail X e CPF Y mas não encontrei".
2. Cite as 2 causas prováveis: compra ainda pendente de aprovação OU dados cadastrados diferentes na plataforma.
3. Peça dados específicos: "pode me informar a data/horário aproximados, se foi Hotmart ou PagTrust, e o número do pedido se tiver?"
4. Não invente entrega, não envie template. Aguarde resposta do cliente com os novos dados.

## SITE FORA DO AR

Sinais: "This Account has been suspended", "Contact your hosting provider", "404", "502", "503", "site não carrega", "página em branco", "não abre".

Se detectar: NÃO envie link nem senha (não resolve). Informe com calma que a equipe técnica foi notificada e peça para aguardar alguns minutos antes de tentar novamente.

## TOM E FORMATO

- **Saudação**: OPCIONAL, APENAS na primeira mensagem do chat. "Olá!", "Oi!" ou "Abençoado dia" em raras ocasiões — NÃO é padrão, NÃO é obrigatório.
- **Demais mensagens**: zero saudação, zero assinatura, ir direto ao ponto. Termine a resposta sem "Atenciosamente, Time Bethel Educação" ou similares.
- **Comprimento**: respostas curtas e diretas. Evite listar 5 perguntas de confirmação — pede uma coisa por mensagem se precisar de dados.
- **Sem loop de coleta**: não repita a mesma pergunta se o cliente já respondeu ou ignorou.
- **Linguagem**: simples, PT-BR, sem jargão técnico.

## ESCALAÇÃO HUMANA

Oriente abrir ticket quando:
- Você não encontrou resposta no Fluxon nem na KB.
- Cliente pediu atendimento humano explicitamente (veja fast-paths acima).
- Caso técnico fora do seu alcance (problemas de pagamento, erro de cadastro no produtor).

**Horário humano**: segunda a sexta, 8h30 às 20h. Não prometa prazos exatos.

Quando retornar `requires_ticket: true`, inclua UMA frase confirmando: "Entendido, vou abrir um ticket para você. Um agente retornará em breve."

## PROIBIÇÕES ABSOLUTAS

- Nunca compartilhe informação técnica interna (IDs de tabelas, endpoints da API, detalhes de sistema).
- Nunca invente URL, senha, prazo ou promessa.
- Nunca afirme ter feito algo que não fez.
- Nunca misture credenciais entre produtores.
- **Nunca mencione período de teste gratuito, assinatura, cobrança, desconto ou promoção — esses valores não existem no seu contexto operacional.**'
WHERE config_key = 'system_prompt';
```
**Critério de verificação**: `SELECT config_value FROM ai_config WHERE config_key = 'system_prompt'` retorna o novo prompt v3 integralmente

---

## T4. UPDATE ai_config.temperature = 0.2

**Status**: pending  
**Ação**: executar SQL UPDATE  
**Comando exato**:
```sql
UPDATE ai_config SET config_value = '0.2' WHERE config_key = 'temperature';
```
**Critério de verificação**: `SELECT config_value FROM ai_config WHERE config_key = 'temperature'` retorna `0.2`

---

## T5. UPDATE ai_config.confidence_threshold = 0.6

**Status**: pending  
**Ação**: executar SQL UPDATE  
**Comando exato**:
```sql
UPDATE ai_config SET config_value = '0.6' WHERE config_key = 'confidence_threshold';
```
**Critério de verificação**: `SELECT config_value FROM ai_config WHERE config_key = 'confidence_threshold'` retorna `0.6`

---

## T6. UPDATE knowledge_base — artigos f50e70a2 e 053bb8d0 (Implementação IA)

**Status**: pending  
**Ação**: remover trechos de "7 dias de teste" e "assinatura mensal" dos artigos duplicados sobre ferramenta Nextrack  
**Comando exato**:
```sql
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
```
**Critério de verificação**: `SELECT content FROM knowledge_base WHERE id = 'f50e70a2-62df-428e-a914-9dcd793f4db3'` não contém "7 dias" nem "teste gratuito" nem "assinatura mensal"

---

## T7. UPDATE knowledge_base — artigo 05d496c9 (Acesso Julia)

**Status**: pending  
**Ação**: remover "Abençoado dia" e assinatura de artigo de acesso Julia  
**Comando exato**:
```sql
UPDATE knowledge_base
SET content = 'Para clientes que compraram produtos da Julia Ottoni (Implementação IA, Reels Magnéticos, Método Posicionamento Milionário, Teste dos Arquétipos):

Link de acesso: https://juliaacademy.com.br/
Login: e-mail usado na compra
Senha: ottoni123'
WHERE id = '05d496c9-944f-4f1f-b1ae-8351d715a3fc';
```
**Critério de verificação**: `SELECT content FROM knowledge_base WHERE id = '05d496c9-944f-4f1f-b1ae-8351d715a3fc'` não contém "Abençoado" nem "Atenciosamente"

---

## T8. UPDATE knowledge_base — artigo 661df800 (Acesso Cleiton)

**Status**: pending  
**Ação**: remover "Abençoado dia" e assinatura de artigo de acesso Cleiton  
**Comando exato**:
```sql
UPDATE knowledge_base
SET content = 'Para clientes que compraram Implementação Cleiton e precisam do link de acesso:

https://cleitonquerobin1.com.br

Login: e-mail usado na compra
Senha: performance123'
WHERE id = '661df800-16d8-4e8f-8cce-72d8a6fa1d0a';
```
**Critério de verificação**: `SELECT content FROM knowledge_base WHERE id = '661df800-16d8-4e8f-8cce-72d8a6fa1d0a'` não contém "Abençoado" nem "Atenciosamente"

---

## T9. UPDATE knowledge_base — artigo ac20abca (Acesso 50 Scripts)

**Status**: pending  
**Ação**: remover "Abençoado dia" e assinatura de artigo de acesso 50 Scripts  
**Comando exato**:
```sql
UPDATE knowledge_base
SET content = 'Para clientes que compraram 50 Scripts Prontos para o WhatsApp:

https://50scripts.cleitonquerobin.com.br/
Login: e-mail de compra
Senha: performance123'
WHERE id = 'ac20abca-83b4-4ae9-96bd-0b0a42021668';
```
**Critério de verificação**: `SELECT content FROM knowledge_base WHERE id = 'ac20abca-83b4-4ae9-96bd-0b0a42021668'` não contém "Abençoado" nem "Atenciosamente"

---

## T10. UPDATE knowledge_base — artigo e89e8091 (Pedido de Dados)

**Status**: pending  
**Ação**: remover "Abençoado dia" e assinatura de artigo de coleta de dados  
**Comando exato**:
```sql
UPDATE knowledge_base
SET content = 'Quando a Sofia não encontra o cliente com os dados iniciais e precisa de informações adicionais:

Por gentileza, poderia enviar o nome completo, e-mail de compra e CPF?'
WHERE id = 'e89e8091-f444-4d56-b21a-0a5ad7dc0e01';
```
**Critério de verificação**: `SELECT content FROM knowledge_base WHERE id = 'e89e8091-f444-4d56-b21a-0a5ad7dc0e01'` não contém "Abençoado" nem "Atenciosamente"

---

## T11. Edit src/app/api/ai/chat/route.ts — separar formProductName do enrichedQuestion

**Status**: pending  
**Ação**: aplicar diff no arquivo route.ts para separar contexto do formulário no userContent (SEM fazer commit)  
**Arquivo**: `src/app/api/ai/chat/route.ts`  
**Diff completo**: conforme descrito em `design.md` seção "Diff de código para Kimiko (Opção B)". Linhas afetadas: 109-126 (variáveis) e ~185-190 (userContent).  
**Critério de verificação**: arquivo editado localmente, git diff mostra separação de `formProductName` e injeção de `formProductName` em campo separado no userContent (não mais misturado na enrichedQuestion)  
**Nota**: NÃO fazer commit nesta task — segurar até autorização Butcher em T14

---

## T12. Verificação pós-deploy — monitoramento SQL

**Status**: pending  
**Ação**: executar SQLs de monitoramento após T3-T10 completados, gravar resultado em STATE.md  
**Comando 1 — Padrões proibidos (deve retornar 0 linhas)**:
```sql
SELECT id, created_at, LEFT(response, 200)
FROM ai_usage_stats
WHERE created_at > NOW() - INTERVAL '14 days'
  AND (
    response ILIKE '%Atenciosamente%'
    OR response ILIKE '%7 dias%'
    OR response ILIKE '%teste gratuito%'
    OR response ILIKE '%período de avaliação%'
    OR response ILIKE '%assinatura mensal%'
  )
ORDER BY created_at DESC;
```
**Comando 2 — Taxa de confiança**:
```sql
SELECT
  COUNT(*) FILTER (WHERE was_helpful = false)::float / NULLIF(COUNT(*) FILTER (WHERE was_helpful IS NOT NULL), 0) AS taxa_thumbsdown,
  AVG(confidence_score) AS confidence_media,
  COUNT(*) AS total_respostas
FROM ai_usage_stats
WHERE created_at > NOW() - INTERVAL '14 days';
```
**Critério de verificação**: T1 retorna 0 linhas (zero padrões proibidos). T2 mostra taxa_thumbsdown < 0.17 (pelo menos não piorou). Resultado gravado em STATE.md seção "Deploy v3 — Monitoramento 48h"

---

## T13. GATE — Aguardar Starlight review

**Status**: pending  
**Ação**: Starlight revisa mudanças de código e SQLs executados, bloqueia ou aprova merge  
**Bloqueador**: Starlight não aprovou  
**Critério de verificação**: Starlight confirmou via chat que tudo passou na review

---

## T14. GATE — Aguardar autorização Butcher pra commit do route.ts

**Status**: pending  
**Ação**: Butcher autoriza commit da edição do route.ts (T11 foi apenas edição local sem commit)  
**Bloqueador**: Butcher não autorizou commit  
**Critério de verificação**: Butcher confirmou que pode commitar + fazer push

---

## T15. Commit da edição route.ts

**Status**: pending  
**Ação**: fazer git commit com mudança do route.ts (separar formProductName)  
**Comando exato**:
```bash
git add src/app/api/ai/chat/route.ts
git commit -m "feat(sofia): separar formProductName do enrichedQuestion no userContent"
```
**Critério de verificação**: `git log -1 --oneline` mostra novo commit

---

## T16. Deploy em prod (Vercel)

**Status**: pending  
**Ação**: fazer push para prod via Vercel (após commit T15)  
**Comando exato**:
```bash
git push origin master
npx vercel --prod
```
**Critério de verificação**: Vercel deployment completo, site em prod refletindo código novo

---

## Resumo de SQLs prontos (copia/cola direto no Supabase SQL Editor)

```sql
-- T4: temperature = 0.2
UPDATE ai_config SET config_value = '0.2' WHERE config_key = 'temperature';

-- T5: confidence_threshold = 0.6
UPDATE ai_config SET config_value = '0.6' WHERE config_key = 'confidence_threshold';

-- T6: Implementação IA (f50e70a2 + 053bb8d0)
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

-- T7: Acesso Julia (05d496c9)
UPDATE knowledge_base
SET content = 'Para clientes que compraram produtos da Julia Ottoni (Implementação IA, Reels Magnéticos, Método Posicionamento Milionário, Teste dos Arquétipos):

Link de acesso: https://juliaacademy.com.br/
Login: e-mail usado na compra
Senha: ottoni123'
WHERE id = '05d496c9-944f-4f1f-b1ae-8351d715a3fc';

-- T8: Acesso Cleiton (661df800)
UPDATE knowledge_base
SET content = 'Para clientes que compraram Implementação Cleiton e precisam do link de acesso:

https://cleitonquerobin1.com.br

Login: e-mail usado na compra
Senha: performance123'
WHERE id = '661df800-16d8-4e8f-8cce-72d8a6fa1d0a';

-- T9: Acesso 50 Scripts (ac20abca)
UPDATE knowledge_base
SET content = 'Para clientes que compraram 50 Scripts Prontos para o WhatsApp:

https://50scripts.cleitonquerobin.com.br/
Login: e-mail de compra
Senha: performance123'
WHERE id = 'ac20abca-83b4-4ae9-96bd-0b0a42021668';

-- T10: Pedido de Dados (e89e8091)
UPDATE knowledge_base
SET content = 'Quando a Sofia não encontra o cliente com os dados iniciais e precisa de informações adicionais:

Por gentileza, poderia enviar o nome completo, e-mail de compra e CPF?'
WHERE id = 'e89e8091-f444-4d56-b21a-0a5ad7dc0e01';
```

---

## Próximas fases

- **Depois de T14**: commit + push do route.ts
- **Depois de T16**: monitorar respostas da Sofia em prod via dashboard, validar SQL de monitoramento a cada 12h
- **Depois de 48h**: decidir se mantém v3 ou rollback automático se thumbs-down > 25%
