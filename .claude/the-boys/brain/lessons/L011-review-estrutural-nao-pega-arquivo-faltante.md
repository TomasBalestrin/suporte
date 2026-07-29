---
type: lesson
id: L011
title: "Review estrutural não pega 'vazio significa quebrado'"
date: 2026-05-14
owners:
  - "[[Luz Estrela]]"
  - "[[Trem-Bala]]"
  - "[[MM]]"
occurrences: 1
severity: high
related:
  - "[[L004]]"
---

# L005 — Review estrutural não pega "vazio significa quebrado"

## Gatilho

Code review de feature que **gera artefatos** (templates de scaffolder, generators de código, copy presets, etc.). Reviewer olha o que está nos arquivos do feature, valida lógica, conformidade, RTs. Não verifica que o **OUTPUT GERADO É FUNCIONAL**.

Cenário canônico que disparou (forge-mv4-factory MVP, sessão 2026-05-14):
- 3 reviewers em paralelo: [[Trem-Bala]], [[Luz Estrela]], [[MM]]
- Cada um achou 1-5 bugs nos arquivos do feature
- TODOS miss-aram que `forge/scaffolder/presets/web-next/` tinha **só 5 configs** (package.json, vercel.json, README, env, next.config) e zero código fonte (`src/app/page.tsx` ausente, `src/lib/supabase-*.ts` ausente).
- `forge:new --stack=web-next` gerava projeto com `src/` vazia → `npm run dev` falhava → success criteria do MVP = falso.

## Erro

Review estática lê o que ESTÁ lá, não o que NÃO está. Falta de arquivo num preset/template não dispara warning de IDE nem aparece em `git diff`. Reviewer percorre lista do que existe e tudo "passa".

Sintoma observável:
- Build green em CI (porque não testa output real).
- Smoke test mecânico de generator (gera arquivos sem erro).
- Validate phase mecânica (verifica estrutura, não funcionalidade).
- Bug só aparece quando alguém roda o output gerado.

## Correção Enforçada

**Toda feature que gera artefatos rodáveis precisa de validate phase REAL, não estática.** A Lenda owner do validate phase tem que:

1. **Executar o output** num sandbox dir (`/tmp/<feature>-validate/`).
2. **Rodar o pipeline canônico do output** — pra scaffolder: `npm install && npm run build && npm run dev` (com timeout); pra generator de docs: `markdown-lint`; pra gerador de schema: validar com sample data.
3. **Comparar contra success criteria do spec** linha a linha — não interpretar, **rodar**.
4. **Reportar fail concreto** se output não roda — não "looks good".

Reviewer code-only (Luz Estrela, Trem-Bala, MM) faz a parte estática. A Lenda OU Bruto faz a validação dinâmica antes de autorizar merge. Sem validate dinâmico, MVP "done" é teatro.

Para `forge:new` especificamente: parte de qualquer review futura é rodar `forge:new --no-interactive` num test dir e bater `npm install + npm run build`. Falhou? Não é MVP.

## Onde se aplica

- Generators de qualquer tipo (templates, codegen, scaffolding, ADR builders, etc.)
- Features SDD que produzem artefatos rodáveis pelo usuário final
- Specs que têm "projeto gerado roda X" como success criteria
- Reviews onde "estrutura presente" é prerrequisito mas não suficiente

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
