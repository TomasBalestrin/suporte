---
type: lesson
id: <% tp.system.prompt("ID (ex: L005)") %>
title: "<% tp.system.prompt('Título curto') %>"
date: <% tp.date.now("YYYY-MM-DD") %>
owners:
  - "<% tp.system.prompt('Owner principal (ex: [[Bruto]])') %>"
occurrences: 3
severity: normal
related: []
---

# <% tp.frontmatter.id %> — <% tp.frontmatter.title %>

## Gatilho
<situação concreta onde o erro aparece — não genérica>

## Erro
<o que dá errado, com sintoma observável (mensagem de erro, comportamento, output)>

## Correção Enforçada
<a regra que evita a repetição — comando, padrão, gate. Direto, executável, não filosófico>

## Onde se aplica
<linguagens / stacks / contextos onde essa lição é relevante. Em branco = todo lugar>

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
