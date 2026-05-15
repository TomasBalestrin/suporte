---
type: lesson
id: L006
title: "Babel: path.parent ≠ path.parentPath — sempre usar parentPath pra walk"
date: 2026-05-14
owners:
  - "[[Luz Estrela]]"
occurrences: 1
severity: normal
related: []
---

# L006 — Babel: `path.parent` ≠ `path.parentPath`

## Gatilho

Escrever rule de AST com `@babel/traverse` que precisa **subir** na árvore (verificar se está dentro de useEffect, encontrar parent de tipo X, etc.). Tentação natural: `path.parent` (parece intuitivo, "o pai do path").

## Erro

`path.parent` em Babel é o **AST node** puro do nó pai — NÃO é um NodePath. Não tem `.node`, `.parentPath`, métodos de helper como `.isCallExpression()`. Tentar `path.parent.node` retorna `undefined` (e `parent.parent` em chain falha silenciosamente).

Sintoma observável:
- `try { path.parent.node.type } catch { /*skip*/ }` engolido pelo try/catch genérico do findPattern/traverser
- Rule fires 1x por arquivo (no Program node) ou 0x — nunca onde deveria
- Nenhum error log, scanner reporta "0 suggestions" mesmo em arquivo com anti-pattern explícito

Cenário canônico (forge-mv4-factory MVP, 2026-05-14):
```js
// ❌ ERRADO
function isInUseEffect(path) {
  let parent = path.parent;
  while (parent) {
    if (parent.node.type === 'CallExpression') { ... }
    //         ^^^^^^^^^^^ undefined — parent é AST node, não NodePath
    parent = parent.parent;
  }
}
```

## Correção Enforçada

**Sempre `path.parentPath` pra walk na árvore.** É o NodePath do parent — tem `.node`, `.parentPath`, métodos helper.

```js
// ✅ CERTO
function isInUseEffect(path) {
  let current = path.parentPath;
  while (current) {
    if (current.node?.type === 'CallExpression') {
      const callee = current.node.callee;
      if (callee?.type === 'Identifier' && callee.name === 'useEffect') {
        return true;
      }
    }
    current = current.parentPath;
  }
  return false;
}
```

**Tabela de equivalência Babel:**

| Quer | Use | Não use |
|---|---|---|
| AST node do path atual | `path.node` | — |
| AST node do parent | `path.parent` (ok pra leitura simples) | — |
| NodePath do parent (pra walk) | `path.parentPath` | `path.parent` (sem `.parentPath`/`.node` no encadeamento) |
| Pai com check de tipo | `path.findParent(p => p.isXxx())` | walk manual |
| AST node da raiz | `path.hub?.file?.ast` (se hub setado) | — |

## Onde se aplica

- Rules de scanner que usam `@babel/traverse`
- Code mods customizados (transformações AST)
- Linters baseados em Babel
- Qualquer código que recebe `NodePath` de visitor enter/exit

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
