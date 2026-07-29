---
type: project
name: Suporte (Bethel Suporte)
aliases:
  - Suporte
  - suporte
  - bethel-suporte
folder: C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte
stack: [nextjs, supabase, openai, resend, sentry, playwright, vitest]
deploy: vercel
status: active
mapped_by: "[[Francês]]"
mapped_at: 2026-05-14
related: ["[[sofia]]", "[[Fluxon]]"]
---

# Projeto: Suporte (Bethel Suporte)

> Notas que ajudam o time a trabalhar neste projeto sem re-perguntar. Decisão local vai em `.specs/project/STATE.md`. Aqui é o resumo de como funciona.
> Mapeado por: Francês (brownfield), 2026-05-14.

## O que é

- Sistema de suporte ao cliente da Bethel Educação com IA de primeira linha ([[sofia]]), tickets com chat, painel de agente e dashboard analítico.
- **Pasta**: `C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte` · **Stack**: Next.js 16 (App Router) + React 19 + TS + Tailwind 4 + shadcn/Radix; Supabase (Postgres + Auth + pgvector); OpenAI (gpt-4o-mini + text-embedding-3-small); Resend (email); Sentry (erros); Playwright (e2e); Vitest (unit/integration) · **Deploy**: Vercel, team `tt-solucoes-projects`, projeto `suporte`
- IDs/refs: Supabase ref `zeocxcfiyhzsztwjllvl` · URL prod: `https://suporte.bethelsystems.com.br` (confirmado em `.env.example`) · email sistema: `suporte@bethelsystems.com.br`
- **Não é o sistema de suporte do FluxonApp** — este é o portal de suporte *da Bethel Educação* pra clientes dos infoprodutos (Cleiton Querobin, Julia Ottoni, etc.).

## Arquitetura em 30s

- **Portal cliente** (`/suporte`): público, sem auth. Clientes abrem tickets via `/suporte/ajuda` (form → IA → ticket se não resolveu), acompanham pelo token único em `/suporte/ticket/[token]`.
- **Painel agente/admin** (`/admin`): autenticado via Supabase Auth. Rotas: `dashboard`, `tickets`, `tickets/[id]` (chat + ações), `customers`, `analytics`, `settings` (ai-config, knowledge-base, quick-replies, sla, automations, products, categories, tags, users). Admin tem superset de permissões.
- **API** (`/api`): route handlers divididos em `ai/` (chat, feedback), `admin/` (CRUD de configurações, knowledge-base, generate-embeddings), `tickets/` (CRUD tickets, customers, quick-replies, AI suggest, unanswered), `cron/` (sla, automations, follow-up), `upload/`, `csrf/`, `products/`, `categories/`.
- **Banco** (Supabase `zeocxcfiyhzsztwjllvl`): tabelas principais — `users` (agentes/admins), `products`, `categories`, `tags`, `customers`, `tickets` (ticket_code `SUP-YYYY-####`, RLS + SLA trigger), `ticket_tags`, `messages` (sender_type: customer/agent/ai/system), `quick_replies`, `knowledge_base` (embedding vector(1536), pgvector cosine), `ai_config` (runtime config da Sofia), `ai_unanswered_questions`, `ai_feedback`, `sla_configs`, `automation_rules`, `notification_log`, `activity_log`, `ai_conversations`, `ai_conversation_messages`.
- **Crons** (Vercel): SLA monitor a cada 5min, automations a cada 10min, follow-up a cada 1h.
- **Email**: Resend — `suporte@bethelsystems.com.br` para notificações de ticket.
- **Integração Fluxon**: Sofia usa HTTP bridge (`FLUXON_BASE_URL` + `FLUXON_SUPPORT_API_KEY`) pra consultar dados de clientes e executar ações (reenviar entrega). Adicionalmente, WhatsApp chega pelo Fluxon passando `whatsapp_conversa_id` pra manter contexto.

## Como rodar localmente

- `cd C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte`
- `npm install` → `npm run dev` (porta 3000)
- Copiar `.env.example` → `.env.local` e preencher:
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (ref `zeocxcfiyhzsztwjllvl`)
  - `OPENAI_API_KEY` (mesma key do Fluxon ou key separada — ver `.env.local` atual)
  - `RESEND_API_KEY` + `EMAIL_FROM=suporte@bethelsystems.com.br`
  - `CRON_SECRET`, `NEXT_PUBLIC_SENTRY_DSN` (opcional)
  - `FLUXON_BASE_URL=https://fluxon-e.vercel.app` + `FLUXON_SUPPORT_API_KEY` (bridge pra tools da Sofia)
