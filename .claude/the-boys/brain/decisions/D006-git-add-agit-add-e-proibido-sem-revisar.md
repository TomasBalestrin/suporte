---
type: decision
id: D006
title: "`git add -A`/`git add .` é proibido sem revisar"
date: 2026-05-11
status: accepted
owner:
  - "[[Hughie]]"
affects: []
supersedes:
related: []
---
# D006 — `git add -A`/`git add .` é proibido sem revisar

## O quê

em projeto da MV4, nunca `git add -A` / `git add .` cego — já vazou `.env`/`.env.vercel` uma vez (Bethel Anúncios). Adicionar arquivos específicos, ou `git status` + revisar antes.

## Por quê



## Aplica quando

sempre que for stagear num projeto-cliente. (No próprio harness, `git add -A` é usado porque o `.gitignore` é confiável e o `dist/` é regenerado — mas no projeto-cliente, não.)

## Consequências

<pendente>

## Alternativas consideradas

<pendente>
