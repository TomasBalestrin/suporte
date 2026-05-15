---
type: playbook
id: P003
title: "Registrar nova lição F20 (Memória Autônoma)"
category: registration
date: 2026-05-14
owners:
  - "[[Bruto]]"
  - "[[Soldier Boy]]"
  - "[[Luz Estrela]]"
  - "[[MM]]"
  - "[[Trem-Bala]]"
  - "[[Hughie]]"
  - "[[A Lenda]]"
related:
  - "[[L004]]"
---

# P003 — Registrar nova lição F20 (Memória Autônoma)

## Quando usar

Você (persona ou usuário) detectou um padrão de erro pela **3ª vez** na mesma sessão ou em tarefas similares. Threshold mais cedo (1ª ou 2ª) só se o impacto for grave demais pra arriscar repetir.

## Pré-requisitos

- Padrão de erro identificado com clareza:
  - **Gatilho** específico (não "às vezes dá erro" — "ao tentar X em Y com Z").
  - **Erro** observável (mensagem, comportamento, output).
  - **Correção** acionável (regra, comando, gate concreto).
- Authority pra registrar: você é uma das 7 personas com F20 ([[Bruto]], [[Soldier Boy]], [[Luz Estrela]], [[MM]], [[Trem-Bala]], [[Hughie]], [[A Lenda]]) — ou é o usuário.

## Passos

1. **Cria a nota no Obsidian** (vault = harness):
   - `Cmd+Alt+N` → template `licao-f20` → pasta `brain/lessons/` → filename como slug (ex: `extractbody-frontmatter-vaza-em-windows-crlf`).
   - Templater pede ID (próximo: `L00X` — veja `brain/lessons/` pra saber o max atual + 1).

2. **Preenche frontmatter**:
   - `id: L###`
   - `title:` curto e descritivo
   - `date: <% tp.date.now %>`
   - `owners:` lista de personas envolvidas (quem detectou + quem registrou).
   - `severity: normal | high | critical` (default normal; high se afeta prod, critical se há perda de dados).
   - `related:` wikilinks pra lições/decisões cruzadas.

3. **Preenche o corpo (formato canônico)**:
   - `## Gatilho` — situação concreta.
   - `## Erro` — sintoma observável.
   - `## Correção Enforçada` — regra direta, executável, não filosófica.
   - `## Onde se aplica` — linguagens / stacks / contextos.

4. **Build + sync** (CRÍTICO):
   ```bash
   cd <harness>
   npm run build         # regenera o índice + dist
   npm run sync:cursor   # atualiza .cursor/rules/the-boys-lessons.mdc local
   ```
   Sem isso, a lição **fica só no harness** e não chega no Cursor de quem usa. É a definição do bug L004.

5. **Commit no harness**:
   ```bash
   git add brain/lessons/L###-*.md brain/learned-patterns.md \
           dist/cursor/rules/the-boys-lessons.mdc \
           .cursor/rules/the-boys-lessons.mdc
   git commit -m "brain: register L### — <título curto>"
   ```

6. **Hook propaga** — post-commit roda `sync:all` → todos os clientes recebem `.claude/the-boys/brain/lessons/L###-*.md` + `.cursor/rules/the-boys-lessons.mdc` atualizado.

## Verificação

- `npm run validate` passa (id sequencial sem buracos).
- `grep "L###" .cursor/rules/the-boys-lessons.mdc` retorna a lição nova.
- `node scripts/obsidian.mjs reload && node scripts/obsidian.mjs get brain/learned-patterns.md | grep L###` mostra a entrada no índice gerado.
- Em outro chat (FluxonApp por exemplo), invoca `/luz-estrela` → mencionar o gatilho da lição → ela cita a regra correta.

## Variações

- **Edição de lição existente** (não criação): mesmos passos 4-6 (build + sync + commit). NÃO edita o stub `brain/learned-patterns.md` — edita o `L###-*.md` correspondente. Stub regenera automático.
- **Lição que afeta só uma stack** (não cross-projeto): preenche `## Onde se aplica` com o nome da stack. `related:` aponta pra `[[stack-nome]]`.
- **Lição que vira decisão depois** (ex: "esse padrão é tão importante que vira regra cross-projeto"): cria `D###` referenciando a lição via `related:`. Lição continua existindo (histórico).

## Lições aprendidas

- Ver [[L004]] — "Edição em learned-patterns.md sem propagar pro Cursor". Esse playbook **é** a contramedida ao L004.
- **Não confundir lição F20 com decisão D###**:
  - Lição = padrão de erro + correção. Reativo.
  - Decisão = escolha de design/processo. Proativo.
- **Threshold 3x** é canônico (D006 / F20). Registrar antes (1ª/2ª) só se o impacto for grave (perda de dados, deploy quebrado, vazamento de segredo).
