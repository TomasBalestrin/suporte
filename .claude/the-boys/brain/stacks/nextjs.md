---
type: stack
name: Next.js
aliases:
  - Next.js
  - nextjs
  - Next
  - next
language: typescript
status: in-use
related_projects:
  - "[[FluxonApp]]"
  - "[[Fluxon]]"
updated: 2026-05-14
---

# Stack: Next.js (App Router)

> Padrões, armadilhas e decisões recorrentes ao trabalhar com Next.js nos projetos MV4. Versão confirmada em uso: **Next 16** + **React 19** (FluxonApp, Fluxon). Projetos novos vão direto pra App Router + RSC; Pages Router é legado e não está em uso aqui.
> Atualizado em: 2026-05-14 ([[Francês]]).

## Setup / convenções

- **App Router**: rotas em `src/app/*/page.tsx`, layouts em `layout.tsx`. Route handlers (API) em `src/app/api/*/route.ts`. Middleware em `src/proxy.ts` (o nome `middleware.ts` virou `proxy.ts` em Next 16 — confirme antes de mexer).
- **TypeScript** estrito (strict mode no `tsconfig.json`). Sem `any` solto em código novo.
- **Tailwind 4** (não 3) — CSS-first config, sem `tailwind.config.ts`. Vars/tokens em CSS root.
- **shadcn/ui** ou **Radix UI primitivos** pra componentes base; **base-ui** começou a aparecer em FluxonApp (novo). Componentes em `src/components/ui/`.
- **Env vars**: `NEXT_PUBLIC_*` pro client; resto fica server-only. Nunca importa `process.env.SECRET` em arquivo que roda no browser.
- **Helpers de formatação SSR-safe** (padrão Disparotey/Fluxon, exportar pra projetos novos):
  - `fmtDataBR`, `fmtDataBRs`, `dataBR`, `fmtPhone`, `fmtMoeda` em `src/lib/utils.ts`.
  - **Nunca** `Date#toLocaleString('pt-BR')` nem `date-fns format()` com locale em SSR — diverge entre server e client e gera hydration mismatch silencioso.

## Padrões que reusamos

- **`service-fetch.ts`** (`src/lib/`) — wrapper de `fetch` com `SERVICE_URL` + header `x-service-secret` pra falar com service Node externo. Padrão usado quando há serviço auxiliar (FluxonApp tem service Baileys na VPS).
- **Route handler defensivo**: sempre `try/catch` + `NextResponse.json({error: e.message}, {status: 500})`. Sem isso, erro do service vira 500 cru sem contexto.
- **`runtime = 'nodejs'`** explícito em handlers que fazem IO pesado, evita queue do Edge.
- **`maxDuration = 300`** em rotas de disparo/migração (Vercel Pro). Default é 10s; estoura silenciosamente.
- **Service role do Supabase**: criar via `createServiceClient()` em `src/lib/supabase-server.ts` (server-only). Nunca expor.
- **Sem RLS**: FluxonApp usa service role nos endpoints; Fluxon e Bethel** têm RLS habilitado e usam anon key + JWT. Padrão: se o projeto tem auth Supabase com Google OAuth, ativa RLS.

## Armadilhas conhecidas

- **`experimental.proxyClientMaxBodySize`** — em Next 16 default é **10MB** e trunca o body silenciosamente (sem erro, sem 413). Pra uploads/disparo com mídia, ajusta no `next.config.ts`:
  ```ts
  experimental: { proxyClientMaxBodySize: '50mb' }
  ```
  Não fazer isso = upload aparece OK mas o body chega cortado.
- **`npm run build` enquanto `npm run dev` está rodando**: os dois brigam pelo `.next/`, o dev server vira zumbi (HTTP 200 com body vazio). Fix: mata o processo da porta, `rm -rf .next`, `npm run dev`.
- **Custom Next.js**: alguns projetos (FluxonApp) têm patches/configs custom. O `AGENTS.md` do projeto diz pra **ler `node_modules/next/dist/docs/`** antes de escrever código novo — não confiar só na doc oficial.
- **Bulk insert com `onConflict`** (Supabase via Next route): Postgres não deixa `ON CONFLICT DO UPDATE` tocar a mesma row 2x na mesma INSERT — precisa **dedup do chunk em memória** antes do insert. Bug clássico de disparo em lote.
- **Hydration mismatch**: tudo que depende de `Date.now()`, `Math.random()`, ou `Intl.DateTimeFormat` com locale fora de UTC fora de `useEffect` quebra. SSR-safe helpers em `lib/utils.ts` resolvem 90%.
- **`'use client'` cascading**: marcar um componente como client converte toda a árvore filha — perde RSC dali pra baixo. Mantém a marcação na folha, não no layout.

## Comandos úteis

```bash
# Dev
npm run dev                # localhost:3000 (ou 3002 se 3000 ocupada)
npm run dev:full           # se houver service Node auxiliar

# Build / lint / test
npm run build              # NÃO rodar enquanto `dev` está ativo
npm run lint               # eslint
npm run test               # vitest (Fluxon, Bethel)

# Deploy (Vercel)
npx vercel deploy --prod   # account: tt-solucoes-projects (Pro/Pro Plus)
                           # git-connect pendente em alguns projetos — deploy manual
```

## Decisões

- **[[D003]]** — Stack padrão MV4 é Next.js (ou Vite) + Supabase + Vercel. Tailwind 4 + shadcn/Radix + TS. Não reinventa.
- **[[D005]]** — `[[FluxonApp]]` (Baileys/Next 16) ≠ `[[Fluxon]]` (Meta Cloud API/Next 16). Mesma stack, produtos diferentes.

## Lições F20 ligadas

- **[[L001]]** — Tabelas em modais estreitos: envelopar com `<div className="overflow-x-auto">` + `min-width` seguro. ([[Soldier Boy]])
- **[[L002]]** — Supabase queries: sempre testar nulidade de `data` antes do retorno. Sem isso, `Cannot read properties of undefined` no frontend. ([[Luz Estrela]] / [[Bruto]])

## Playbooks ligados

- **[[P002]]** — Mapear novo projeto-cliente da MV4 (brownfield). Diz qual stack assumir até ver o contrário.
