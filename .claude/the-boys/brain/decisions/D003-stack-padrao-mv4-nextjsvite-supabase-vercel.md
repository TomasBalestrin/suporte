---
type: decision
id: D003
title: "Stack padrão MV4: Next.js/Vite + Supabase + Vercel"
date: 2026-05-11
status: accepted
owner:
  - "[[Hughie]]"
affects:
  - "[[FluxonApp]]"
  - "[[Fluxon]]"
  - "[[Bethel Anúncios]]"
  - "[[Bethel RH]]"
supersedes:
related:
  - "[[D004]]"
---
# D003 — Stack padrão MV4: Next.js/Vite + Supabase + Vercel

## O quê

os projetos web da MV4 são todos React (Next.js App Router ou Vite/React Router) + TypeScript + Tailwind + shadcn/Radix, com Supabase (Postgres + Auth + Storage) e deploy na Vercel (conta `tt-solucoes-projects`, Pro/Pro Plus). Confirmado em [[FluxonApp]] (Next 16), [[Fluxon]]/Disparotey (Next 16), [[Bethel Anúncios]] (React 19 + Vite 7), [[Bethel RH]] (React 18 + Vite, mas Lovable em vez de Vercel).

## Por quê

padrão recorrente — reusar conhecimento, não reaprender a stack a cada projeto.

## Aplica quando

1º contato com um projeto da MV4 — assuma essa stack até ver o contrário; consulte `stacks/nextjs.md` / `stacks/supabase.md` (a preencher) pros macetes.

## Consequências

<pendente>

## Alternativas consideradas

<pendente>
