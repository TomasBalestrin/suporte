---
type: project
name: Fluxon
aliases:
  - Fluxon
  - Disparotey
  - fluxon
folder: C:/Users/lluys/Desktop/PROJETOS/Disparotey
stack: [nextjs, supabase, meta-cloud-api, openai, resend, baileys]
deploy: vercel
status: active
mapped_by: "[[Francês]]"
mapped_at: 2026-05-11
last_touched: 2026-05-15
related: ["[[FluxonApp]]", "[[L012]]"]
---

# Projeto: Fluxon (pasta: Disparotey)
> Notas que ajudam o time a trabalhar neste projeto sem re-perguntar. Curto e factual. Decisão local do projeto vai no `.specs/project/STATE.md` dele, não aqui — aqui é o resumo "como funciona / o que lembrar".
> Mapeado por: Francês (brownfield), 2026-05-11. Fonte: docs do próprio projeto + leitura da estrutura.

## O que é
- Plataforma interna da Bethel Educação: captura/triagem de leads, disparo de mensagens WhatsApp (template Meta Cloud API) e entrega automática de infoprodutos pós-compra. Inclui fluxo de convite → grupo de WhatsApp → mentoria, e a IA "Sofia" (OpenAI) pra suporte/follow-up. (Nome anterior: "Disparotey" — tokens de webhook mantidos com o nome antigo por compatibilidade.)
- **Pasta**: `C:/Users/lluys/Desktop/PROJETOS/Disparotey` (produto: "Fluxon")  ·  **Stack**: Next.js 16 (App Router) + React 19 + TS + Tailwind 4 + shadcn/Radix; Supabase (Postgres+Auth+RLS); OpenAI; Resend (email)  ·  **Deploy**: Vercel (projeto `fluxon`, team `tt-solucoes-projects`), prod `https://fluxon-e.vercel.app`, alias legado `https://disparotey.vercel.app`; cron Vercel a cada 5min
- ⚠️ Não confundir com "FluxonApp" (WhatsApp multi-chip, repo separado, ref `kxx... outro`) — é outro projeto. Aqui WhatsApp = Meta Cloud API (não Baileys, exceto o side-service de grupos abaixo).
- IDs/refs: Supabase ref `citwaazfegjixoaupzxj` (confirmado em `CLAUDE.md`); token CLI em `.env.local` como `SUPABASE_ACCESS_TOKEN`; sem git remote — deploy via `npx vercel --prod`.

