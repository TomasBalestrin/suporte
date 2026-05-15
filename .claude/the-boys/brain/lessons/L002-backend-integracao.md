---
type: lesson
id: L002
title: "Backend & Integração"
date: 2026-05-13
owners:
  - "[[Luz Estrela]]"
  - "[[Bruto]]"
occurrences: 3
severity: normal
related: []
---
# L002 — Backend & Integração

## Gatilho

Queries usando Supabase client.

## Erro

Esquecer de tratar casos onde `data` retorna vazio, causando `Cannot read properties of undefined` no frontend.

## Correção Enforçada

Sempre verificar `if (error) throw error;` e testar a nulidade de `data` com `data?.length` ou fallback explícito antes do retorno.

## Onde se aplica

<pendente>
