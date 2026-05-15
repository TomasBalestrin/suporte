---
type: stack
name: Python
language: python
used_in: []
updated: 2026-05-13
---

# Stack: Python (Sistemas Estruturados)

> Padrões, armadilhas e decisões recorrentes ao trabalhar com Python para construção de sistemas mega estruturados (Backends, IA, Processamento em Lote).
> Atualizado em: 2026-05-13.

## Quando usar?
- Backends pesados que envolvem **Processamento de Dados (ETL)**, **Integração com IAs** (RAG, orquestração de LLMs), e APIs rápidas (FastAPI).
- Quando o ecossistema TypeScript se torna ineficiente para processamento de linguagem natural ou ciência de dados.

## Setup / convenções
- **Framework Web**: `FastAPI` (alta performance, tipagem via Pydantic).
- **Gerenciador de Pacotes**: `Poetry` ou `uv` para lockfiles reprodutíveis e gestão limpa de ambientes.
- **Tipagem**: `strict=True` no MyPy. Códigos sem anotação de tipo estática são estritamente proibidos por padrão para evitar que a IA (ou humanos) criem dívida técnica.

## Padrões que reusamos
- **Validação de Input/Output**: Exclusivamente `Pydantic` (v2). Nada de validação manual em dicionários soltos.
- **Formatação/Linting**: `Ruff` e `Black`.

## Armadilhas conhecidas
- **Tipagem Dinâmica vs IA**: IAs tendem a alucinar propriedades em `dict` e `kwargs`. **A Lenda (🎖️) e Luz Estrela (⭐) bloqueiam** merges onde os dados transitam sem um `Schema` do Pydantic.
- **Global Interpreter Lock (GIL)**: Não use `threading` para CPU-bound em Python; use `multiprocessing` ou mova a lógica crítica para Rust.
- **Assincronicidade Quebrada**: Cuidado ao misturar bibliotecas síncronas pesadas (ex: requests) dentro de rotas `async def` do FastAPI. Isso bloqueia o Event Loop. Sempre use `httpx` para chamadas assíncronas externas.

## Decisões
- **2026-05-13 — Tipagem Obrigatória**: Decidimos que sistemas Python mega estruturados agirão com o mesmo rigor de linguagens estaticamente tipadas. O Bruto veta merges sem Type Hints completos.
