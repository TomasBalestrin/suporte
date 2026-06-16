# Design — `sofia-auto-ticket` (Fix B: auto-criar ticket no escalonamento)

> SDD Design. Scope: **Large/Complex**. Tier: **Opus** (código de produção, user-facing, efeito real de e-mail).
> Owner fase: 🎖️ A Lenda (red-team) + 🔪 Bruto (decisões) → Kimiko (execute).
> Aberta: 2026-06-16. Antecede: validação A+C (sofia-anti-escalonamento) fechada hoje.

## Problema (do dado, não de palpite)

Validação de 7 dias (n=152) confirmou: quando a Sofia decide escalar, ela só **fala** ("vou abrir um ticket / a equipe retorna por aqui mesmo") — **nenhum ticket nasce** a menos que o cliente clique "Falar com humano". Compradores reais (combo/curso não liberado, insatisfação, "aguardo humano") acreditam na promessa passiva, não clicam, e ninguém atende. `requires_ticket` é decorativo (confiança do RAG, não intenção de escalar). A **decisão de escalar da Sofia precisa PRODUZIR o ticket**.

## Decisões de escopo (decided_by: usuário, 2026-06-16)

- **D1 — Canal: SÓ portal form** (`/suporte/ajuda`). WhatsApp (via Fluxon) fica **fora** (handler de entrada vive no outro repo; sem tráfego medido aqui). Simplifica name/description (o form os tem).
- **D2 — Gatilho: SÓ quando a Sofia decide escalar** (reembolso, produto não consta nas compras, cliente pediu humano, não resolveu pós-troubleshoot). **NÃO** abrir ticket por confiança baixa do RAG sozinha (evita ticket/e-mail em pergunta que a Sofia até respondeu).

## Veredito da A Lenda (red-team) — fronteiras inegociáveis

Aprovou o esqueleto de 3 peças **condicionado a**:
1. 🔴 **BLOQUEIO resolvido — idempotência mora no BANCO, não no app.** `ai_conversations.ticket_id` não tem constraint nenhuma. Check-then-act no app é TOCTOU → dois tickets/dois e-mails na corrida tool-vs-botão.
2. ⚠️ Sinal de escalonamento: gpt-4o-mini **sub-chama tools** (provado na saga do pré-fetch). Tool não pode ser o ÚNICO ponto cego de confiança.
3. ⚠️ `createTicket` extraído tem que ser **puro e burro sobre origem** — normalização por-canal nos callers.
4. ⚠️ E-mail Resend: aceitável se idempotência sólida (1 ticket = 1 e-mail); kill-switch pra testar sem emailar cliente real.
5. 🔴/⚠️ Não-vistos: trigger `generate_ticket_code()` é corrida pré-existente que o B **agrava** (dívida); `createTicket` extraído deveria ser transacional; filtrar msgs `role='tool'` do histórico do ticket.

## Arquitetura (3 peças + as travas da A Lenda)

### Peça 1 — Sinal de escalonamento (resolução do conflito A Lenda × D2)

**Conflito:** A Lenda quer rede de retaguarda determinística (não confiar só na tool). Eduardo (D2) vetou gatilho por confiança-baixa — que era um dos sinais que a A Lenda propôs.

**Resolução do Bruto (🔪):**
- **Tool `escalar_para_humano(motivo, resumo)` = sinal PRIMÁRIO** (honra D2: "ela decide"). Adicionada ao tool-loop. System prompt acopla: *"para escalar, você DEVE chamar `escalar_para_humano` — nunca diga ao cliente que vai encaminhar sem chamá-la."*
- **2ª camada NÃO é heurística nova nem regex cego** (que a A Lenda condena) — é o **botão "Falar com humano" que JÁ existe**, mantido como fallback determinístico user-driven (idempotente, ver Peça 3). Cobre quem clica.
- **Instrumentação do gap (mede o medo da A Lenda em vez de adivinhar):** logar por resposta `escalou_tool` (bool) + `texto_sugere_escala` (regex no answer: "encaminh/abrir ticket/nossa equipe"). O **under-call = texto sugere escala MAS tool não disparou MAS cliente não clicou** = o dead-end residual. Medimos em 48h.
- **Por que sequenciar a rede determinística pra v1.1 e não agora:** (a) **v1 não pode ser pior que hoje** — o botão continua lá; tool-auto-create só ADICIONA cobertura. (b) D2 (conservador) + risco de e-mail-spam pedem cautela. (c) É a metodologia que funcionou no A+C: shippar instrumentado → validar com dado → expandir. Se o under-call medido for relevante, a rede de retaguarda (turnos≥3 = "não resolveu pós-troubleshoot", que cabe em D2) entra na v1.1 **com número**. A Lenda pediu o spike dos 152 — o spike vira o gate da v1.1.

