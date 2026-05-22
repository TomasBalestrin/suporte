---
type: lesson
id: L009
title: "Chrome popup: `<body>` com width pequena corta conteúdo multi-coluna silenciosamente"
date: 2026-05-14
owners:
  - "[[Soldier Boy]]"
  - "[[Bruto]]"
occurrences: 1
severity: normal
related:
  - "[[L008]]"
---

# L009 — Chrome popup: body width restringe conteúdo multi-coluna

## Gatilho

Chrome extension popup (`<body>` dentro de `src/popup/index.html`) com **layout multi-coluna**: grid de sliders (EQ, mixer), grid de presets, tabela, qualquer UI horizontal com várias colunas.

Especialmente comum quando o template inicial define `<body class="w-80 ...">` (320px Tailwind) como placeholder pra popup simples.

## Erro

Popup renderiza com **conteúdo das colunas finais cortado**. As últimas N colunas saem fora do viewport visível. Header com botão alinhado à direita também some.

Sintoma observável:
- Screenshot do popup mostra só parte das colunas (ex: 8 de 10 sliders visíveis, 2 cortadas no canto direito).
- Botão de toggle/header no canto direito não aparece.
- Nenhum erro no console — corte é silencioso, pelo CSS overflow default do `<body>`.

Cenário canônico (TKF EQ, 2026-05-14): popup com 10 sliders verticais + header com ON/OFF. Body `w-80` (320px) cortava 2 sliders + o ON/OFF. Levou 1 ciclo de feedback do user pra detectar (Bruto miss-ou no smoke test porque só rodou `npm run build`, não abriu a UI).

## Correção Enforçada

**Sempre dimensione `<body>` com width explícita >= soma da largura calculada do conteúdo + padding.**

Cálculo:

```
body_min_width = (column_width × num_columns)
              + (gap × (num_columns − 1))
              + padding_horizontal × 2
              + reserve_para_header_direita
```

Exemplo (10 sliders 24px + gap 4px + padding 16px×2 + reserve 48px):
```
= 240 + 36 + 32 + 48 = 356px → arredonda pra 400-440px
```

**Pra templates do harness** (`forge/scaffolder/presets/chrome-extension/src/popup/index.html.hbs`):
- Default body com `min-width: 280px` (cabe single-column).
- Comentário explicando o gotcha pra implementação multi-coluna ajustar.
- Width específica fica em `popup.tsx` ou inline-style no body quando souber a estrutura.

```html
<!-- Pra multi-coluna (EQ, grid, etc.): -->
<body class="bg-white text-gray-900" style="width: 440px; min-width: 440px;">
```

**Validação obrigatória:** Smoke test de popup multi-coluna **não pode ser só `npm run build`** — tem que carregar em `chrome://extensions` e abrir o popup visualmente. Build verde mascarando corte UI é o padrão F20 [[L011]] manifestando de novo (review estática não pega vazio/cortado).

## Onde se aplica

- Chrome extension popups com qualquer layout multi-coluna
- Templates de scaffolding que ship popup placeholder (forge `chrome-extension` preset corrigido em v0.17.1)
- Code review de extension UI — sempre questionar "qual o min-width necessário pra esse layout?"

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
