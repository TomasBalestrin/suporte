---
type: project
name: The Boys Harness
folder: C:/Users/lluys/Desktop/Cursor/The Boys
stack: [node, javascript, claude-skills, cursor-rules]
deploy: vendorized via install/sync.mjs
status: active
mapped_by: "[[Bruto]]"
mapped_at: 2026-05-13
related: []
---

# Projeto: The Boys Harness
> Framework multi-agente para desenvolvimento solo-LLM.
> Mapeado por: Bruto, 2026-05-13.

## O que é
- Um harness que estende o `tlc-spec-driven` com 10 personas em pt-BR.
- Focado em Claude CLI e Cursor.

## Arquitetura
- `build/`: Geradores de artefatos.
- `install/`: Scripts de sincronização e instalação.
- `personas/`: Definições das 10 personas (manifest + prompt).
- `brain/`: Memória compartilhada do usuário.

## Como rodar
- `npm run build`
- `npm run sync:cursor`
