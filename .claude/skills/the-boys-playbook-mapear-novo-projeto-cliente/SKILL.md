---
name: the-boys-playbook-mapear-novo-projeto-cliente
description: P002 — Mapear novo projeto-cliente (brownfield) e registrar no brain. Quando: Você (ou o time) abriu um projeto novo da MV4 (ou de qualquer cliente) pela 1ª vez. Antes de mexer no código, o [[Francês]] mapeia: stack, deploy, refs, armadilhas. Vira...
---

# P002 — Mapear novo projeto-cliente (brownfield) e registrar no brain

## Quando usar

Você (ou o time) abriu um projeto novo da MV4 (ou de qualquer cliente) pela 1ª vez. Antes de mexer no código, o [[Francês]] mapeia: stack, deploy, refs, armadilhas. Vira `brain/projects/<nome>.md` no harness — todas as personas passam a saber do projeto.

## Pré-requisitos

- Acesso ao repo (clone local + read permission).
- Harness com a versão atual (post-commit hook ativo).
- Templater instalado no Obsidian (pra preencher template via `Cmd+Alt+N`).

## Passos

1. **Lê os docs do projeto** — em ordem de prioridade:
   - `CLAUDE.md` / `CLAUDE_MEMORY.md` / `AGENTS.md` na raiz.
   - `README.md`.
   - `.specs/project/STATE.md` se for projeto SDD-driven.
   - `package.json` / `pyproject.toml` / `Cargo.toml` pra stack.
   - `vercel.json` / `supabase/migrations/` / `deploy/` pra deploy/infra.
   - Algumas pastas-chave (`src/app/`, `src/components/`, `service/`) pra arquitetura.

2. **Identifica os campos do frontmatter**:
   - `name:` — nome canônico (sem aspas que confundam YAML).
   - `aliases:` — variações (pasta diferente do nome, slug, abreviação).
   - `folder:` — path absoluto do repo (`C:/Users/lluys/...`).
   - `stack:` — array de tags (`[nextjs, supabase, vercel]`).
   - `deploy:` — string descrevendo onde roda em prod.
   - `status: active`.
   - `mapped_by: "[[Francês]]"`.
   - `mapped_at: <% tp.date.now %>`.
   - `related:` — wikilinks pra projetos relacionados (`[[FluxonApp]]` se for irmão de FluxonApp).

3. **Cria a nota** no Obsidian (vault = harness):
   - `Cmd+Alt+N` → escolhe template `projeto-mapeado` → escolhe pasta `brain/projects/` → preenche filename como slug (`fluxonapp`, `bethel-rh`, etc.).
   - Templater dispara prompts → preenche.

4. **Preenche o corpo do projeto** (estrutura padrão):
   - **O que é** (1 frase + linha de tags principais).
   - **Arquitetura em 30s** (front, back, serviços externos, infra).
   - **Como rodar localmente** (comandos + env vars + segredos).
   - **Armadilhas / "não faça"** — lições do projeto que **não** são gerais (essas vão pra `brain/lessons/`).
   - **Estado atual** (em prod, em curso — link pro `STATE.md` local).
   - **Pessoas / contexto** (quem pede o quê, prazos recorrentes).

5. **Commit no harness** — `git commit -am "brain: map <project-name>"`.

6. **Hook propaga automaticamente** — post-commit roda `sync:all` → o projeto novo recebe `.claude/` + `.cursor/` + `CLAUDE.md` na primeira sync. Sem precisar rodar nada manual.

## Verificação

- `npm run sync:all:dry` lista o projeto novo.
- Abre o projeto-cliente em outro chat do Claude Code → invoca `/bruto` → Bruto reconhece o projeto.
- No Obsidian, `brain/views/projects.base` mostra o projeto novo na tabela.

## Variações

- **Projeto não-MV4** (cliente externo): mesma estrutura, só ajusta o `deploy:` e adiciona contexto comercial em "Pessoas / contexto".
- **Monorepo**: cria uma única entrada com `folder:` apontando pra raiz; documenta as sub-pastas em "Arquitetura em 30s".
- **Projeto arquivado**: usa `status: archived`. Hook não sincroniza (filtro futuro — hoje sincroniza igual, mas o `.base` `Ativos` esconde).

## Lições aprendidas

- **Não confiar só no README** — muitos times documentam mal. Vale ler 3-5 arquivos-chave de `src/` pra confirmar a stack/arquitetura declarada.
- **`folder:` precisa ser path absoluto** — relativo quebra o `sync:all` em outra máquina ou shell.
- **Aliases salvam** — `bethel-rh` no filename, `Bethel RH` como display name, `BethelRH` como pasta real. Sem aliases, wikilinks `[[Bethel RH]]` não resolvem.
- Ver [[D005]] (3 projetos WhatsApp não confundir) — mapeamento ruim leva à confusão FluxonApp vs Fluxon.
