---
type: stack
name: Supabase
aliases:
  - Supabase
  - supabase
language: postgres
status: in-use
related_projects:
  - "[[FluxonApp]]"
  - "[[Fluxon]]"
  - "[[Bethel Anúncios]]"
  - "[[Bethel RH]]"
updated: 2026-05-14
---

# Stack: Supabase

> Padrões e armadilhas trabalhando com Supabase nos 4 projetos MV4. **Todos** os projetos da MV4 hoje usam Supabase como Postgres + Auth + Storage (+ Edge Functions em Bethel RH). Atualizado em: 2026-05-14 ([[Francês]]).

## Setup / convenções

- **Project ref** sempre documentado em `brain/projects/<projeto>.md` (ex: FluxonApp = `lujfqkffrjxrddxfakjr`).
- **Auth**: Google OAuth via `AuthContext` (React Context). `pingLastSeen` periódico pra atualizar `auth.users.last_seen`.
- **RLS**: padrão **ativo** em projetos novos (Fluxon, Bethel RH, Bethel Anúncios). FluxonApp é exceção — usa service role direto nos route handlers porque a app é interna multi-user mas single-tenant.
- **Roles** (quando RLS ativo): enum `app_role` em Bethel RH (`admin`, `hr_manager`, `interviewer`, `viewer`). Hook `useUserRole()` no front pra checar permissão.
- **Migrations**: versionadas em `supabase/migrations/*.sql`. Nomeia com prefixo timestamp ou número sequencial.

## Padrões que reusamos

- **Service client** (server-only): `src/lib/supabase-server.ts` com `createClient(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false }})`. Nunca importar em arquivo client.
- **Anon client** (browser): `src/lib/supabase-browser.ts` com `createBrowserClient` (ssr-helpers do Supabase). JWT injetado automático.
- **RPC pra operações atômicas**: criar PG function pra `INSERT + UPDATE` ou contadores; chama com `.rpc('nome', params)`. Padrões: `increment_disparos_enviados`, `resolve_warming_lids` (FluxonApp).
- **Storage buckets**: nomes descritivos por contexto, não genéricos. Ex: `media-disparos`, `chat-media`, `chip-auth-backups` (FluxonApp). Não usa um bucket único "files".
- **Backup automático** de credenciais sensíveis (chips Baileys): worker periódico que sobe `auth/<phone>/` pro bucket `chip-auth-backups` a cada 6h.
- **Edge Functions** (Bethel RH): pra IA pesada que não cabe em route handler (análise de áudio com Gemini, transcript longo). Deploy: `SUPABASE_ACCESS_TOKEN=... npx supabase functions deploy <nome> --project-ref <ref> --no-verify-jwt`.

## Armadilhas conhecidas

- **DDL via `supabase-js` NÃO funciona** ([[D004]]). `supabase-js` é client REST/PostgREST, não executa `CREATE TABLE`/`ALTER`. Pra DDL real: `npx supabase db query --linked` com `SUPABASE_ACCESS_TOKEN` (Management API) **OU** script custom `scripts/apply-migrations.mjs` (Bethel Anúncios) que bate na Management API com REST.
- **String de conexão Postgres direta — senhas mudaram em vários projetos** ([[D004]]). Não tentar `postgres://...:senha@db.supabase.co:6543/postgres`. Usa o token Management API. O `SUPABASE_ACCESS_TOKEN` compartilhado está no `.env.local` do projeto [[Fluxon]] (ver MEMORY local).
- **`onConflict` + bulk insert**: Postgres não deixa `ON CONFLICT DO UPDATE` tocar a mesma row 2x no mesmo INSERT. Dedup o chunk em memória **antes** do upsert. Erro clássico de disparo em lote ([[FluxonApp]]).
- **`data` retorna vazio sem error** ([[L002]]): `supabase.from('x').select()` pode retornar `{ data: null, error: null }` em alguns edge cases. Sempre testar `data?.length` ou `if (error) throw error;` **antes** do retorno. Sem isso = `Cannot read properties of undefined` no frontend.
- **RLS + service role**: chamar Supabase com service role **ignora RLS**. Útil em backend, perigoso por engano. Política: server usa service só pra operações que precisam burlar RLS legitimamente (cron, webhooks, admin); rotas user-facing usam o JWT do user.
- **`bloqueado_meta` / `reembolsado`** (padrão [[Fluxon]]): se a tabela de leads tem flags de bloqueio, **todos** os endpoints de disparo filtram. Mas endpoints de entrega de produto pós-compra NÃO devem filtrar (comprador recebe mesmo bloqueado). Cuidado com o copy-paste.
- **`data_lead` como `date` puro vs timestamp**: o tipo importa pra filtros e fuso. Default novo: `timestamptz`. Legacy: alguns projetos usam `date` puro (ex: `leads_brutos` no Fluxon) — formata com UTC explícito (`Date.UTC(...)`) pra não pular dia.
- **Capacitor + Supabase Auth (Bethel Anúncios)**: OAuth no APK exige deep link `<scheme>://auth/callback`. Sem o scheme registrado no AndroidManifest, callback nunca volta.

## Comandos úteis

```bash
# Migration (via Management API token)
export SUPABASE_ACCESS_TOKEN=...        # do .env.local do Fluxon/Disparotey
npx supabase db query --linked "SQL"    # query ad-hoc
npx supabase db query --linked -f supabase/migrations/X.sql

# Edge Functions
npx supabase functions deploy <nome> \
  --project-ref <ref> \
  --no-verify-jwt                       # pra cron interno; remove em endpoints user-facing

# Backup local pré-migration
npx supabase db dump --linked > backup-$(date +%F).sql
```

## Decisões

- **[[D003]]** — Supabase é canon na MV4 (todos os 4 projetos). Postgres + Auth + Storage.
- **[[D004]]** — DDL/migrations **só via Management API token**. Nunca `supabase-js` (não faz) nem conexão Postgres direta (senhas mudaram).

## Lições F20 ligadas

- **[[L002]]** — Tratar nulidade de `data` em queries Supabase. ([[Luz Estrela]] / [[Bruto]])

## Playbooks ligados

- **[[P002]]** — Mapear novo projeto-cliente: identifica project ref, deploy, env vars, padrões de RLS/auth.
- **Próximo provável P004**: "Aplicar migration Supabase em projeto MV4" — captura o fluxo `SUPABASE_ACCESS_TOKEN` + `npx supabase db query --linked`. Vale registrar na próxima vez que rodar.
