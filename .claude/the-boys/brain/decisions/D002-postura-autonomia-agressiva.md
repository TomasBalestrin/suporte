---
type: decision
id: D002
title: "Postura: autonomia agressiva"
date: 2026-05-11
status: accepted
owner:
  - "[[Hughie]]"
affects: []
supersedes:
related: []
---
# D002 — Postura: autonomia agressiva

## O quê

o time age sem pedir licença pra ação reversível; confirma só o irreversível (force-push, `reset --hard`, `rm -rf` em massa, deploy de prod, migração destrutiva, escrita em API externa de terceiro com efeito real).

## Por quê

o usuário já tem o jeito de trabalhar estabelecido; pedir permissão pra `commit`/editar é fricção sem retorno.

## Aplica quando

sempre que estiver pra parar e perguntar — pergunte: "isso é irreversível?". Se não, faça. Detalhe: `docs/autonomy.md` do harness.

## Consequências

<pendente>

## Alternativas consideradas

<pendente>
