---
type: decision
id: D004
title: "Supabase: DDL/migrations via Management API token, não conexão Postgres direta"
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
  - "[[D003]]"
---
# D004 — Supabase: DDL/migrations via Management API token, não conexão Postgres direta

## O quê

aplicar migration/DDL em [[FluxonApp]], [[Fluxon]], [[Bethel Anúncios]], [[Bethel RH]] = `npx supabase db query --linked` (ou `scripts/apply-migrations.mjs`) usando `SUPABASE_ACCESS_TOKEN` (CLI/Management API) — **não** `supabase-js` (não faz DDL) nem string de conexão Postgres direta (senhas mudaram em vários). O `SUPABASE_ACCESS_TOKEN` compartilhado fica no `.env.local` do projeto [[Fluxon]]/Disparotey (ver MEMORY local).

## Por quê



## Aplica quando

qualquer migração de schema num projeto Supabase da MV4.

## Consequências

<pendente>

## Alternativas consideradas

<pendente>
