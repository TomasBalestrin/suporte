---
type: playbook
id: P001
title: "Setup Obsidian num vault de projeto"
category: setup
date: 2026-05-14
owners:
  - "[[MM]]"
  - "[[Bruto]]"
related:
  - "[[L003]]"
---

# P001 — Setup Obsidian num vault de projeto

## Quando usar

Você abriu um projeto/repo no Obsidian pela 1ª vez (vault = repo) e o file explorer/graph está poluído com `node_modules`, `dist`, `build`, etc. Precisa configurar pra ficar utilizável.

## Pré-requisitos

- Obsidian instalado.
- Repo aberto como vault.
- Permissão de editar `.obsidian/*` e `.gitignore`.

## Passos

1. **Gitignore o estado pessoal de UI** — adiciona em `.gitignore`:
   ```
   .obsidian/workspace.json
   .obsidian/workspace-mobile.json
   .obsidian/graph.json
   .obsidian/plugins/
   ```
   `.obsidian/plugins/` é crítico — contém chaves de API + cert+private key do REST API plugin (se instalado). Versionar = vazamento.

2. **Configura `.obsidian/app.json`** com filtros de pastas-código (Search, graph, backlinks ignoram):
   ```json
   {
     "userIgnoreFilters": [
       "node_modules/", "dist/", "build/", "bootstrap/", "install/",
       "schemas/", "examples/", "temp-cursor-rules/", "templates/",
       ".claude/", ".cursor/", ".specs/"
     ]
   }
   ```

3. **CSS snippet pra esconder pastas-código do explorer** (userIgnoreFilters não cobre o explorer por design):
   - Cria `.obsidian/snippets/hide-code-folders.css` com seletores `:has()` por pasta.
   - Habilita em `.obsidian/appearance.json`:
     ```json
     { "enabledCssSnippets": ["hide-code-folders"] }
     ```

4. **Daily-notes pra `journal/`** (se daily-notes plugin estiver ativo em `.obsidian/core-plugins.json`):
   - Cria pasta `journal/` com `.gitkeep`.
   - Cria `.obsidian/daily-notes.json`:
     ```json
     { "folder": "journal", "format": "YYYY-MM-DD", "template": "" }
     ```
   - Gitignora `journal/*.md` (daily notes são pessoais).

5. **Plugins úteis** (opcional, via Settings → Community plugins):
   - **Templater** (SilentVoid) — auto-fill ID/data nos templates do `brain/`.
   - **Local REST API** (coddingtonbear) — controla Obsidian via CLI (`node scripts/obsidian.mjs reload`).

6. **Hotkeys** (`.obsidian/hotkeys.json`) — se Templater instalado:
   ```json
   {
     "templater-obsidian:create-new-note-from-template": [
       { "modifiers": ["Mod", "Alt"], "key": "N" }
     ]
   }
   ```

## Verificação

- `Ctrl+P → Reload app without saving`.
- Sidebar mostra só pastas-conteúdo (não `node_modules/dist/build/`).
- Graph view mostra clusters de wikilinks, sem "anel amarelo" gigante.
- `git status` limpo (não tem `.obsidian/workspace.json` rolando) após salvar/abrir arquivos.

## Variações

- **Vault não é repo**: pula passos 1 e do gitignore.
- **Não tem `.obsidian/plugins/` ainda**: o passo 1 antecipa pra quando você instalar.
- **Time multi-user**: app.json e snippet podem ir pro git pra padronizar; só workspace.json é pessoal.

## Lições aprendidas

- Ver [[L003]] — "Repo + Vault Obsidian no mesmo diretório" foi a lição que disparou esse padrão.
- `userIgnoreFilters` em `app.json` **não** afeta o file explorer — só search/graph/backlinks. Por isso o CSS snippet é necessário.
- Plugin `Local REST API` armazena chave de API + cert TLS em `.obsidian/plugins/<id>/data.json`. **Nunca** commitar essa pasta.
