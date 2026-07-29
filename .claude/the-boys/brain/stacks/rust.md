---
type: stack
name: Rust
language: rust
used_in: []
updated: 2026-05-13
---

# Stack: Rust (Missão Crítica & Alta Performance)

> Padrões, armadilhas e decisões recorrentes ao trabalhar com Rust. Para sistemas ultra pesados, sem falhas de memória, e com concorrência agressiva.
> Atualizado em: 2026-05-13.

## Quando usar?
- Quando o sistema exige performance de hardware extrema (motores de disparos de alta frequência, streams de WebSocket massivos).
- Quando o vazamento de memória é inaceitável.
- Processos de missão crítica que não podem cair (0% downtime esperado por falhas de aplicação).

## Setup / convenções
- **Ferramental Base**: `Cargo` (padrão intocável da linguagem).
- **Web Frameworks**: `Axum` ou `Actix-Web` para APIs.
- **Concorrência Assíncrona**: `Tokio`.
- **Banco de Dados / ORM**: `SQLx` (compile-time checked queries) ou `SeaORM`. Estamos abertos a explorar outros bancos via pooler (`bb8` / `deadpool`).

## Armadilhas conhecidas
- **The Borrow Checker vs AI**: IAs (mesmo Opus) têm dificuldade em resolver problemas de escopo de referência ("lifetimes") de primeira. Não tente gerar um sistema Rust gigantesco de uma vez; **gere em pequenos pedaços incrementais (Atomic Tasks) e valide com `cargo check` o tempo todo**.
- **Clone Excessivo**: Para calar o Borrow Checker, IAs tendem a adicionar `.clone()` em tudo. Isso destrói a vantagem de performance do Rust. A **Luz Estrela (⭐) e o Trem-Bala (🚄)** rejeitarão PRs onde `.clone()` seja usado apenas como "muleta" sem justificativa arquitetural explícita (ex: o uso correto de `Arc`).
- **Unwrap Cego**: Usar `.unwrap()` ao invés de tratamento correto de erros (Result/Option) causa *panics* em produção. Usar a interrogação `?` com `thiserror` ou `anyhow`. O Bruto bloqueia `.unwrap()`.

## Comandos úteis
- Iteração guiada por IA: Rodar sempre `cargo clippy -- -D warnings` e resolver os avisos como erros.
- `cargo fmt` para padronização inegociável.

## Decisões
- **2026-05-13 — TDD Forçado**: Em Rust, a Kimiko (Executor) trabalhará num regime de TDD/Compiler-Driven. Nenhuma feature é considerada pronta antes que o compilador aprove. A ansiedade de "ver funcionando" deve ser domada; se compila, funciona.
