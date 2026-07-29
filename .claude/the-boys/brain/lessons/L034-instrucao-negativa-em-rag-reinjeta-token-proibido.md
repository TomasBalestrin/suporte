---
type: lesson
id: L034
title: "Instrução negativa em doc de RAG re-injeta o token proibido (elefante rosa)"
date: 2026-05-21
owners:
  - "[[Bruto]]"
  - "[[Luz Estrela]]"
occurrences: 1
severity: high
related: ["[[L031]]", "[[L019]]"]
---

# L034 — Instrução negativa em doc de RAG re-injeta o token proibido (elefante rosa)

## Gatilho
Corrigir conteúdo errado numa knowledge_base consumida por RAG (ex: Sofia no SUPORTE, artigo `799731f5`). Tentação de escrever a regra DENTRO do artigo: "NÃO use o link `quiz.testedosarquetipos.com.br`", "NUNCA diga que é grátis ou que não exige login".

## Erro
O artigo da KB é injetado como contexto (`<knowledge_base>`) pro LLM — no SUPORTE, gpt-4o-mini. A instrução negativa coloca o token proibido (link morto, "é grátis", "sem login") DENTRO do contexto do modelo. Modelo pequeno tende a reproduzir o token mesmo na negação ("não pense no elefante rosa") — então o fix "corrige" e ainda vaza. Pior: a verificação automática por `content ILIKE '%token%'` acusa o próprio meta-texto do artigo e dá falso positivo (C1/C2 voltaram 1 em vez de 0, parecendo que o write falhou quando na verdade o conteúdo novo é que carregava os tokens na negação).

## Correção Enforçada
Artigo de KB (doc de referência injetado no RAG) é **puramente positivo**: contém só a informação correta, zero menção ao token errado, nem em negativa. A disciplina "não use X / nunca diga Y" mora no **system_prompt** (regra do operador), nunca no doc injetado. Gate de verificação: o artigo corrigido NÃO pode conter o token proibido em NENHUM contexto — rodar `content ILIKE '%token-proibido%'` no artigo reescrito e exigir 0. Se a verificação por ILIKE acusar o próprio artigo que você acabou de "corrigir", o conteúdo ainda está sujo.

## Onde se aplica
Qualquer pipeline RAG/LLM onde docs viram contexto (OpenAI e afins), com peso maior em modelos pequenos (gpt-4o-mini). Separação canônica: KB/doc = só fato positivo; system_prompt = regra/proibição. Stacks: Sofia (SUPORTE/Fluxon), toda knowledge_base injetada.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
