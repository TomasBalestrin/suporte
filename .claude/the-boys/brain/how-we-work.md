---
type: convention
title: Como o usuário trabalha
scope: cross-projeto
updated: 2026-05-13
---

# Como o usuário trabalha

> Convenções gerais. O que é específico de um projeto vai em `projects/<proj>.md`; o que é específico de uma stack vai em `stacks/<stack>.md`. Curto e factual. Marque "(a confirmar)" se não tiver certeza.

## Identidade / contexto

- **Empresa**: MV4 Digital. E-mail: `contato@mv4digital.com.br`. GitHub: `eduardotkfm-maker`.
- **Git user** em alguns repos aparece como `BETHEL EDUCAÇÃO` — confira `git config user.name` no repo antes de assumir.
- **Idioma**: tudo visível ao usuário em **pt-BR** (conversa, specs, docs, commits). Comentários no código seguem o projeto. EN é tolerável em código/dependências.
- **Ambiente**: Windows. Shell: PowerShell (sintaxe PS — `$env:`, não `$VAR`) e Bash (git-bash) disponível pra scripts POSIX.

## Ferramenta de IA

- Usa **Claude CLI** (terminal), **não** a app web/desktop. Não esperar nada de `~/.claude/` como memória/skills do The Boys — o harness é **project-resident** (vive no `.claude/` commitado do projeto). Ver F0 / `docs/install/claude-code.md` do harness.
- **Qualidade antes de custo** (D023): **não poupe Opus se for pra entregar algo bom.** Default Opus quando há qualidade em jogo (arquitetura, código de produção, user-facing, irreversível, "queremos que fique bem feito"); Sonnet no meio-termo conhecido; Haiku **só** pro repetitivo-verificável (bump de versão, journal, varrer log). O Stan Edgar começa em Opus e justifica o downgrade, não o contrário. Ver `docs/cost-tiers.md`.

## Metodologia

- **Spec-Driven Development** (`tlc-spec-driven`): Specify → Design → Tasks → Execute, auto-dimensionado por complexidade. Trigger pra feature nova, refator >3 arquivos, integração externa, migração de schema/infra, ou escopo ambíguo. Pular (ir direto): fix de 1 linha, typo, bump de versão, ajuste isolado ≤3 arquivos.
- **The Boys harness**: 10 personas (Bruto, A Lenda, Hughie, Francês, Kimiko, Soldier Boy, Trem-Bala, Luz Estrela, MM, Stan Edgar). Gate Ladder por scope. Decisões importantes vão em `.specs/project/STATE.md` do projeto.
- Decisões registradas com atribuição (`decided_by: …`), data absoluta, justificativa em 1 linha.

## Autonomia (postura do time)

- **Agressiva** (ver `docs/autonomy.md` do harness): age sem pedir licença pra ação reversível; confirma só o irreversível (force-push, `reset --hard`, `rm -rf` em massa, deploy de prod, migração destrutiva, escrita em API externa de terceiro com efeito real).
- **Push**: a postura libera `git push` normal automático — **mas** quando é release/mudança grande, o usuário costuma querer controlar a publicação. Na dúvida, pergunte antes de pushar; commit local é sempre OK.
- **Nunca sugira encerrar a sessão.** Quem decide quando para é o usuário — não o time, não o horário, não o tamanho do contexto. Terminou uma tarefa? Reporta e oferece o próximo passo, não a saída. (D021.)

## Git / commits

- Commitar/pushar só quando faz sentido pro trabalho; se estiver no branch default, **criar branch antes** (a menos que o usuário diga o contrário).
- Mensagens de commit terminam com:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Corpo de PR termina com:
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- Nunca pular hooks (`--no-verify`) nem bypassar assinatura sem o usuário pedir.

## Stack predominante (Histórica e Nova Direção)

- **Legado/Transição (TS Fullstack)**: React (Next.js/Vite) + TS + Tailwind + Supabase + Vercel. Padrão inicial da MV4. Detalhes em `stacks/nextjs.md` / `stacks/supabase.md`.
- **Nova Direção para Sistemas Estruturados (A partir de Maio/2026)**:
  - **Front e API Glue**: TypeScript (Continua padrão).
  - **Backends Pesados, Integrações de IA e ETL**: **Python** (FastAPI, Pydantic, MyPy). Exige rigor máximo para mitigar tipagem dinâmica (ver `stacks/python.md`).
  - **Motores de Alta Performance e Missão Crítica**: **Rust** (Axum, Tokio). Desenvolvimento lento, hiper-seguro, com Compiler-Driven Development (ver `stacks/rust.md`).
  - **Bancos de Dados**: Além do **Supabase/Postgres**, abertos para adoção de novos motores adequados ao caso de uso (Timescale, Redis pesado, vetoriais puros).
