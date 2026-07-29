---
type: project
name: Bethel Anúncios
aliases:
  - Bethel Anúncios
  - bethel-anuncios
folder: C:/Users/lluys/Desktop/Cursor/BETHEL-ANUNCIOS
stack: [react, vite, vercel-functions, supabase, capacitor]
deploy: vercel + capacitor-android
status: active
mapped_by: "[[Francês]]"
mapped_at: 2026-05-11
related: []
---

# Projeto: Bethel Anúncios
> Notas que ajudam o time a trabalhar neste projeto sem re-perguntar. Curto e factual. Decisão local do projeto vai no `.specs/project/STATE.md` dele, não aqui — aqui é o resumo "como funciona / o que lembrar".
> Mapeado por: Francês (brownfield), 2026-05-11. Fonte: docs do próprio projeto + leitura da estrutura.

## O que é
- SaaS de marketing digital pra criação de anúncios/criativos: gera roteiros por IA, analisa vídeos de referência ("Inteligência de Criativos" / clone de anúncio vencedor), Biblioteca de Ouro de criativos, esteira kanban de produção, trends-radar, edição assistida (storyboard + TTS + SRT + burn-in) e gamificação (níveis/XP/conquistas/desafios + créditos semanais). Dark theme premium (navy `brand-900` #0a0e1a + azul + gold neon).
- É **web** (Vercel) **+ app mobile Android** via Capacitor (`appId com.bethel.anuncios`, appName "Bethel Ads"). APK em `public/bethel-anuncios.apk`, download via botão no Login só em browser Android.
- **Pasta**: `C:/Users/lluys/Desktop/Cursor/BETHEL-ANUNCIOS`  ·  **Stack**: React 19 + Vite 7 + TypeScript + Tailwind v4; backend = Vercel Serverless Functions (`api/*.ts`); Supabase (Postgres + RLS + Auth + Storage); Capacitor pro Android  ·  **Deploy**: web em https://bethel-anuncios.vercel.app (conta Vercel `tt-solucoes-projects`, plano Pro Plus); APK gerado via Android Studio
- Ecossistema: parte do "Bethel" da MV4 Digital. Relação com `BETHEL-ANUNCIOS-APP` / `bethelanuncios` / `ANALISE DE ANUNCIOS`: **(a confirmar)** — os docs deste repo não mencionam essas pastas; a versão mobile aqui é a branch `app` do próprio repo, não uma pasta separada.
- IDs/refs (só o que está nos docs): Supabase project ref `zguwupsolubmwjtwpfbd`; Firebase project `bethel-anuncios` (service account `firebase-adminsdk-fbsvc@bethel-anuncios.iam.gserviceaccount.com`); repo GitHub `github.com/eduardotkfm-maker/bethel-anuncios` (branch de trabalho: `app`).

## Arquitetura em 30s
- Front: SPA React 19 + Vite + React Router (`react-router-dom` v6). Páginas em `src/pages/` (Dashboard, ScriptGenerator/`/roteiros`, GoldLibrary, AdAnalyzer, AdLibrary, ProductionWorkflow, Editor, Products, Settings, Tutorial, AdminDashboard, Login/AuthCallback/ResetPassword, Privacy/Terms). Contexts: `AuthContext` (auth + Google OAuth + pingLastSeen), `CreditsContext` (créditos + gamificação). `lib/authFetch.ts` injeta JWT automático.
- Back/API: Vercel Serverless Functions em `api/` — `_security.ts` (CORS + JWT + rate limit, `secureEndpoint()`), `_fcm.ts`, `_rateLimit.ts`, `_pexels.ts`. Endpoints: `openai-chat` (roteiros GPT-4o), `gemini-video`/`clone-video` (análise/clone de vídeo), `storyboard-generate`, `burn-subtitles` (ffmpeg-static, `maxDuration: 300`, `memory: 1024`), `pexels-search`/`trends`, `admin-*`, `send-notification`, `claim-challenge-reward`, `user-credits`. Crons em `api/cron/`: `daily-reminder`, `inactivity-reminder`, `refresh-trends`.
- Dev local: `api-dev-server.mjs` emula o runtime serverless da Vercel na porta **3001** (carrega `api/*.ts` via tsx, carrega `.env` via dotenv).
- Mobile: Capacitor → Android (`android/`, regerar após `npm run build`). Plugins: `@capacitor/push-notifications` (FCM remoto), `@capacitor/local-notifications`, `status-bar`, `keyboard`, `browser`, `app`. OAuth no APK via deep link `com.bethel.anuncios://auth/callback`.
- Banco / serviços externos: Supabase (DDL via Management API token / `service_role_key` pra queries server-side — **não** usar conexão Postgres direta, senha mudou). IA: OpenAI GPT-4o (roteiros) + Google Gemini 2.5 Flash (análise de vídeo) + GPT-4o-mini (trends curation, storyboard). Push: Firebase Cloud Messaging V1. Stock footage: Pexels. ElevenLabs (TTS) está planejado mas deferred até `ELEVENLABS_API_KEY`.
- Infra/deploy: Vercel Pro Plus (`maxDuration` até 300s, cron sem limite, 1-min granularidade); Supabase Pro. `vercel.json` define `crons`, `headers` de segurança e rewrite SPA → `/index.html`. **Auto-deploy por push NÃO está ativo** — deploy é manual via `npx vercel --prod --yes`.

## Como rodar localmente
- `npm install`. Frontend: `npm run dev` (Vite, `localhost:5173`). API: `npm run dev:api` (= `npx tsx api-dev-server.mjs`, porta 3001). Ambos: `npm run dev:full`. Build: `npm run build` (= `tsc -b && vite build` — usar `-b`, pega imports não usados). Lint: `npm run lint`.
- Env vars (`.env` local + Vercel Production): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `CRON_SECRET`, `SUPABASE_ACCESS_TOKEN` (só local — Management API). `ELEVENLABS_API_KEY` ainda não configurada (bloqueia o Sprint 3 de TTS).
- Migrations: versionadas em `supabase/migrations/`, aplicadas via Management API (`scripts/apply-migrations.mjs` — atenção: `PROJECT_REF` hardcoded). DDL **não** funciona via `supabase-js`.
- APK: `git checkout app` → `npm run build` → `npx cap sync android` → `npx cap open android` → Android Studio Build → Generate APKs → copiar pra `public/bethel-anuncios.apk`.

## Armadilhas / "não faça"
- **Nunca** `git add -A` / `git add .` sem revisar — já vazou `.env.vercel` uma vez. Adicionar arquivos específicos.
- Toda API nova passa por `secureEndpoint()` de `_security.ts`. `secureEndpoint` default `allowedMethods = ['POST']` — endpoint GET precisa passar `allowedMethods: ['GET']` explícito.
- `tsx` cacheia módulos — editar `.ts` da api não reflete sem reiniciar o `api-dev-server`.
- Vídeo: **nunca** baixar vídeo da Gold Library + converter base64 (estoura limite Vercel 4.5MB) — sempre passar URL. Upload local > 3MB → subir pro Supabase Storage primeiro, mandar URL pro Gemini, limpar depois. Clone de vídeo: usar `cloneVideoServerSide` (`api/clone-video`), não o fluxo cliente antigo.
- CORS: `https://localhost` precisa estar na whitelist (APK usa `androidScheme: https`). `/analisador` é redirect → `/roteiros?tab=clonar`.
- Android: AGP 9.x → usar `proguard-android-optimize.txt` (não `proguard-android.txt`) em `android/app/build.gradle`.
- Créditos: usuários **pagam por IA** — roteiro = 1 crédito, análise de vídeo = 3 créditos, base 50/mês. Após qualquer operação que mexa em créditos, chamar `credits.refresh()` (com `setTimeout 2s` se for pós-insert de log). Não fazer deploy sem entender o fluxo de créditos.
- preview-mode: features novas grandes ficam gateadas por `isAdmin && profiles.preview_enabled`; hook `usePreviewMode()` é o único ponto de leitura. (Exceção: `script-quality-v2` foi pra todos os ~200 users a pedido explícito.)
- Dívidas pré-rollout abertas (aceitas só em preview) na feature `edicao-assistida`: signed URLs 24h persistidas no DB ficam mortas após expirar (deveria salvar path relativo); PDF usa Helvetica WinAnsi-only (perde emojis); caps de input/`scenes.length`/ownership faltando em `storyboard-generate.ts`; bundle 716KB gzip. Detalhes em `.specs/project/STATE.md` (seção Deferred ideas).
- SMTP: Resend sem domínio próprio não envia pra terceiros (remetente aparece como "Supabase"). Bloqueado por falta de domínio próprio.

## Estado atual
- Em produção: site web na Vercel, ~200+ usuários. Feature ativa: **edicao-assistida (Fase 1)** — código completo (Sprints 1, 2, 4, 5, 6) deployed em prod, exceto Sprint 3 (TTS, deferred) e UAT manual. Bug aberto na última sessão (2026-05-07): em `/roteiros` após gerar 2 roteiros o botão "Ir pro Editor" não aparece e `/editor` mostra vazio — hipótese principal: `profile.preview_enabled = false`. Ver pause-point e Active features no `.specs/project/STATE.md`.
- Última feature shipped antes dessa: `seletor-duracao-video` (2026-04-29). Antes: `trends-radar` V2, `script-quality-v2`, `preview-mode` (2026-04-27).
- TODO cross-session pendente: configurar domínio próprio (desbloqueia SMTP, afeta Vercel/Supabase Auth/CORS/deep links do APK).

## Pessoas / contexto
- Empresa: MV4 Digital ("Bethel" ecossistema). Repo GitHub na conta `eduardotkfm-maker`; Vercel na conta `tt-solucoes-projects`. Admin do app: `is_admin` no profile OU email `admin@bethel.com`. (Sem mais nomes/contatos nos docs.)
- O projeto usa o fluxo SDD (`.specs/`) e o harness multi-agente do dono.

## Fontes
- `README.md` (boilerplate Vite, sem valor), `CLAUDE_MEMORY.md`, `ONBOARDING.md` ("Memorial Vivo"), `package.json`, `capacitor.config.ts`, `api-dev-server.mjs`, `vercel.json`, `.specs/project/STATE.md`, listagem de `src/` `api/` `supabase/migrations/`. Não há `PROJECT.md`, `AGENTS.md` nem `CLAUDE.md` na raiz.
