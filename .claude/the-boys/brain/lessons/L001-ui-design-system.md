---
type: lesson
id: L001
title: "UI & Design System"
date: 2026-05-13
owners:
  - "[[Soldier Boy]]"
occurrences: 3
severity: normal
related: []
---
# L001 — UI & Design System

## Gatilho

Implementar tabelas em modais ou telas estreitas.

## Erro

O conteúdo da tabela estoura o container pai (layout shift) sem quebra.

## Correção Enforçada

Sempre envelopar a `<table>` com `<div className="overflow-x-auto">` e definir `min-width` seguro.

## Onde se aplica

<pendente>
