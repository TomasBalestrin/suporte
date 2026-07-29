---
type: playbook
id: <% tp.system.prompt("ID (ex: P004)") %>
title: "<% tp.system.prompt('Título curto — o que essa playbook executa') %>"
category: "<% tp.system.prompt('Categoria (setup | mapping | registration | migration | review | ops)') %>"
date: <% tp.date.now("YYYY-MM-DD") %>
owners:
  - "<% tp.system.prompt('Owner principal (ex: [[Bruto]])') %>"
related: []
---

# <% tp.frontmatter.id %> — <% tp.frontmatter.title %>

## Quando usar

<gatilho concreto — quando essa playbook é a resposta certa>

## Pré-requisitos

- (ferramentas, credenciais, estado do repo, etc.)

## Passos

1. <passo 1, executável, sem ambiguidade>
2. <passo 2>
3. <passo 3>

## Verificação

- (como sei que rodou direito — output esperado, gate, comando de teste)

## Variações

- (e se for projeto X em vez de Y? E se a env for prod em vez de dev?)

## Lições aprendidas

- (armadilhas, "atenção a Z", links pra lições F20 relacionadas)

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Playbook que não chega no `.cursor/rules/the-boys-playbooks.mdc` é teatro (mesma regra das lições, ver [[L004]]).