> ⚠️ Risco aceito e registrado: se a tool sub-chamar E o cliente não clicar, o caso fica no dead-end atual (não regride, mas não melhora). A instrumentação expõe isso em 48h.

### Peça 2 — Helper `createTicket` (puro, normalizado, idempotente)

- Extrair a lógica de `src/app/api/tickets/route.ts` (L53-149, behavior-preserving) → **`src/lib/tickets/create.ts`** `createTicket(input, opts)`.
- **Contrato de entrada normalizado**: `{ name, email, cpf, phone?, product_id, category_id, title, description, messages }` — **já válidos** (caller garante name≥3 e description≥20; o helper não valida-e-rejeita, ele confia no contrato). zod fica no route `/api/tickets` (borda HTTP); o helper é interno.
- `opts.conversationId?` — quando presente, ativa a **trava de idempotência (Peça 3)**.
- **Filtra `role==='tool'`** ao montar `messages`→`messages` table (senão JSON cru de tool_result polui o histórico do atendente). Mapeia `user`→`customer`, resto→`ai`.
- Mantém os efeitos atuais: find-or-create customer, insert ticket, insert messages, activity_log, `sendEmail` (non-blocking), `executeAutomations` (non-blocking).
- **Dívida consciente (não-bloqueante v1):** o helper segue **não-transacional** (espelha o handler atual). Embrulhar em RPC Postgres = escopo próprio (registrado em débitos). Para v1 form-only de baixo volume, behavior-preserving.

### Peça 3 — Idempotência no BANCO (o bloqueio da A Lenda) — **migration 019**