- **Supabase (Uso legado)**: DDL/migrations via `npx supabase db query --linked` ou `scripts/apply-migrations.mjs` usando `SUPABASE_ACCESS_TOKEN`.
- Serviços **Baileys / WhatsApp**: FluxonApp roda um service Node permanente na **VPS Hetzner** (`89.167.78.26`); o Fluxon/Disparotey roda um side-service de grupos no PC do operador. Ver `projects/`.
- ⚠️ **Três projetos "WhatsApp" — não confundir**: FluxonApp (`PROJETOS/fluxonapp`, Baileys multi-chip, ref `lujfqkffrjxrddxfakjr`) ≠ Fluxon (pasta `PROJETOS/Disparotey`, Meta Cloud API, ref `citwaazfegjixoaupzxj`). Confirme **qual** antes de agir. Detalhe: `projects/fluxonapp.md`, `projects/fluxon.md`.
- Projetos mapeados no `brain/projects/`: `fluxonapp.md`, `fluxon.md`, `bethel-anuncios.md`. Outros (Bethel Contratos, Bethel Metrics, etc.) ainda não — quando o time for mexer neles, o Francês mapeia primeiro.

## Preferências

> ⚠️ Esta lista é **observada** dos projetos mapeados (`projects/*.md`) — é o padrão que aparece no código, não um decreto do usuário. Use como default; o usuário pode corrigir/adicionar a qualquer momento (o que ele confirmar explicitamente perde o "(a confirmar)").

- **Front**: React + TypeScript + **Tailwind v4**. Componente: **shadcn/Radix** é o padrão (FluxonApp, Fluxon); FluxonApp também usa base-ui. Routing: Next.js App Router quando é Next; React Router v6 quando é Vite/SPA (Bethel Anúncios). Estilo recorrente: **tema escuro premium** (FluxonApp tem grafite no 3-way claro/escuro/grafite; Bethel Anúncios é navy `#0a0e1a` + azul + gold neon). Cores via token (CSS vars), não hex hardcoded — Soldier Boy enforça; ver também `design-system/ui-pitfalls.md`.
- **Back (TypeScript)**: Vercel Serverless / Next route handlers em `api/`. Processos Node standalone para serviços longos (ex: Baileys). Auth Supabase (podendo não usar RLS como no FluxonApp, confirmar).
- **Back (Sistemas Novos - Python/Rust)**: 
  - **Python**: Obrigatório uso de `Pydantic` e Type Hints totais (`strict=True`). Sem dicts mágicos.
  - **Rust**: Proibido `unwrap()` cego e uso indiscriminado de `.clone()` apenas para calar o compilador. TDD com `cargo check` contínuo.
