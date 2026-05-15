---
type: project
name: "<% tp.system.prompt('Nome do projeto') %>"
folder: "<% tp.system.prompt('Path do repo') %>"
stack: []
deploy: "<% tp.system.prompt('Deploy (ex: vercel)') %>"
status: active
owner:
  - "[[Hughie]]"
mapped_by: "[[Francês]]"
mapped_at: <% tp.date.now("YYYY-MM-DD") %>
related: []
---

# Projeto: <% tp.frontmatter.name %>

> Notas que ajudam o time a trabalhar neste projeto sem re-perguntar. Curto e factual. O que é decisão **local** do projeto vai no `.specs/project/STATE.md` dele, não aqui — aqui é o resumo "como funciona / o que lembrar".
>
> **Quem preenche**: tipicamente o [[Francês]], no 1º contato com o projeto (brownfield — lê o repo e devolve o mapa).

## O que é

- (uma frase: o que o produto faz)
- **Pasta** / repo: `<% tp.frontmatter.folder %>`  ·  **Stack**: `...`  ·  **Deploy**: `<% tp.frontmatter.deploy %>`
- IDs/refs relevantes (Supabase ref, projeto Vercel, etc.): `...`

## Arquitetura em 30s

- (front, back, serviços externos, infra — só o esqueleto)

## Como rodar localmente

- (comandos, env vars, segredos — onde estão)

## Armadilhas / "não faça"

- (constraints operacionais, coisas frágeis, "não mexer em X sem avisar")

## Estado atual

- (o que está em produção, o que está em curso — link pro `STATE.md` do projeto pra detalhe)

## Pessoas / contexto

- (quem pede o quê, prazos recorrentes, etc.)
