---
type: decision
id: D008
title: "Afrouxa vercel --prod e supabase db push (viraram rotina, não excepcionais)"
date: 2026-05-15
status: accepted
owner:
  - "[[Bruto]]"
affects:
  - "[[D002]]"
supersedes:
related:
  - "[[D002]]"
---
# D008 — Afrouxa `vercel --prod` e `supabase db push`

## O quê

Tira **3 regras** da lista `permissions.ask` do `.claude/settings.json` do harness:

- `Bash(vercel --prod:*)`
- `Bash(vercel deploy --prod:*)`
- `Bash(supabase db push:*)`

Esses comandos agora rodam **sem perguntar** (caem no `Bash` bare que está em `allow`).

**Mantém em `ask` (não mexer):**

- `vercel rm` / `vercel remove` (deleta projeto inteiro)
- `supabase db reset` (apaga banco)
- todos os `git push --force/-f/--force-with-lease/--delete`
- todo destrutivo de FS (`rm -rf`, `find ... -delete`, `chmod -R`, etc.)
- `npm publish`, `gh release`, `gh repo delete`
- `terraform apply/destroy`, `kubectl delete`, `flyctl deploy`, `docker prune`

## Por quê

D002 (postura agressiva) define que confirma só o **irreversível**. Na prática, na sessão Sofia + Obsidian (2026-05-15), o usuário autorizou `vercel deploy --prod` ~5x e `supabase db push` 1-2x **sem revisar nada** — viraram caminho canônico:

- **`vercel deploy --prod`**: deploy normal de Next.js. Vercel **mantém histórico** e rollback é 1-click. Se algo der ruim em prod, reverter custa <30s. Não é irreversível na prática.
- **`supabase db push`**: aplica migrations da pasta `supabase/migrations/`. Migrations passam por review humano antes de virarem arquivo (Kimiko escreve, Luz Estrela revisa). Quando chega no `push`, já passou pelo gate. O `push` em si só executa SQL já aprovado.

O `ask` desses dois tava virando ritual sem conteúdo — usuário aprovava em loop. Custo da fricção > benefício do freio adicional.

**O que continua sendo freio real:**

- `vercel rm` apaga projeto (não tem undo). Esse fica em `ask`.
- `supabase db reset` **dropa** o banco. Esse fica em `ask`.
- A regra textual em `docs/autonomy.md` ainda manda parar pra **migração de schema destrutiva** (DROP/TRUNCATE/ALTER ... DROP, migration `down` em prod) — não-expressável em regra estática, depende do julgamento da persona ao escrever a migration.

## Aplica quando

- **Deploy**: `vercel --prod` roda direto. Persona não precisa pedir confirmação textual também — se tá no plano da sessão, executa.
- **Migration**: `supabase db push` roda direto **se** a pasta `supabase/migrations/` foi revisada (Kimiko escreveu + Luz Estrela aprovou). Se a persona está escrevendo migration nova e ainda não passou pelo gate, **aí sim** confirma antes do push.

## Consequências

- Sessões fluem mais rápido em projetos que deployam frequente (SUPORTE, Fluxon, FluxonApp, Bethel Anúncios, Bethel Metrics).
- Risco: deploy de prod errado **passa**. Mitigação: Vercel mantém histórico/rollback; persona MM deve mencionar "deploy efetuado, rollback disponível em `vercel rollback`" ao reportar.
- Risco: migration mal-escrita aplica. Mitigação: o gate humano fica no **arquivo `.sql`** (revisão), não no `db push` (execução do que já foi revisado).

## Alternativas consideradas

1. **Manter como estava** (continuar perguntando): rejeitada — usuário sinalizou explicitamente que está chato (sessão 2026-05-15 "vcs ainda pedem muitas autorizações pra mim").
2. **Tirar tudo do `ask`** (incluindo `force-push`, `rm -rf`): rejeitada — esses são genuinamente irreversíveis e o usuário não pediu pra afrouxar todos.
3. **Override por sessão** (`settings.local.json`): rejeitada — usuário escolheu explicitamente "No harness, pra todos os projetos" (escolha durável, não por sessão).