## Arquitetura em 30s
- Front: Next.js App Router em `src/app/` — `/dashboard/*` (leads, listas, logs, dicionário/templates, produtos, entregas, clientes, webhooks, metricas, grupos, sofia/*, chat); rota pública `/r/[code]` = redirect de link trackeado (RPC `registrar_clique`); middleware em `src/proxy.ts` (auth bypass por `AUTH_BYPASS=true`, default).
- Back/API: route handlers em `src/app/api/*` — `webhook/compra` (Hotmart+PagTrust), `webhook/whatsapp` (status Meta), `cron/{disparo,carrinhos,convite-mentoria,alertas}`, `disparo/*`, `listas/*`, `grupos/*`, `chat/*`, `metricas`, etc. Lógica core em `src/utils/` (`disparo.ts`, `enviar-template.ts`, `upsert-lead.ts`, `link-tracker.ts`, `sofia/*`, `convite-mentoria-handler.ts`).
- Fluxo principal: lead entra (Google Sheets webhook / CSV-XLSX / compra) → dedup por telefone (`upsert-lead.ts`, UNIQUE em `telefone`) → triagem (Aguardando/Qualificado/Mentorado/Cliente) → disparo WhatsApp por lista ou cron → logs. Compra aprovada → entrega de infoproduto via template Meta (+ email opcional via Resend). Convite mentoria: cron `/api/cron/convite-mentoria` → Step1 (template `convite_mentoria_cleiton_step1`) → clique "Quero participar" → Step2 com link do grupo WhatsApp (`chat.whatsapp.com/...`). Métricas espelhadas pro projeto Bethel-Motores via webhook.
- Banco: Supabase. Tabelas principais: `leads_brutos` (telefone UNIQUE, `bloqueado_meta`, `reembolsado`, `dados_formulario` jsonb, `data_lead` é `date`, `grupos_whatsapp[]`, `entrou_grupo_em`/`saiu_grupo_em`), `dicionario_ads_copy` (templates por campanha), `logs_disparo`, `remetentes` (credenciais Meta — NÃO vêm de .env), `listas_salvas`, `agendamentos_disparo`, `produtos` (slugs text[], `email_ativo`/`url_acesso`/`login_instrucao`), `entregas`, `clientes`, `carrinhos_abandonados`, `webhook_debug`, `link_clicks`, `lista_mentorados` (blacklist), `convites_config`, e schema do service Baileys: `grupos_meta`, `service_heartbeat`, `service_commands`, `service_logs`, `lid_mapping`, `aquecimento_queue`. Migrations em `supabase/migrations/`.
- Serviço Baileys: `fluxon-grupos-service/` — service Node.js separado, **READ-ONLY** (lê só metadata de grupos, nunca envia, exceto a fila de "aquecimento"). Roda **no PC do operador** (não em VPS), pareado no chip dedicado `554999742914`. Status: implementação 100%, **smoke test pendente desde 25/04** (não está rodando 24/7; quando o PC desliga, eventos param e o re-sync horário recupera). Limitação crítica: WhatsApp Multi-Device esconde telefone real de membros (LID anônimo) — daí a fila de "aquecimento" (envia 1 msg pra forçar interação). Tem também uma extensão Chrome (`extensao-fluxon-sync/`) que lê membros do WhatsApp Web e manda pro `/api/grupos/sync`.

## Como rodar localmente
- Front: `npm install` → `npm run dev` (porta 3000). `npm run build` / `npm run test` (vitest). Lint: `npm run lint`.
- Env vars (em `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `META_API_TOKEN`/`META_PHONE_ID` (fallback legado — credenciais reais ficam em `remetentes`), `META_WEBHOOK_VERIFY_TOKEN`, `WEBHOOK_SECRET`, `WEBHOOK_RENDA_CORTE` (renda mín. p/ qualificar; prod=15000 desde 25/04, era 30000), `CRON_SECRET`, `HOTMART_WEBHOOK_TOKEN`, `PAGTRUST_WEBHOOK_TOKEN`, `AUTH_BYPASS` (default `true`), `RESEND_API_KEY` (set em Vercel prod), `OPENAI` key, opcionais `HOTMART_HMAC_SECRET`/`PAGTRUST_HMAC_SECRET`/`RESEND_FROM_DOMAIN`/`RESEND_REPLY_TO`. Token Supabase CLI: `SUPABASE_ACCESS_TOKEN` no `.env.local`.
- Supabase: `export SUPABASE_ACCESS_TOKEN=... && npx supabase db query --linked "SQL"` (já linkado a `citwaazfegjixoaupzxj`). Migrations: ver script global de aplicar SQL (MEMORY).
- Service Baileys: `cd fluxon-grupos-service && npm install && cp .env.example .env` (preenche `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) → `npm start` → escaneia QR (1x; sessão em `auth/`).

## Armadilhas / "não faça"
- **⚠️ Vercel NÃO auto-deploya commits desse projeto** — após `git push origin master`, rodar `vercel --prod --yes` manualmente. Detalhe e workaround em [[L012]]. Reproduziu 2x na sessão de 14/05.
- **Não renomear a pasta `Disparotey/`** — quebra paths/symlinks; manter o alias `disparotey.vercel.app` ativo 6-12 meses (webhooks externos ainda apontam pra lá). Auditar paineis Hotmart/PagTrust em 2026-Q3 e migrar pra `fluxon-e.vercel.app` sem desligar o legado.
- **Formatação SSR-safe**: NUNCA `toLocaleString('pt-BR')` nem `date-fns format()` com locale em SSR — usar `fmtDataBR`/`fmtDataBRs`/`dataBR`/`fmtPhone`/`fmtMoeda` de `src/lib/utils.ts` (UTC → UTC-3 por subtração).
- **`bloqueado_meta` / `reembolsado`**: TODOS os endpoints de disparo filtram `.eq('bloqueado_meta', false)` + `reembolsado=false`. Entregas de produto (webhook compra) NÃO filtram — comprador recebe mesmo bloqueado. Bug recente (fix 2026-05-11): o handler de compra dava `return` precoce em lead bloqueado e pulava a entrega por email — corrigido; backfill manual do Rodrigo Colombelli ainda pendente (ver STATE).
- **Rate limiting**: todo envio em lote = batches de 10 + 1s delay (~10 msg/s); `maxDuration=300` nas routes de disparo; `SAFE_LIMIT=500` por disparo (era 900, baixou após timeout). Validação telefone BR: regex `^55\d{2}9\d{8}$`.
- **3 endpoints de disparo com lógica espelhada** (`/api/listas/[id]/disparar`, `/api/cron/disparo`, `/api/disparo/lista`) — divergência conhecida: auto-split novo (todas as N partes de uma vez) só vive no `listas/[id]/disparar`; o cron tem o split velho (1 continuação). Consolidação = "Frente 3" do SDD (agendada 2026-05-15, só especificação, sem merge automático).
- **Service Baileys / LIDs**: WhatsApp Multi-Device esconde telefone real; ser admin não resolve; o chip Cleiton (Cloud API 9907/9929) **NÃO pode ser pareado no Baileys** (conflito + risco de ban). Soluço de "aquecimento" não testado em produção.
- **Apps Scripts (Google Sheets)**: usar a versão **batch** (`docs/google-apps-script.js`) com trigger de 30min — a versão antiga faz 1 fetch por linha dentro do loop e estoura a quota `premium urlfetch` da conta Google (já aconteceu 2x).
- **Sofia (OpenAI)**: se quota OpenAI estoura → 86% das conversas caem em `ia_indisponivel` (sintoma silencioso, custo USD=0). Kill switch: `UPDATE system_flags SET value='true'::jsonb WHERE key='sofia_kill_switch'`. Templates Meta de convite: a maioria é só Quick Reply (sem CTA URL) — convite Step1 free-form falha 97% sem janela 24h, por isso virou template.
- **Detector de apuro (`urgente`)**: `src/utils/sofia/detector-apuro.ts` marca `conversas.urgente=true` via regex em mensagens inbound de texto (palavras tipo "urgente", "preciso resolver", "emergência"). Sobe pra topo da inbox + alerta. False positives são comuns; op limpa manualmente pelo botão **"Remover urgente"** no header do chat (endpoint `PATCH /api/chat/conversas/[id]/urgente` zera flag+motivo+timestamp). NÃO desliga a feature global — caso a caso.
- **Handlers de botão Meta** (em `webhook/whatsapp/route.ts`): cada Quick Reply de template tem handler dedicado em `convite-mentoria-handler.ts`. Botões existentes: `Entrar no Grupo VIP` (template de entrega → `processarCliqueEntrarGrupoVip` com dedup/filtro), `Entrar no Grupo` (template `mentoria_cleiton_*_base_*` → `processarCliqueEntrarGrupoMentoria`, sem dedup/filtro). Match no payload é case-insensitive + EXATO (`buttonPayloadLower === 'entrar no grupo'`). **Plugar novos handlers ANTES dos existentes** no if-chain pra evitar bate-bate (ex.: novo "entrar no grupo X" tem que checar `!isCliqueGrupoVip` antes). Link do grupo oficial atual: constante `URL_GRUPO_OFICIAL_MENTORIA` no topo do `convite-mentoria-handler.ts` (não env var, rotaciona ali).
- **Dívida de duplicação** mapeada em `AUDIT_FLUXON_DUPLICACOES.md` (fmtPhone/fmtMoeda em 5+ arquivos, status color maps, modal overlay CSS) — em parte já resolvida (V1/V2 cleanup, -3260 linhas, abr/25); o resto é P3.

## Estado atual
- Em produção, ativo, mexido quase diariamente. Repo no master `https://fluxon-e.vercel.app`. Detalhe vivo em `.specs/project/STATE.md` (grande — última entrada 2026-05-11: fix `bloqueado_meta` no webhook de compra + feature "Resolver entrega bloqueada" no dashboard).
- **Sessão 2026-05-14**: 3 features em prod (3 commits, 3 deploys manuais via CLI — ver [[L012]]):
  - Handler `processarCliqueEntrarGrupoMentoria` (template novo `mentoria_cleiton_*_base_julia/cleiton`). Disparo de validação: 1000 leads da `base_julia`, 7 cliques "Entrar no Grupo", Sofia respondeu 7/7 (100%).
  - Modais de disparo (`ListasSalvas.tsx`) com largura ampliada: `size="md"` (era sm) + `max-w-xl` no confirm dialog — elimina scroll horizontal em listas com inconsistentes.
  - Botão "Remover urgente" no header de `/dashboard/chat` (limpa false positive do `detector-apuro`).
- Em curso: feature `email-entrega-transacional` (Resend) — T1-T13 prontas e em prod, **T14 (UAT) bloqueada** aguardando user configurar domínio em resend.com/domains + DNS (SPF+DKIM), depois setar `RESEND_FROM_DOMAIN`/`RESEND_REPLY_TO` em Vercel.
- Pendências grandes: smoke test do service Baileys (25/04); consolidação dos 3 endpoints de disparo (Frente 3, agendada 15/05); paginação server-side nas tabelas grandes; webhook auto pra mentorias; backfill manual Rodrigo.
- `.specs/codebase/` tem ARCHITECTURE/STACK/STRUCTURE/CONVENTIONS/INTEGRATIONS/CONCERNS/TESTING/SERVICE_ROLE_AUDIT (mapeamento de abr/14, ainda útil).

## Pessoas / contexto
- Mentores/remetentes recorrentes nos disparos: Cleiton Querobin, Julia Ottoni (templates `mentoria_ao_vivo_*`, `convite_mentoria_cleiton_*`, `followup_aula_*`). Bethel Educação é a empresa.
- Incidente recente: Rodrigo Colombelli (`5549984096919`) — comprou IMPLEMENTAÇÃO CLEITON, lead `bloqueado_meta`, não recebeu o produto; backfill manual pendente.
- Métricas integram com o projeto **Bethel-Motores** (outro repo) via webhook — mudanças no payload de mentoria afetam a tela "Disparos" de lá.
- Prazo recorrente: cron Vercel cada 5min (disparo, carrinhos); cron convite-mentoria a cada 15min; mentorias ao vivo têm janelas datadas (ex.: 21/04, 05/05) que ativam/desativam `convites_config.ativo`.

## Fontes
- `CLAUDE.md` (raiz — descrição completa do sistema, ~470 linhas), `README.md`, `00_COMECE_AQUI.md`, `AUDIT_FLUXON_DUPLICACOES.md`, `OTIMIZACOES_SUPABASE.md`, `package.json`, `.specs/project/STATE.md`, `fluxon-grupos-service/README.md`, `extensao-fluxon-sync/README.md`, `src/app/r/[code]/route.ts`, listagem de `supabase/migrations/` e `.specs/` (codebase + features). (Os SDD_*.md da raiz são material genérico de metodologia, não específicos do produto.)
