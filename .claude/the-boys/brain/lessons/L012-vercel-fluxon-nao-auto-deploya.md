---
type: lesson
id: L012
title: "Vercel não auto-deploya commits do projeto Fluxon (Disparotey) — rodar `vercel --prod` manual"
date: 2026-05-14
owners:
  - "[[MM]]"
  - "[[Bruto]]"
occurrences: 3
severity: high
related:
  - "[[fluxon]]"
---

# L012 — Vercel não auto-deploya o projeto Fluxon; deploy é manual via CLI

## Gatilho

Você acabou de `git push origin master` no repo `Disparotey/` (projeto Vercel `fluxon`, team `tt-solucoes-projects`, prod `https://fluxon-e.vercel.app`) e está esperando o Vercel buildar/deployar automaticamente o commit novo.

## Erro

**Vercel ignora o push.** Não dispara build, não aparece deploy novo em `vercel ls fluxon`, o último deployment continua sendo o anterior (de horas/dias atrás). Webhooks de prod respondem com o código velho.

Sintomas:
- `vercel ls fluxon` mostra deployments antigos (idade ≥ horas), nenhum em "Building".
- Endpoint novo retorna 404 ou o handler antigo executa.
- `vercel inspect https://fluxon-e.vercel.app --logs` mostra build de data anterior ao seu push.

Reproduzido 2x na sessão de **2026-05-14** (commits `5e84a69` handler grupo mentoria, depois `fc0dbb7` modais — em ambos o GitHub→Vercel integration não disparou build).

## Causa

Provável: integração GitHub→Vercel do projeto `fluxon` em `tt-solucoes-projects` não está com auto-deploy de `master` ativo, OU webhook do GitHub pra Vercel quebrou. **Não foi diagnosticado a fundo** — o workaround manual sempre resolve, então a investigação ficou pra depois.

Hipóteses ainda em aberto:
1. Branch protection settings (Vercel pode estar pinned em outro branch).
2. Webhook GitHub quebrado/desabilitado.
3. Token de integração expirado/revogado.
4. Política de "ignored build step" no project settings (`vercel.json` ou env `VERCEL_SKIP_BUILD`).

## Workaround / Fix imediato

Após cada `git push origin master` no Disparotey, rodar **na pasta do projeto**:

```bash
cd /c/Users/lluys/Desktop/PROJETOS/Disparotey
vercel --prod --yes
```

- `--yes` pula confirmações; o Vercel CLI já está logado no team `tt-solucoes-projects`.
- Demora ~50s (build cache aproveitado).
- Output termina com `Aliased: https://fluxon-e.vercel.app` quando deu certo.

## Como pegar isso na planta (próxima vez)

- **Antes** de mandar o user testar uma feature recém-pushada, conferir que o deploy realmente saiu: `vercel ls fluxon | head -3` ou `vercel inspect https://fluxon-e.vercel.app --logs | head -2` — se a idade for ≥ minutos atrás do push, o auto-deploy não pegou.
- Não confiar em "push → push deploya". Pra esse projeto: **commit + push + `vercel --prod --yes` sempre, na sequência.**
- Se o user pedir teste end-to-end ("mande um disparo pro meu número") logo após uma mudança de código, fazer o deploy manual **antes** de disparar — senão o teste valida o código velho e vira ruído.

## TODO de investigação (deferido)

- Conferir Settings do projeto `fluxon` em vercel.com (GitHub Integration → Production Branch → autoDeployments).
- Conferir webhook do GitHub repo `eduardotkfm-maker/Disparotey` (Settings → Webhooks → Vercel).
- Se ambos OK, abrir issue/ticket Vercel.

## Notas

- Decisão temporária do operador: aceitar deploy manual. Tempo de 50s é tolerável quando se tá mexendo direto no projeto. Custo de investigar > benefício enquanto a frequência de deploy for baixa.
- ⚠️ **Correção 2026-05-15**: A nota anterior afirmava que o **FluxonApp** tinha auto-deploy funcionando. **É falso.** Confirmado em 2026-05-15 via `vercel ls fluxonapp`: último auto-deploy foi 15h antes do push, ou seja, **não disparou**. O projeto `fluxonapp` em `tt-solucoes-projects` também exige `vercel --prod --yes` manual, exatamente como o `fluxon` (Disparotey). Conclusão prática: **todos os projetos Vercel em `tt-solucoes-projects` deployados via CLI por `tomasbalestrin` herdaram o mesmo gap de integração GitHub→Vercel**. Tratar como regra: nesse team, sempre `vercel --prod --yes` depois do push, sempre conferir `vercel ls` antes de afirmar "está em prod".
- Ver [[L013-multiplas-sessoes-claude-paralelas-mesmo-repo]] pro padrão completo de "nunca afirmar deploy sem verificação direta".
- ⚠️ **Reincidência 2026-05-19/20 (ocorrência #3, FluxonApp)**: o Bruto fez 4 commits numa sessão noturna (`d854d69` foto+descrição em criar grupos, `2a1fb3d` filtro chip ativo, `27c694b` fix seletor, `5ea903f` STATE) e **afirmou "Vercel auto-deploya" após cada push** — repetindo o erro exato que esta lição proíbe. No dia seguinte o operador (Eduardo) reportou "o menu não mudou". `vercel ls fluxonapp` mostrou último deploy 19h antes (anterior aos commits). Fix: `vercel --prod --yes` → todos os 4 commits foram ao ar de uma vez. **Lição reforçada**: o gap GitHub→Vercel em `tt-solucoes-projects` é PERMANENTE e CONHECIDO; afirmar "auto-deploya" é mentira documentada. Regra dura, sem exceção: **todo `git push` num projeto desse team é seguido de `vercel --prod --yes` na pasta do projeto, e NUNCA dizer "está em prod" sem `vercel ls` confirmando idade < push.** Se a feature for testável pelo operador, deployar ANTES de avisar que está pronta.
