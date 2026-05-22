---
type: lesson
id: L024
title: "Queue worker: mutex em memória sozinho é insuficiente — claim atômico via UPDATE+FOR UPDATE SKIP LOCKED é a defesa profunda"
date: 2026-05-19
owners:
  - "[[Bruto]]"
occurrences: 2
severity: high
related:
  - "[[L019-fix-parcial-em-1-de-N-callsites-gera-regressao-silenciosa]]"
  - "[[L023-welcome-worker-sem-mutex-fix-parcial-de-c503959]]"
---

# L024 — Queue worker: mutex em memória sozinho é insuficiente — claim atômico via UPDATE+FOR UPDATE SKIP LOCKED é a defesa profunda

## Gatilho

Crio worker Node.js que processa queue em DB com padrão clássico:

```js
// 1) SELECT WHERE status='pendente' LIMIT N
// 2) for each: sendMessage → UPDATE status='enviado'
```

Adiciono mutex `_tickRunning` pra prevenir ticks paralelos pegarem mesmas rows ([[L023]]). Considero o problema resolvido.

## Erro

Mutex em memória cobre **um único caso**: 2+ ticks do mesmo processo rodando em paralelo. **NÃO cobre 3 outros casos sutis** que continuam vazando dupes:

### Caso 1 — UPDATE pós-send falha (Supabase blip / network)
```
1. SELECT → pega 5 rows pendentes
2. for row[0]: sendText OK (msg saiu, wamid retornado)
3.   UPDATE row[0] status='enviado' → FALHA (Supabase 500, timeout, etc)
4. row[0] continua status='pendente' no DB
5. próximo tick: SELECT pega row[0] de novo → re-envia → DUPE
```

### Caso 2 — Crash do processo entre send e UPDATE
```
1. SELECT → pega 5 rows pendentes
2. for row[0]: sendText OK
3. Processo morre (OOM kill, container restart, deploy graceful, etc)
4. row[0] continua status='pendente'
5. boot → SELECT pega row[0] → re-envia → DUPE
```

### Caso 3 — Multi-replica (se escalar pra 2+ containers/workers)
```
Worker A e Worker B rodam em paralelo (replica horizontal).
Ambos SELECT WHERE status='pendente' simultaneamente.
Ambos pegam row[0]. Ambos enviam. → DUPE
```

Mutex em memória só protege dentro de UM processo. Cross-process não.

## Correção Enforçada

**Padrão correto de queue worker: CLAIM ATÔMICO via `UPDATE ... FOR UPDATE SKIP LOCKED`**.

Tick chama uma **RPC SQL** (não SELECT direto):

```sql
CREATE OR REPLACE FUNCTION claim_<tabela>(p_limit int)
RETURNS SETOF <tabela> AS $$
BEGIN
  RETURN QUERY
  UPDATE <tabela>
  SET status = 'processando'
  WHERE id IN (
    SELECT id FROM <tabela>
    WHERE status = 'pendente'
    ORDER BY <campo_ordem>
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED  -- ← a chave
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;
```

Worker:
```js
const { data: alvos } = await db.rpc('claim_<tabela>', { p_limit: 5 });
// rows recebidas já estão status='processando' no DB
for (const alvo of alvos) {
  // preconditions (chip offline, rate limit) → rollback explícito pra 'pendente'
  if (!precondition_ok) {
    await db.from('<tabela>').update({ status: 'pendente' }).eq('id', alvo.id);
    continue;
  }
  await sendText(...)
  await db.from('<tabela>').update({ status: 'enviado', wamid, enviado_em }).eq('id', alvo.id);
}
```

**Cobre os 3 casos:**

- **Caso 1**: row está 'processando', não 'pendente' — próximo tick não pega.
- **Caso 2**: row fica 'processando' indefinidamente até intervenção manual (operador inspeciona via DB / dashboard). Não re-envia.
- **Caso 3**: `FOR UPDATE SKIP LOCKED` faz com que se Worker A está fazendo o UPDATE, Worker B pula essas rows e pega outras.

**Stale processando cleanup**: rows que ficam 'processando' por crash ficam órfãs. Em MVP, intervenção manual. Em produção robusta: cron periódico que move 'processando' > 15min de volta pra 'pendente' (ou 'erro' se quiser desistir).

**Status enum exige adicionar 'processando'** — atualizar CHECK constraint da tabela e qualquer endpoint UI/admin que mostre status.

**Adicionar isso em TODOS os workers de queue da vez que se descobre o pattern, NÃO um por um** ([[L023]], [[L019]]).

## Onde se aplica

- Worker Node.js + Postgres/Supabase com queue em tabela.
- Particularmente crítico em workers que disparam mensagens WhatsApp (cada dupe = cliente irritado + risco de ban Meta).
- Aplica a `setInterval` + tick longo (tick > poll interval).
- Aplica a workers de envio de e-mail, SMS, push notification — qualquer caso onde "enviou mas falha em marcar" causa side effect.

## Aplicado no FluxonApp em 2026-05-19

Migration `20260519110000_claim_rpcs_anti_dupe.sql` adiciona 3 RPCs:
- `claim_boas_vindas_fila(p_limit)`
- `claim_mentoria_followup_grupo(p_limit)`
- `claim_leads_externos_recebidos(p_limit)`

Workers refatorados em commit deste dia:
- `service/lib/welcome-worker.js`
- `service/lib/mentoria-followup-worker.js`
- `service/lib/leads-worker.js`

Cada um faz claim → preconditions → send → status terminal, com rollback explícito quando precondition falha.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
