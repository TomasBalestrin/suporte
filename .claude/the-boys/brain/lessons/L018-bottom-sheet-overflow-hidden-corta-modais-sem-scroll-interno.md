---
type: lesson
id: L018
title: "BottomSheet desktop com max-h + overflow-hidden no wrapper corta modais sem scroll interno próprio"
date: 2026-05-17
owners:
  - "[[Bruto]]"
  - "[[Luz Estrela]]"
occurrences: 1
severity: high
related:
  - "[[fluxonapp]]"
  - "[[design-system]]"
---

# L018 — BottomSheet com `overflow-hidden` no wrapper esconde campos abaixo da viewport em modais sem Tabs/scroll próprio

## Gatilho

Você acabou de "consertar" a janela de um modal que estava saindo do viewport (lista longa, conteúdo grande) cravando `max-h-[90vh] flex flex-col` no Dialog.Content e `flex-1 min-h-0 flex flex-col overflow-hidden` no wrapper dos children do componente compartilhado de modal (ex.: `BottomSheet` do FluxonApp). Validou visualmente **um** modal — geralmente o que tinha o sintoma original (com Tabs e scroll interno próprio).

## Erro

**Outros modais do mesmo `BottomSheet` que NÃO têm scroll interno próprio passam a cortar conteúdo silenciosamente.** Sintoma: campos do form (ex.: "Mídia (opcional)") + botões do footer somem da viewport quando o conteúdo cresce além de 90vh. Usuário interpreta como "feature sumiu" ou "botão deletado" — sem erro em console, sem erro de TS, sem aviso. Caso real no FluxonApp 2026-05-17: corrigir o modal de Grupos quebrou em silêncio os modais de Templates, Disparos, Chat, GrupoActions (todos que usam BottomSheet sem Tabs/scroll interno). 1 dos componentes chegou na UI do usuário ANTES de ser pego.

Causa raiz: `overflow-hidden` num flex container que tem `max-h` definido apenas **corta** o que passa. Pra modais com Tabs (`Tabs flex-1 overflow-hidden` interno), o TabContent tem seu próprio `overflow-y-auto` → scroll funciona. Pra modais "form simples" (`<div className="space-y-3">` direto), conteúdo natural ultrapassa 90vh → cortado sem scroll.

## Correção Enforçada

1. **No wrapper de children do BottomSheet/Dialog compartilhado**, prefira sempre `overflow-y-auto` em vez de `overflow-hidden`. Tabs interno mantém scroll próprio funcionando (TabContent `flex-1 overflow-y-auto`); forms simples ganham scroll automático quando estouram. Linha que importa: `<div className="flex-1 min-h-0 flex flex-col overflow-y-auto">{children}</div>`.

2. **Quando mexer no shell de qualquer componente compartilhado** (modal/sheet/dialog/drawer base), validar visualmente **PELO MENOS 2 consumidores diferentes**: um com Tabs/scroll interno, outro só com form vertical. Se o repo tem 5+ consumidores do mesmo shell, gate de [[Luz Estrela]] varrer todos antes do commit.

3. **`overflow-hidden` em flex container com `max-h` é red flag** — só faz sentido se o filho tem scroll próprio garantido. Em wrapper genérico de modal, evite.

## Onde se aplica

- React / Next.js com modais compartilhados (Radix Dialog, vaul Drawer, Headless UI Dialog, próprio BottomSheet customizado).
- Qualquer design system que define shell de modal único usado por vários consumidores.
- Vale também pra componentes Sheet/Drawer com `max-h-[Xvh]` ou `max-h-screen`.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
