---
type: lesson
id: L003
title: "Repo + Vault Obsidian no mesmo diretório"
date: 2026-05-13
owners:
  - "[[MM]]"
  - "[[Bruto]]"
occurrences: 3
severity: normal
related: []
---
# L003 — Repo + Vault Obsidian no mesmo diretório

## Gatilho

Repositório de código que também serve como vault do Obsidian (dogfood, knowledge base interna, projeto-cérebro).

## Erro

`.obsidian/workspace.json` entra no git e fica reescrevendo `lastOpenFiles` com paths transitórios (node_modules, arquivos visitados, abas abertas) toda vez que o vault é aberto — vira ruído eterno no `git status`. Daily-notes plugin sem config cria `YYYY-MM-DD.md` na raiz do vault, misturando notas com código. Canvas "Sem título" são gerados por clique acidental e ficam como lixo untracked.

## Correção Enforçada

Gitignorar `.obsidian/workspace.json` + `.obsidian/workspace-mobile.json` + `.obsidian/graph.json` (estado pessoal de UI, não compartilhável). Se daily-notes estiver ativo (checar `.obsidian/core-plugins.json`), criar pasta `journal/` com `.gitkeep` e gravar `.obsidian/daily-notes.json` com `{"folder": "journal", "format": "YYYY-MM-DD"}`. Apagar canvas vazios na faxina inicial.

## Onde se aplica

<pendente>
