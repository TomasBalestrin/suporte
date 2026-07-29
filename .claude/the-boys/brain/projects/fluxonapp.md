---
type: project
name: FluxonApp
aliases:
  - FluxonApp
  - fluxonapp
folder: C:/Users/lluys/Desktop/PROJETOS/fluxonapp
stack: [nextjs, supabase, baileys, vercel, hetzner]
deploy: vercel + vps-hetzner
status: active
mapped_by: "[[Francês]]"
mapped_at: 2026-05-11
updated_at: 2026-05-15
related: ["[[Fluxon]]", "[[L010-whatsapp-lid-pn-dichotomy]]"]
---

# Projeto: FluxonApp
> Notas que ajudam o time a trabalhar neste projeto sem re-perguntar. Curto e factual. Decisão local do projeto vai no `.specs/project/STATE.md` (ou `STATE.md`) dele, não aqui — aqui é o resumo "como funciona / o que lembrar".
> Mapeado por: Francês (brownfield), 2026-05-11. Fonte: docs do próprio projeto + leitura da estrutura.

## O que é
- Plataforma de disparo/atendimento WhatsApp **multi-chip via Baileys** (API não-oficial — fora da Cloud API da Meta): disparos em massa, mídia, templates `{{nome}}`/`{{phone}}`, agendamento, chat inbound/outbound, gestão de grupos (broadcast, boas-vindas, automações), warming de chips e webhooks de saída.
- **Pasta**: `C:/Users/lluys/Desktop/PROJETOS/fluxonapp`  ·  **Stack**: Next.js 16 (App Router, React 19) + Supabase (Postgres + Auth + Storage) + shadcn/Tailwind 4 + base-ui ; service Node standalone (Baileys, porta 3031) + Caddy + Docker Compose  ·  **Deploy**: front no **Vercel**, service Baileys numa **VPS Hetzner** — em produção desde 2026-05-10.
- IDs/refs (dos docs): Supabase project ref `lujfqkffrjxrddxfakjr` (FluxonAPP / São Paulo) · Vercel: projeto `fluxonapp`, team `tt-solucoes-projects` (Pro), URL `https://fluxonapp.vercel.app` · VPS Hetzner `fluxonapp-prod`, IP `89.167.78.26`, HTTPS via `89.167.78.26.nip.io` (Caddy + Let's Encrypt) · login compartilhado da equipe: `admin@bethel.com`. Credenciais ficam em `.env.local` (dev, gitignored) e `.env` na VPS (chmod 600); `SUPABASE_ACCESS_TOKEN` (CLI) está em `Disparotey/.env.local`.
- ⚠️ Não confundir com "Fluxon" (ex-Disparotey, ref `citwaazfegjixoaupzxj`, pasta `C:/Users/lluys/Desktop/PROJETOS/Disparotey`) — é outro projeto (Fluxon oficial via Cloud API da Meta). Aqui é "FluxonApp", o paralelo via Baileys.

## Arquitetura em 30s
- Front: Next.js 16 App Router em `src/app/` — `dashboard/` (chips, chat, grupos, contatos, listas, disparos, templates, warming, webhooks-out) + `login/` + `api/` (~30+ route handlers que falam com Supabase e fazem proxy pro service). Middleware faz o auth gate. Sem RLS — endpoints usam `createServiceClient()`.
- Back/API: as `src/app/api/*` rotas servem o front; chamadas ao service Baileys passam por `src/lib/service-fetch.ts` usando `SERVICE_URL` + header `x-service-secret`.
- Serviço externo: **service Baileys** em `service/` (Node, porta 3031) — `index.js` + `lib/` com workers (`dispatch-worker`, `scheduler`, `warming-worker`, `lote-worker`, `welcome-worker`, `group-automation-worker`, `backup-worker`) e handlers (`chip-session`, `chip-manager`, `message-handler`, `groups-sync`, `lid-resolver`, `webhook-emitter` etc). Processo Node permanente — não cabe em serverless, por isso vive na VPS. Auth dos chips em `service/auth/<phone>/` (gitignored; em prod é volume nomeado `service-auth`); backups das creds Baileys no bucket Supabase `chip-auth-backups` (a cada 6h via `BackupWorker`).
- Banco: Supabase ref `lujfqkffrjxrddxfakjr`. Tabelas principais: `chips, contatos, listas, listas_membros, templates, disparos, disparos_envios, conversas, mensagens, grupos, grupos_membros, grupo_eventos, grupo_automacoes, grupo_conjuntos, disparos_grupo, broadcasts_lote, warming_lids, warming_config, warming_envios, wa_contatos, webhook_endpoints, boas_vindas_fila` + `auth.users`. Buckets Storage: `media-disparos`, `chat-media`, `chip-auth-backups`. RPCs atômicas: `increment_disparos_enviados/erros`, `resolve_warming_lids`. ~35 migrations em `supabase/migrations/`.
- Infra prod: Vercel (front, deploy via `vercel deploy --prod` CLI — git connect pendente) + VPS Hetzner `89.167.78.26` rodando `deploy/docker-compose.prod.yml` + `deploy/Caddyfile.prod` em `/root/fluxon/` (service como uid não-root, `REQUIRE_SERVICE_SECRET=true`, logs 700/600). Compose local (`deploy/docker-compose.local.yml`) é o rollback.

## Como rodar localmente
- Front: `cd C:\Users\lluys\Desktop\PROJETOS\fluxonapp && npm run dev` → http://localhost:3000 (3002 se 3000 ocupada pelo Disparotey). Outros scripts: `npm run build`, `npm run start`, `npm run lint`.
- Service Baileys: `cd ...\fluxonapp\service && npm start` → sobe na 3031 (espera `[Scheduler] iniciado` + `up on http://localhost:3031` + `supabase client OK`). Ou via Docker: `cd deploy && docker compose -f docker-compose.local.yml up -d --build`.
- Para a Vercel chamar o service local, antigamente usava ngrok + `SERVICE_URL` na Vercel (URL mudava a cada restart). Em produção `SERVICE_URL=https://89.167.78.26.nip.io`. Segredos em `.env.local` (dev) e `.env` da VPS; aplicar migration nova = `npx supabase db query --linked -f supabase/migrations/...` com `SUPABASE_ACCESS_TOKEN` (de `Disparotey/.env.local`) + `SUPABASE_DB_PASSWORD` exportados.
- ⚠️ Este Next.js é "custom" (per `AGENTS.md`): ler `node_modules/next/dist/docs/` antes de escrever código novo. `next.config.ts` tem `experimental.proxyClientMaxBodySize: '50mb'` (default do Next 16 é 10MB e trunca body silenciosamente).

## Armadilhas / "não faça"
- **Dupla conexão de chip mata a sessão**: um mesmo número não pode estar conectado em dois services ao mesmo tempo (dev local **e** VPS) — o WhatsApp derruba uma ponta. Não subir `docker-compose.local.yml` enquanto a VPS estiver com os chips conectados.
- **`statusCode=401 "Stream Errored (conflict)"` é fatal**: significa outra sessão WhatsApp Web aberta no mesmo número. NÃO insistir em re-parear na hora — revogar todas as sessões web no celular do dono, esperar 5-10min, parear UMA vez. Múltiplas tentativas rápidas = padrão suspeito = ban temporário ~24h (já aconteceu com o chip "Tati").
- **VPS não é git clone**: `/root/fluxon/` na VPS NÃO é git repo (owner uid 197609 = veio de Windows via scp). Deploy do service = `scp` dos arquivos `service/lib/*.js` modificados pra `root@89.167.78.26:/root/fluxon/service/lib/` + `cd /root/fluxon/deploy && docker compose -f docker-compose.prod.yml build fluxonapp-service && docker compose -f ... up -d fluxonapp-service`. Container `deploy-fluxonapp-service-1` (healthcheck 30s contra `:3031/health`). Chave SSH: `~/.ssh/oracle_fluxonapp` (nome legado). Os 3 chips reconectam automático via volume `service-auth` (~10-30s). O `SERVICE_SECRET` de prod não é versionado — vive só na `.env` da VPS (`/root/fluxon/.env`) e nas env vars da Vercel; precisa bater nos dois.
- **Migrations Supabase via `pg` direto** (não `supabase db push`): conn string `postgres://postgres:<SUPABASE_DB_PASSWORD>@db.<SUPABASE_PROJECT_REF>.supabase.co:5432/postgres` com `ssl: { rejectUnauthorized: false }` (Supabase usa self-signed cert). Creds em `.env.local`. `supabase/` no projeto NÃO tem `config.toml` — não há CLI configurado.
- **WhatsApp LID↔PN dichotomy**: `key.remoteJid` em `messages.upsert` pode chegar como `@lid` (anônimo) OU `@s.whatsapp.net` (PN) pra mesma pessoa — sem resolver, criamos 2 conversas. Resolver via `jid_aliases` table + `service/lib/jid-resolver.js#resolveJid()` ANTES de `persistMessage`. Detalhes: [[L010-whatsapp-lid-pn-dichotomy]]. Aliases populados a partir de `wa_contatos` (canônico) + `grupos_membros.telefone` (fallback Meta-resolved). RPCs `populate_jid_aliases_from_groups` + `consolidate_lid_conversas` rodam após cada `syncGroups`.
- **NUNCA `npm run build` enquanto `npm run dev` roda** — brigam pelo `.next/` e o dev server vira zumbi (HTTP 200 com body vazio). Recuperar: matar o processo da porta + `rm -rf .next` + `npm run dev`.
- **Sempre resolver JID via `sock.onWhatsApp(phone)` antes de enviar**: números brasileiros pré-2014 estão registrados no WhatsApp sem o 9 do celular — concat direto `phone+'@s.whatsapp.net'` faz a Meta aceitar (retorna wamid) mas a msg não é entregue. `ChipSession.resolveJid()` cuida disso.
- **Bulk insert com `onConflict` exige dedup do chunk em memória** (Postgres não deixa `ON CONFLICT DO UPDATE` tocar a mesma row 2x na mesma INSERT).
- **Broadcast em grupo tem 7 salvaguardas duras** (hard-lock só admin na UI e no endpoint, confirmação dupla com delay 3s, audit em `disparos_grupo`, sem `@everyone`, sem agendamento, rate limit 3/grupo/24h + 10/chip/24h). Não relaxar — spam em grupo de terceiro não é caso de uso suportado.
- **Sem RLS, sem testes automatizados**: validação de fix = `npm run build` (TS + lint) + `node --check` no service. Higiene: nunca colocar secret/key literal em arquivo versionado (`STATE.md` inclusive — só referência opaca).
- Tatiane (`5549998370598`) está `desconectado` na DB de propósito — não deletar a linha, não tentar reconectar sem ordem.

## Estado atual
- **EM PRODUÇÃO desde 2026-05-10**, v1.0.0 (tag em master): front Vercel + service Baileys na VPS Hetzner, 3 chips conectados (Jessica `5521992305435`, Carlos `5549999742914`, EQUIPE CLEITON `5549993190387`). Equipe usa login compartilhado `admin@bethel.com`.
- **APK Android (Capacitor v3.0.0+)** sideload pra equipe Bethel — `appId=com.bethel.fluxon`, `server.url=https://fluxonapp.vercel.app` (WebView nativo, sem barra Chrome). Logo verde WhatsApp `#25D366`. Keystore em `C:/tmp/fluxonapp-twa/android.keystore` (mesma SHA-256 → updates in-place). Sem iOS, sem Play Store. APK fora do repo.
- Feature `ui-overhaul` (3 ondas + polish + fix de message-types) entregue. **Mobile redesign continuado em ondas (Telegram-inspired)**: Onda 0 (canon `PageHeader`/`DenseListItem`/`ChipBadge`/`BottomSheet`/`CapacitorBootstrap`/`SwRegister`), Onda 1 (PageHeader em todas as 8 telas dashboard), Onda 2 (BottomSheet substitui Dialog em ~10 componentes; `contentClassName` recupera largura desktop), **Onda 3 (2026-05-15) swipe gestures via Pointer Events nativos** (`SwipeableRow` canon — chat: silenciar/arquivar; disparos: pausar/apagar/refazer). Onda 4 (virtualização) deferida.
- Tema grafite (3-way claro/escuro/grafite). Features pós-deploy entregues: `grupos-automacoes` (`GroupAutomationWorker` poll 60s), `caminho-mentoria` Leva 1 (conjuntos + endpoint pro Disparotey), `disparos-teste/send` (botão "Enviar teste" no disparo em lote, cap 10 destinatários), upload-vídeo grande via presigned URL Supabase (bypass limite 15MB Vercel), MentoriaFollowupWorker mutex `_tickRunning` (fix duplicação) + override chip via env `MENTORIA_FOLLOWUP_CHIP_PHONE`.
- **Fix arquitetural LID↔PN (2026-05-15)**: tabela `jid_aliases` + RPCs `populate_jid_aliases_from_groups` + `consolidate_lid_conversas` + resolver no service. Ver [[L010-whatsapp-lid-pn-dichotomy]].
- **Vulns (2026-05-15)**: Next 16.2.4→16.2.6 (middleware bypass + cache poisoning). xlsx → `read-excel-file/browser` (prototype pollution + ReDoS, sem fix oficial). 7→2 vulns (postcss CVE transitive via Next = falso-positivo).
- Follow-ups abertos (não bloqueiam): git connect Vercel↔GitHub (deploy é CLI), `supabase gen types`, retention de logs >30d, worker periódico de lid-resolver/consolidate, dívida de tipo `Chip` duplicado, ~28 routes que hardcodam `status: 502` no proxy pro service, 3 untracked do upload-vídeo (Eduardo decide commit), push notification (Fase 2.5, SW vazio). Fase 2 do deploy (abrir externo: RBAC real, multi-tenant, domínio `.com.br`, auth por pessoa) deferida sem prazo.
- Detalhe completo: `C:/Users/lluys/Desktop/PROJETOS/fluxonapp/.specs/project/STATE.md` (canônico) e o `STATE.md` da raiz (mais antigo, histórico de F1-F5 + reskin canon).

## Pessoas / contexto
- **Eduardo** (Eduardo TK / `eduardotkfm-maker`) — dono do produto, decide escopo, provisiona infra (VPS, Vercel), faz UAT; usa o app no celular pra disparos (fluxo crítico Chips→Disparos→Chat), modo "//YOLO" (autoriza merge+deploy direto sem gate de cada onda no `ui-overhaul`).
- Conta Vercel `tomasbalestrin` / `tt-solucoes-projects` (team). Git commits saem como "BETHEL EDUCAÇÃO". Sem prazos rígidos registrados além de "tudo pronto hoje" no dia do switchover (2026-05-10).
- Harness The Boys ativo no projeto (Butcher orquestra, Hughie spec/UAT, Frenchie research, Kimiko execução, Starlight quality gate, Soldier Boy canon, Stan Edgar custo); Gate Ladder por scope (Medium → Starlight→Butcher; Large/Complex → Kimiko→Starlight→Hughie→Butcher).

## Fontes
- `README.md` (genérico, boilerplate create-next-app — pouco útil)
- `AGENTS.md`, `CLAUDE.md` (ponteiro pro AGENTS.md)
- `STATE.md` (raiz — histórico F1-F5, bugs, reskin canon, bloco grupos)
- `.specs/project/STATE.md` (canônico — produção, decisões, ondas do ui-overhaul, features pós-deploy)
- `package.json`, `next.config.ts`, `components.json`
- `deploy/README.md`, `deploy/docker-compose.{local,spike,prod}.yml`, `deploy/Caddyfile.{spike,prod}`, `service/Dockerfile`
- Estrutura: `src/app/{api,dashboard,login}`, `src/components/`, `service/lib/`, `supabase/migrations/`
- (não encontrado: `.specs/project/PROJECT.md` — só existe `STATE.md` lá)