- **Banco**: Transição de exclusividade do Supabase para abordagem polyglot de dados, avaliando novos engines. Funções atômicas (RPC) pra contadores/incrementos concorrentes em vez de read-modify-write.
- **IA no produto** (quando há): OpenAI GPT-4o (texto/roteiros) + Google Gemini 2.5 Flash (vídeo) + GPT-4o-mini (tarefas leves). Sempre com **kill switch** e tratamento de quota estourada como estado silencioso (não erro fatal). Se o usuário paga por uso (créditos), cuidar do fluxo de créditos com cuidado.
- **E-mail transacional**: Resend — mas sem domínio próprio o Resend não entrega pra terceiros (remetente vira "Supabase"). Bloqueia recursos de e-mail até o usuário configurar domínio + DNS (SPF/DKIM).
- **Testes**: vitest **quando o projeto tem suíte** (Fluxon: `npm run test`). Mas vários projetos validam só com `npm run build` (TS) + `npm run lint` + (em service Node) `node --check` — **não assuma cobertura de teste robusta**; quando for crítico, escreva o teste.
- **Validação de fix / gate técnico**: `npm run build` (typecheck + lint) sempre; `npm run lint` separado; build com `tsc -b` pega imports não usados (Bethel Anúncios). Nunca `npm run build` enquanto `npm run dev` roda (briga pelo `.next/`).
- **Deploy**: `npx vercel --prod` **manual via CLI** — auto-deploy por push **não está ativo** em nenhum dos 3 projetos web; git connect Vercel↔GitHub é follow-up adiado. (FluxonApp tem também deploy do service na VPS via `tar | ssh`, não git clone.)
- **Next.js "custom"**: em projeto Next, conferir a versão e ler `node_modules/next/dist/docs/` antes de codar — APIs/convenções podem divergir do que o modelo conhece (o `AGENTS.md` do FluxonApp avisa isso explicitamente).
- **Formatação SSR-safe** (projetos com SSR): nunca `toLocaleString('pt-BR')` / `date-fns format()` com locale em SSR — usar os helpers do projeto (`fmtDataBR`/`fmtMoeda`/`fmtPhone` em `src/lib/utils.ts`). Telefone BR: validar `^55\d{2}9\d{8}$`; resolver JID via `onWhatsApp` antes de enviar (números pré-2014 sem o 9).
- **Bulk insert com `onConflict`**: dedup do chunk em memória antes (Postgres não deixa `ON CONFLICT DO UPDATE` tocar a mesma row 2× na mesma INSERT). Envios em lote: batches (~10) + delay (~1s) pra respeitar rate limit.

## Coisas a sempre confirmar (além do que já está no `settings.json`)

> ⚠️ Lista **derivada** das armadilhas dos `projects/*.md` + da postura de autonomia (`docs/autonomy.md`). É inferida — o usuário pode cortar/adicionar; o que ele confirmar explicitamente vira regra (perde o "(a confirmar)") e pode virar `ask`/`deny` no `.claude/settings.json` ou entrada no `CHARTER.md` do projeto.

- **Deploy de produção** — Vercel `npx vercel --prod`, ou o deploy do service na VPS do FluxonApp (`tar | ssh`; o `SERVICE_SECRET` tem que bater na `.env` da VPS **e** nas env vars da Vercel). Confirmar antes. (Já coberto pela postura agressiva — reforçado aqui.)
- **Migração de schema em Supabase de prod** — destrutiva (`DROP`/`TRUNCATE`/`ALTER ... DROP`/migration `down`): confirmar. Não-destrutiva: avisar e mostrar o SQL antes de aplicar.
- **Mexer em credenciais que vivem no banco, não em `.env`** — ex.: tabela `remetentes` do Fluxon (tokens Meta Cloud API por mentor); mexer ali pode derrubar disparos em produção.
- **FluxonApp / chips**: parear ou re-parear um chip, derrubar um chip conectado, ou subir `docker-compose.local.yml` enquanto a VPS está com os chips conectados — confirmar (mata a sessão; tentativas rápidas de re-parear = ban ~24h). O chip Tatiane (`5549998370598`) está `desconectado` na DB **de propósito** — não reconectar nem deletar a linha sem ordem.
- **Fluxon / Disparotey**: renomear a pasta `Disparotey/` ou desligar o alias `disparotey.vercel.app` (webhooks externos ainda apontam pra lá); mexer em `convites_config.ativo` ou nas janelas datadas de mentoria; mexer em `WEBHOOK_RENDA_CORTE` (renda mínima pra qualificar lead — afeta quem recebe disparo). Confirmar.
- **Bethel Anúncios**: `git add -A`/`git add .` (proibido — já vazou `.env.vercel`); liberar uma feature de `preview-mode` pra todos os ~200 users; mexer no fluxo de créditos sem entender. Confirmar.
- **Escrita em API externa de terceiro com efeito real** — enviar mensagem/template em massa (Meta Cloud API, Baileys), disparar push pros usuários (FCM), e-mail em massa (Resend), qualquer coisa que toque Hotmart/PagTrust. Confirmar.
- **`git push`** — normal é auto pela postura agressiva, **mas** em release / mudança grande / quando o repo está sendo publicado, o usuário costuma controlar a publicação. Na dúvida, pergunte; commit local é sempre OK.
- Qualquer coisa que o `CHARTER.md` ou `STATE.md` do projeto específico marque como "sempre confirmar" tem precedência sobre o que estiver aqui.
