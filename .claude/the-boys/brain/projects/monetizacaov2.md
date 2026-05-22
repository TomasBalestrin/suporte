---
type: project
name: Monetização v2
aliases:
  - Monetização v2
  - monetizacaov2
  - MV4 Monetização
folder: C:/Users/lluys/Desktop/PROJETOS/MONETIZAÇÃO/monetizacaov2
stack: [react, vite, typescript, tailwind, shadcn, supabase, react-query, pwa]
deploy: vercel (dashboard, auto-deploy no push pra main)
status: active
mapped_by: "[[Francês]]"
mapped_at: 2026-05-18
related: []
---

# Projeto: Monetização v2

> Mapeado pelo Francês em 2026-05-18 a pedido do Bruto (1º contato com o projeto). Conteúdo é factual, foco em "como funciona / o que lembrar".

## O que é

- Sistema interno da **MV4 Digital** pra **gestão de squads de closers e SDRs**: dashboards de métricas, relatórios por funil/produto, painel de Liderados pra managers, gerenciamento de funis/produtos, vendas, cancelamentos, Social Selling, Funil Intensivo, celebração de vendas, notificações.
- **Web app** (Vercel) — PWA via `vite-plugin-pwa` com Service Worker NetworkFirst pra Supabase.
- **Pasta**: `C:/Users/lluys/Desktop/PROJETOS/MONETIZAÇÃO/monetizacaov2`  ·  **Repo**: `github.com/TomasBalestrin/monetizacaov2`  ·  **Owner**: TomasBalestrin (push exige credencial dele — Eduardo dá 403).
- IDs/refs: Supabase project ID `qikicwqqitfehqiwafwp` (config.toml ref antigo `rcxqiaeubhsyfxiilysu`).

## Arquitetura em 30s

- **Front**: React 18.3 + TypeScript 5.8 + Vite 6 (SWC). Tailwind 3 + shadcn/ui (Radix). react-router-dom 6. TanStack React Query 5 pra cache. react-hook-form + zod.
- **Padrão MVC com Repository**: `src/model/repositories/` faz queries Supabase; `src/model/services/` lógica de negócio; `src/controllers/` hooks React que orquestram; `src/components/` consomem controllers. Supabase acessado exclusivamente via `src/integrations/supabase/client.ts` (singleton).
- **Banco**: Supabase Postgres com RLS em **todas** as tabelas. 51 migrations em `supabase/migrations/` + consolidado em `all_migrations.sql` na raiz.
- **Edge functions**: `supabase/functions/admin-create-user`, `admin-delete-user` (deploy via `supabase functions deploy`). `verify_jwt = false` — não expor publicamente.
- **Estado do usuário logado**: `AuthContext.tsx` faz auth + entity selection (qual closer/sdr o user "é").

## Como rodar localmente

- `npm install` (cuidado: tem dual lockfile, `package-lock.json` + `bun.lockb` — não misture gerenciadores).
- `npm run dev` → Vite em `localhost:5173`.
- `npm run build` / `npm run preview` / `npm run lint` / `npm run test` (Vitest) / Playwright pra e2e (`@playwright/test`).
- **Types do Supabase são gerados** — `src/integrations/supabase/types.ts`. Não editar à mão. Regenerar com `supabase gen types typescript --project-id qikicwqqitfehqiwafwp`.

## Deploy

- **Vercel** via dashboard (não tem `vercel.json` no repo). Conexão GitHub: push pra `main` dispara rebuild + deploy automático.
- Rollback 1-click no dashboard Vercel.
- Por [[D008]], `vercel --prod` está liberado sem confirmação.

## RLS e roles — mapping não-óbvio

- Enum `app_role`: `admin`, `manager`, `viewer`, `user`.
- **`viewer` = SDR**, **`user` = Closer**, `admin`/`manager` administram. O `isUser` no código significa "é Closer", **não** usuário genérico. Armadilha clássica.
- Tabelas: `profiles` (espelho de `auth.users`), `user_roles` (um role por user), `module_permissions` (granular: dashboard, eagles, sharks, sdrs, reports, admin), `user_entity_links` (vínculo `auth.users` ↔ closer/sdr).
- Funções SECURITY DEFINER: `has_role()`, `has_module_permission()`, `is_linked_to_entity()` — usadas em todas as policies.
- Closers e SDRs **não têm FK direta** para `auth.users` — sempre via `user_entity_links`.

## Armadilhas

- **Dual lockfile** (`package-lock.json` + `bun.lockb`) — não misture comandos npm/bun.
- **`user_funnels.user_id` sem FK alguma** — aceita qualquer UUID. Mistura `closer.id` (LideradoDetailDialog) e `sdr.id` (populado pela migration `20260226120917`). Tabela poliglota; dívida estrutural. Fix defensivo aplicado em 18/05/26 (captura `23505` + embed array/object). Solução estrutural futura: separar em `closer_funnels`/`sdr_funnels` ou adicionar discriminador.
- **`sdr_metrics`** tem UNIQUE `(sdr_id, date, funnel)` — upserts sem `funnel` quebram silenciosamente.
- **FK `funnel_daily_data → closers`** foi dropada intencionalmente na migration `20260310`. Não recriar.
- **Edge functions com `verify_jwt = false`** — nunca expor publicamente.
- **Scripts SQL avulsos na raiz** (`fix_new_supabase.sql`, `fix_sdr_metrics_from_closer_sales.sql`) não rodam automaticamente — são manuais de reconciliação.
- **Embed Supabase**: `.select('col, related(...)')` pode retornar a relação como **array** mesmo em to-one. Tratar `Array.isArray()` antes de acessar fields. Foi fonte do bug do menu de delegação.
- **`retry: 1` em mutations** no `App.tsx` retentar 409 — desperdício. Dívida pra Trem-Bala mais tarde.
- **`mutations.retry` global** no `App.tsx:24` — qualquer 4xx é retentado uma vez. Considerar tirar.
- **DialogContent shadcn** sem `aria-describedby` cospe warning de a11y. Cosmético, Luz Estrela em outro pass.

## Lições e bugs relacionados

- 2026-05-18: bug do menu de delegação (Closer/SDR não recebia funis/produtos). Causa dupla: embed retornando array + INSERT cru sem idempotência. Fix em `src/model/repositories/funnelRepository.ts`. Sintoma inicial: 409 em massa + UI mostrando tudo desmarcado mesmo com vínculo no banco.

## Referências

- Commits relevantes: `9a12782` (idempotência INSERT), `194085d` (embed array fix), `cca4313` (settings.json).
- Migration crítica do schema: `20260226120917_d6c10bae-1caa-4c59-9f3e-a3467804fc01.sql` (cria `funnels`, `user_funnels`, `funnel_daily_data`).
- Migration de drop FK: `20260310` (drop `funnel_daily_data → closers`).
