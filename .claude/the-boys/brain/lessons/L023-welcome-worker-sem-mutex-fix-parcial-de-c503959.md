---
type: lesson
id: L023
title: "Worker novo / refatorado tem que herdar TODAS as proteções dos peers (mutex, dedup, claim atômico) — L019 reincidente"
date: 2026-05-19
owners:
  - "[[Bruto]]"
occurrences: 2
severity: high
related:
  - "[[L019-fix-parcial-em-1-de-N-callsites-gera-regressao-silenciosa]]"
  - "[[L022-baileys-disconnect-multiplo-trigga-ban-24h]]"
---

# L023 — Worker novo / refatorado tem que herdar TODAS as proteções dos peers (mutex, dedup, claim atômico) — L019 reincidente

## Gatilho

Crio (ou herdo de outro projeto) um worker novo no service Baileys/Node — tipicamente:
- `setInterval(tick, 30s)`
- `tick()` faz `SELECT WHERE status='pendente' LIMIT N`
- pra cada row, dispara `sendMessage` + jitter 60-120s entre cada
- ao final, `UPDATE status='enviado'`

Padrão: tick dura 5-10min, interval dispara a cada 30s. **Se NÃO tem mutex `_tickRunning`, ticks paralelos pegam as MESMAS rows pendentes e disparam duplicado.**

## Erro

Mesmo lead recebe a msg N vezes (N = quantos ticks rodaram em paralelo antes do UPDATE do primeiro propagar). Janela típica: 2-4 mensagens idênticas em 1-3 minutos.

**Ocorrência #1** (2026-05-14): `MentoriaFollowupWorker` — commit `c503959` aplicou mutex `_tickRunning` lá. Comentário no código documenta o incidente. Lição **L019** foi escrita.

**Ocorrência #2** (2026-05-19 ~10:15 UTC): `WelcomeWorker` — bug idêntico. 11 LIDs receberam 2-4x a mesma msg de welcome após fila acumular durante uma queda 408 do chip Cleiton e disparar em rajada no reconnect. **20 msgs duplicadas no total.** O fix de 2026-05-14 NUNCA foi replicado no WelcomeWorker mesmo o autor do fix sabendo do padrão.

**Padrão reincidente confirmado** — L019 não é o suficiente. Precisa de **gate ativo** que verifica TODOS os peers do mesmo arquétipo quando se faz fix de concorrência em UM deles.

## Correção Enforçada

**Quando aplicar/herdar fix de concorrência (mutex, claim atômico, partial unique index) em UM worker do projeto:**

1. **Imediatamente listar TODOS os workers do projeto** que seguem o mesmo arquétipo (setInterval + tick com sleeps longos + select pending).
2. **Auditar cada um** pra ver se já tem proteção (variante: `_tickRunning`, `this.busy`, `processando` Set, `running` Map, `isRunning()` check do dispatcher).
3. **Aplicar proteção em TODOS de uma vez no MESMO commit** — não deixar pra "depois quando precisar". Quando precisar = incidente em prod.
4. **Documentar a auditoria no commit message** — "auditoria nos outros N workers do projeto: ..." pra futuro grep encontrar evidência.
5. **Em workers NOVOS** (criados nesta sessão, herdados de template, copy-paste de outro projeto): grep dos peers atuais antes de fechar a tarefa — `grep _tickRunning service/lib/*-worker.js`.

**Pre-commit gate sugerido** (não implementado ainda — backlog):
- Hook `git commit` que detecta criação de novo `*-worker.js` E exige presença de `_tickRunning` ou comentário `// no-mutex-needed: <motivo>` no constructor.

**Code review explícito** (Luz Estrela): em qualquer PR que toca worker, conferir mutex.

## Onde se aplica

- Workers Node.js com `setInterval` + tick longo (qualquer caso onde tick duração > interval).
- Particularmente crítico em workers que disparam mensagens WhatsApp (cada dupe = irritação cliente + risco de ban se Meta detectar padrão).
- Aplica também a outros padrões de concorrência: claim atômico, partial unique index, transação cross-row.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).