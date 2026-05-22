---
type: lesson
id: L007
title: "Babel: pipelineOperator/decorators/partialApplication plugins requerem options ou throw"
date: 2026-05-14
owners:
  - "[[Luz Estrela]]"
occurrences: 1
severity: normal
related:
  - "[[L011]]"
---

# L007 — Babel plugins experimentais throw silencioso sem options

## Gatilho

Setup de `@babel/parser` com lista grande de plugins "pra suportar qualquer JS moderno". Copia-cola de exemplo online ou IA que listou `decorators`, `pipelineOperator`, `partialApplication`, etc. sem opções.

## Erro

Babel 7.22+ valida config no momento de `parser.parse()`. Plugins experimentais que precisam de discriminação proposal/version throw imediato:

- **`pipelineOperator`** sem `proposal` → `"pipelineOperator" requires "proposal" option whose value must be one of: "minimal", "fsharp", "hack", "smart"`.
- **`decorators`** sem `decoratorsBeforeExport` ou `version` → throw similar.
- **`partialApplication`** estágio 1, raríssimo, sem config sólida.

Sintoma observável (que fica enterrado pelo `try { ... } catch { return null; }` típico):
- `parseCode(code, filename)` retorna `null` para **TODO** arquivo.
- Scanner reporta "0 suggestions" mesmo quando `src/` tem 100+ arquivos com anti-pattern.
- `skipped: 0` (porque o filter de `.ts/.tsx` passa, só o parse silenciou).
- O erro real (`requires "proposal" option`) só aparece se você remover o try/catch.

Cenário canônico (forge-mv4-factory MVP, 2026-05-14):
```js
// ❌ ERRADO
parser.parse(code, {
  plugins: [
    'jsx', 'typescript',
    'decorators',          // ← throw sem decoratorsBeforeExport
    'pipelineOperator',    // ← throw sem proposal
    'partialApplication',  // ← experimental, evitar
    // ...
  ]
});
```

## Correção Enforçada

**Babel 7.20+ tem a maioria dos features ON-BY-DEFAULT.** Lista de plugins deve ser **mínima**, só pro que NÃO está default:

```js
// ✅ CERTO — minimal, MV4 não usa decorators/pipeline
parser.parse(code, {
  sourceType: 'module',
  plugins: [
    'jsx',
    isTS && 'typescript',
  ].filter(Boolean),
});
```

Features default ativos no Babel 7.20+ (não precisam ser listados):
- `classProperties`, `classStaticBlock`
- `asyncGenerators`, `logicalAssignment`
- `nullishCoalescingOperator`, `optionalChaining`
- `topLevelAwait` (em sourceType: module)
- Numeric separators, BigInt, etc.

Se PRECISAR de `decorators` ou `pipelineOperator` (algum projeto MV4 vier a usar), config completa:

```js
['decorators', { version: '2023-11' }]  // ou: { decoratorsBeforeExport: true }
['pipelineOperator', { proposal: 'hack', topicToken: '%' }]
```

**Validação extra:** sempre rodar parser com sample real no setup do scanner/codemod. Se `parseCode(sampleCode)` retornar null e nenhum motivo aparente, **remova o try/catch e veja o erro real**. É o canário do canário.

## Onde se aplica

- Setup de `@babel/parser` em qualquer projeto
- Configuração de `@babel/core` em build tools customizados
- Scanners/linters/codemods que parseam JS/TS
- Migração entre versões Babel (7.x bumps adicionam validações)

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
