---
type: stack
name: "<% tp.system.prompt('Nome da stack') %>"
language: "<% tp.system.prompt('Linguagem (ex: typescript, python)') %>"
status: in-use
related_projects: []
updated: <% tp.date.now("YYYY-MM-DD") %>
---

# Stack: <% tp.frontmatter.name %>

> Padrões, armadilhas e decisões recorrentes ao trabalhar com esta stack nos projetos do usuário. Curto e factual.

## Setup / convenções

- (estrutura de pastas, configs padrão, variáveis de ambiente típicas)

## Padrões que reusamos

- (componentes, hooks, utils, patterns que já existem e devem ser reaproveitados — com path quando der)

## Armadilhas conhecidas

- (coisas que já quebraram; APIs que mudaram; "não faça X porque Y")
- Lições F20 desta stack: <link via tag ou backlink>

## Comandos úteis

- (build, dev, deploy, migração, etc.)

## Decisões

- (decisões técnicas recorrentes sobre esta stack — datadas; quando estruturais, virar entrada em [[decisions]])
