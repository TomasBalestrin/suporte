---
type: lesson
id: L004
title: "Edição em learned-patterns.md sem propagar pro Cursor"
date: 2026-05-13
owners:
  - "[[Bruto]]"
  - "[[MM]]"
occurrences: 3
severity: normal
related: []
---
# L004 — Edição em learned-patterns.md sem propagar pro Cursor

## Gatilho

Persona adiciona ou edita um padrão em `brain/learned-patterns.md` (F20) e comita direto.

## Erro

O conteúdo NÃO chega no `.cursor/rules/the-boys-lessons.mdc` automaticamente — devs no Cursor continuam tropeçando no mesmo erro que ficou registrado no `brain/`. F20 vira teatro.

## Correção Enforçada

Toda edição em `brain/learned-patterns.md` precisa ser seguida de `npm run build && npm run sync:cursor` ANTES do commit. Validar com `git diff dist/cursor/rules/the-boys-lessons.mdc` — se não mudou junto, o sync não rodou e a lição não vai chegar nos editores externos. Commit que toca `brain/learned-patterns.md` sem tocar `dist/cursor/rules/the-boys-lessons.mdc` é commit incompleto.

## Onde se aplica

<pendente>