- Migrations: aplicar todas em `supabase/migrations/` em ordem (001 → 013). Atenção: `001` cria extensão `vector` — precisa estar habilitada no projeto Supabase.
- Após seed da KB (`011`, `013`): rodar `POST /api/admin/knowledge-base/generate-embeddings` pra gerar embeddings; sem isso o RAG retorna vazio e Sofia não encontra nada.
- Testes: `npm run test` (vitest, unit+integration) · `npm run test:e2e` (Playwright, precisa de servidor rodando)

## Armadilhas / "não faça"

- **Embeddings NULL = RAG silenciosamente morto**: novo artigo na `knowledge_base` sem chamar `generate-embeddings` → nunca aparece nos resultados. Não há trigger automático — processo manual atualmente.
- **`FLUXON_SUPPORT_API_KEY` hardcoded no `.env.local`** real (`45a480dcf33ea516...`) — não versionado, mas se o Fluxon rotacionar essa key o SUPORTE para de funcionar. Anotar nos dois lados se rotacionar.
- **RLS ativo**: `users`, `tickets`, `messages` têm RLS. Route handlers usam `createAdminClient()` (service role) para bypassar — ok. Não tentar usar anon key em server-side pra operações de agente.
- **`ai_config.ai_enabled`**: kill switch da Sofia no SUPORTE. Se `'false'`, Sofia retorna `requires_ticket: true` pra tudo sem nem chamar OpenAI. Checar antes de debugar "Sofia não responde".
- **Playwright sem cobertura de Sofia**: os e2e cobrem páginas públicas + admin login; o fluxo IA (`/suporte/ajuda` com chat) não está coberto. Mudança de prompt não tem regression.
- **`respostasprontas/` está vazia**: a pasta existe na raiz mas não tem conteúdo — foi usada como rascunho antes de virar seed SQL. Não é a fonte de verdade da KB.
- **Sentry configurado mas DSN opcional**: `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN`. Se DSN não estiver em prod, erros de IA (ex: quota OpenAI) vão silenciosamente pro console. Verificar se DSN está configurado em Vercel prod.
- **Sem alertas de IA no Sentry**: Sentry captura exceções genéricas, mas não tem alerta específico pra "Sofia caiu em fallback X% das vezes" — monitoramento de saúde da IA é manual.

## Estado atual

- Aplicação estruturada e com migrations até `013`. Estado operacional exato (se está em prod, quais tickets abertos, etc.) não mapeado neste brownfield — ver `.specs/project/STATE.md` se existir.
- Sofia com RAG ativo, 5 tools funcionais, memória de conversa persistente.
- Integração Fluxon via API bridge configurada (`.env.local` tem a key real).
- Testes: Vitest com ~12 arquivos de teste (unit/integration para engine de automations, csrf, email, env, fetch, format, guards, rate-limit, sla, validation). Playwright: 1 spec (`public-pages.spec.ts`) cobrindo páginas públicas + admin login.
- Crons: 3 (SLA 5min, automations 10min, follow-up 1h).

## Pessoas / contexto

- Parte do ecossistema Bethel Educação (mesma empresa dos projetos Fluxon, FluxonApp, Bethel Anúncios).
- Produtos atendidos: Cleiton Querobin (área de membros `cleitonquerobin1.com.br`, produto 50 Scripts `50scripts.cleitonquerobin.com.br`) e Julia Ottoni (Julia Academy `juliaacademy.com.br`).
- Plataformas de compra: Hotmart e PagTrust — reembolso deve ser solicitado direto nelas, Bethel não processa pelo suporte.

## Fontes

- `src/app/api/ai/chat/route.ts` (Sofia completa)
- `supabase/migrations/001_initial_schema.sql` (schema base, RLS, SLA triggers)
- `supabase/migrations/005_ai_conversations.sql`, `011_seed_respostas_prontas_kb.sql`, `012_ai_conversations_whatsapp.sql`
- `.env.local`, `.env.example`, `vercel.json`, `package.json`, `README.md`
- `e2e/public-pages.spec.ts`, listagem de `src/lib/__tests__/`
- `src/app/suporte/ajuda/page.tsx` (fluxo form → IA → ticket)
