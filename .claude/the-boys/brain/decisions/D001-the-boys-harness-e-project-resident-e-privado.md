---
type: decision
id: D001
title: "The Boys harness é project-resident e privado"
date: 2026-05-11
status: accepted
owner:
  - "[[Hughie]]"
affects: []
supersedes:
related: []
---
# D001 — The Boys harness é project-resident e privado

## O quê

o harness não mora em `~/.claude/`; vive no `.claude/` commitado de cada projeto (skills/agents/commands + `the-boys/HARNESS.md` + `brain/`). É privado/pessoal (não publicado).

## Por quê

o usuário usa só o Claude CLI no terminal e não quer nada do harness em `~/.claude/`; quer tudo versionado no git do projeto.

## Aplica quando

ao instalar/atualizar o time num projeto (`node <harness>/install/sync.mjs --target .`), ou ao se confundir e procurar skills em `~/.claude/`.

## Consequências

<pendente>

## Alternativas consideradas

<pendente>
