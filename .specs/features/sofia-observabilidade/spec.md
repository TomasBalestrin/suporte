# Feature: sofia-observabilidade

> Restaurar a instrumentação de qualidade da Sofia que o refactor v2 quebrou.
> Scope: **Medium** · Tier: **Opus** (dado vivo de prod, schema migration, métrica go/no-go).

## Problema (diagnóstico confirmado no banco vivo `zeocxcfiyhzsztwjllvl`)

O "Sofia v2 Refactor" trocou o modelo de dados (`ai_usage_stats` → `ai_conversations` + `ai_conversation_messages`) mas não migrou a captura de qualidade. Três buracos:

1. **`ai_usage_stats` congelada desde 2026-05-13 15:34 BRT** — nenhum INSERT novo. O SQL de monitoramento do v3 varria essa tabela morta e voltava "tudo certo".
2. **`confidence` não persistido** — calculado em `route.ts:443` (`Math.round(bestSimilarity * 100)`) e devolvido ao front, mas nunca gravado.
3. **Feedback (thumbs up/down) perdido silenciosamente** — `feedback/route.ts` faz `UPDATE ai_usage_stats ... WHERE query=...` numa tabela morta; `stat` é sempre null; rota retorna `success: true` mesmo assim.

Impacto medido na Fase 1 (estanca): 13 respostas envenenadas (link errado do Teste dos Arquétipos) entre 18–21/05 passaram despercebidas pelo monitoramento cego. Confidence e thumbs-down do período cego são **irrecuperáveis**.

## Decisões (decided_by: butcher, confirmado pelo usuário 2026-05-22)

| # | Decisão | Valor |
|---|---|---|
| D1 | Onde vive confidence + feedback | Colunas **aditivas** em `ai_conversation_messages` (linha do `assistant`) |
| D2 | Como o feedback é chaveado | Por **`conversation_id`** (front passa a guardar e enviar) → atualiza a mensagem `assistant` mais recente da conversa |
| D3 | Backfill do período cego | **Não** — irrecuperável. Aceitar o gap, começar do deploy |
| D4 | Painel visual (`/admin/analytics`) | **Fora de escopo** — monitora via SQL (`monitoring.sql`). Painel = feature futura deferida |

## Escopo (in / out)

**In:**
- Migration aditiva (confidence + was_helpful em `ai_conversation_messages`).
- `route.ts`: persistir `confidence` na mensagem `assistant`.
- `feedback/route.ts`: aceitar `conversation_id`, atualizar a mensagem `assistant` mais recente daquela conversa.
- Front (`ajuda/page.tsx`): guardar `conversation_id` da resposta do chat e enviá-lo no feedback.
- Estender `monitoring.sql` com query de distribuição de confidence + taxa de thumbs-down (úteis só pós-deploy).

**Out:** painel UI, backfill, refatorar o tool-loop, mexer em `ai_usage_stats` (deixa morrer).

## Tarefas (atomic)

- **T1** — Migration `017_ai_conversation_messages_metrics.sql`: `ADD COLUMN confidence integer` + `ADD COLUMN was_helpful boolean` (ambas nullable, aditivas). Atualizar `src/lib/supabase/types.ts` (Row/Insert/Update de `ai_conversation_messages`).
- **T2** — `route.ts`: no insert da mensagem `assistant` (≈linha 432), incluir `confidence: Math.round(bestSimilarity * 100)`. Confidence só é gravado quando `conversationId` existe (limitação aceita, igual à persistência atual).
- **T3** — `feedback/route.ts`: trocar schema pra `{ conversation_id: string (uuid), helpful: boolean }`. Buscar a mensagem `assistant` mais recente da conversa e `UPDATE was_helpful`. Se não achar, no-op gracioso (sem 500). Manter rate-limit.
- **T4** — Front `ajuda/page.tsx`: adicionar state `conversationId`; setar de `json.data.conversation_id` nas duas chamadas de chat; `sendFeedback` envia `{ conversation_id, helpful }` em vez de `{ query, helpful }`.
- **T5** — Estender `monitoring.sql`: Q9 distribuição de confidence (avg/p50/histograma) e Q10 taxa de thumbs-down, ambas filtrando `created_at >= <deploy>` (dado só existe pós-deploy).

## Verificação

- Build local (`npm run build`) verde, type-check OK.
- Migration aplicada em prod **ANTES** do deploy do código (senão INSERT com coluna inexistente quebra `/api/ai/chat`). Ordem: migrate → deploy.
- Pós-deploy: 1 chat real → linha `assistant` com `confidence` preenchido; 1 clique de feedback → `was_helpful` setado na mensagem certa (verificar via SQL).
- Monitoramento 48h (MM): reusar `monitoring.sql` + as queries novas de confidence/thumbs-down.

## Gate ladder

Kimiko (execute) → ⭐ Luz Estrela (review) → 🍼 MM (shippability: ordem migrate→deploy, monitoramento 48h, rollback) → 🔪 Bruto (merge).

## Rollback

- Migration: `ALTER TABLE ai_conversation_messages DROP COLUMN confidence, DROP COLUMN was_helpful` (perde só o dado novo de métrica, não afeta conversa).
- Código: Vercel 1-click rollback (deploy anterior). Commit local revertível.
