---
type: decision
id: <% tp.system.prompt("ID (ex: D007)") %>
title: "<% tp.system.prompt('Título curto') %>"
date: <% tp.date.now("YYYY-MM-DD") %>
status: accepted
owner:
  - "[[Hughie]]"
affects: []
supersedes:
related: []
---

# <% tp.frontmatter.id %> — <% tp.frontmatter.title %>

## O quê
<a decisão em 1–2 linhas>

## Por quê
<a razão — contexto, restrição, dor que motivou>

## Aplica quando
<gatilho — quando isso é relevante de novo>

## Consequências
<o que muda na operação do time / no código / no contrato>

## Alternativas consideradas
<o que foi descartado e por quê — só se for útil>