- `migration 019_ai_conversation_ticket_unique.sql` (aditiva):
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_conv_ticket
    ON public.ai_conversations (ticket_id) WHERE ticket_id IS NOT NULL;
  ```
  Garante **1 conversa → no máx. 1 ticket**, enforçado pelo Postgres (índice único parcial — não colide nas N conversas com `ticket_id` nulo).
- **CAS (compare-and-swap), não check-then-act**, no `createTicket` quando há `conversationId`:
  1. `UPDATE ai_conversations SET ticket_id = <sentinela?> ...` — na prática: insere o ticket, depois `UPDATE ai_conversations SET ticket_id=$novo WHERE id=$conv AND ticket_id IS NULL`.
  2. Se `rowCount === 0` → **perdeu a corrida**: deleta o ticket recém-criado (compensação) e retorna o `ticket_id` já linkado (busca-o). Resultado: 1 ticket, 1 e-mail.
  3. Pré-check barato antes do insert (lê `ticket_id` atual; se já existe, retorna sem criar) **reduz** a corrida; o CAS + unique **fecham** o resíduo.
- **Sem `conversationId` → NÃO auto-cria** (decisão A Lenda + Bruto). Idempotência sem chave estável é fake; e os caminhos sem conversa (`OPENAI_API_KEY` ausente L190; `customer` ausente L225) degradam pro fluxo manual atual. Limitação consciente, escrita aqui.

### Peça 4 — Front (`ajuda/page.tsx`) + chat handler

- **`/api/ai/chat`**: passar `customer.name` (o front já tem `formData.name`) — hoje só manda email/cpf/telefone. O handler usa o name pro auto-create.
- Quando a tool `escalar_para_humano` dispara, o handler chama `createTicket` (com `conversationId`, name, description=resumo composto, ai_messages do histórico) e retorna `data.escalated=true` + `data.ticket_code`/`access_token`.
- **`description` do auto-create = resumo composto pelo backend** (nunca a 1ª msg crua, que pode ser <20): `motivo` + `resumo` da tool + a description original do form (que já é ≥20 no form flow). Garante ≥20 por construção.
- Front: se `escalated`, mostra "ticket criado" (mesma tela `done`/`ticketResult`) em vez da promessa passiva.
- **`handleNotResolved` (botão) idempotente**: passar `conversation_id` (o front já tem em `state`) pro `/api/tickets`; o route usa o MESMO `createTicket` com a trava CAS. Clicar depois do auto-create → retorna o ticket existente, sem 2º ticket/e-mail/500.
- **Copy**: ajustar prompt pra Sofia parar de prometer retorno passivo quando não há ticket; ao escalar (com tool), confirmar "abri seu ticket SUP-XXXX, você recebe por e-mail e pode acompanhar".

## Fora de escopo / débitos registrados

- **WhatsApp (Fluxon)** — D1. Quando entrar: name de `cliente.nome` do Fluxon + fallback; cross-repo.
- **Rede de retaguarda determinística (turnos≥3)** — v1.1, gated pelo spike dos 152 + under-call medido.
- **`generate_ticket_code()` é corrida** (migration 001 L248-261, `MAX+1` sem lock) — B agrava levemente (mais INSERT concorrente). Dívida → Soldier Boy/Trem-Bala (advisory lock / sequence). Rate-limit 5/min + volume baixo seguram hoje.
- **`createTicket` transacional (RPC)** — escopo próprio.
- **Kill-switch Resend** (`RESEND_ENABLED=false`) — dívida do MM; UAT v1 testa com **e-mail controlado nosso** (auto-create emaila o campo `email` do cliente → usar nosso e-mail no teste).
- **Linkagem reversa histórica (8%)** — B linka conversas NOVAS; não migra o passado. Honestidade de escopo.

## Tasks atômicas (ordem)

1. **T1 — migration 019** (unique index parcial). Primeira (A Lenda: "primeira task atômica").
2. **T2 — extrair `createTicket` helper** (behavior-preserving) + `/api/tickets` passa a usá-lo. `tsc` + vitest verdes (regressão da suite existente).
3. **T3 — idempotência CAS** no helper (`conversationId` opt) + testes (corrida, perdeu-corrida, sem-conv).
4. **T4 — tool `escalar_para_humano`** no tool-loop + handler chama `createTicket` no disparo + retorna `escalated`/`ticket_code` + grava telemetria de under-call.
5. **T5 — front**: passa `name` + `conversation_id`; UX de "ticket criado"; botão idempotente.
6. **T6 — copy/system_prompt**: acopla tool↔escala; confirma ticket criado; sem promessa passiva. (runtime `ai_config`, backup antes.)
7. **T7 — testes** da lógica determinística nova (helper, CAS, normalização) na suite vitest.

## Gate ladder (Complex)

🎖️ A Lenda (red-team — FEITO, veredito acima) → ⚔️ Kimiko (execute, migration primeiro) → ⭐ Luz Estrela (review: idempotência no banco, CAS não virou check-then-act, sem PII em log, filtro de tool msgs) → 🍼 MM (shippability: migration antes do deploy, monitoramento under-call/duplicatas 48h, rollback, kill-switch Resend) → 🎯 Hughie (UAT: escalar de verdade com e-mail controlado, confirmar 1 ticket/1 e-mail, botão idempotente) → 🔪 Bruto (merge).

## Rollback

- Código: Vercel 1-click. Migration: `DROP INDEX uq_ai_conv_ticket` (perde só a trava; tickets intactos). Prompt: restaurar backup do `ai_config`.
- Critério: 500s em `/api/ai/chat` ou `/api/tickets`, OU tickets/e-mails duplicados na corrida, OU queda de tickets legítimos.

## Monitoramento 48h

- Duplicatas: conversas com >1 ticket (deve ser 0 pós-unique).
- Under-call: respostas com `texto_sugere_escala=true` E `escalou_tool=false` E sem clique → tamanho do dead-end residual (gate da v1.1).
- Volume: tickets auto-criados/dia vs baseline manual; e-mails enviados (anti-spam: 1 por conversa).
