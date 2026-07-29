---
type: lesson
id: L008
title: "Chrome: `appearance: slider-vertical` deprecated — use writing-mode + direction"
date: 2026-05-14
owners:
  - "[[Soldier Boy]]"
  - "[[Bruto]]"
occurrences: 1
severity: normal
related:
  - "[[L009]]"
---

# L008 — Chrome: `appearance: slider-vertical` deprecated

## Gatilho

Implementar `<input type="range">` com orientação vertical (EQ, mixer, level meter, qualquer UI de controle vertical) usando CSS `appearance: slider-vertical` ou `-webkit-appearance: slider-vertical`.

## Erro

Chrome 100+ emite warning no console:

```
The keyword 'slider-vertical' specified to an 'appearance' property is not standardized.
It will be removed in the future. Use <input type=range style="writing-mode: vertical-lr; direction: rtl"> instead.
```

`slider-vertical` é proprietário (legacy WebKit/Blink), nunca foi padronizado. Suporte vai ser removido em versões futuras do Chrome — código que depende disso quebra na hora.

Sintoma observável: warning no DevTools console, mas slider continua funcionando (por ora). Em alguma versão futura: slider deixa de ser vertical, vira horizontal silenciosamente.

## Correção Enforçada

Use o padrão CSS atual:

```css
input[type="range"].vertical-slider {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 24px;
  height: 96px;
}
```

- `writing-mode: vertical-lr` rotaciona o slider 90°.
- `direction: rtl` inverte o eixo pra que o valor alto fique no topo (orientação natural pra gain/volume/EQ).

Sem `direction: rtl`, o valor alto fica embaixo — anti-intuitivo pra controles de áudio.

Pra desabilitar visualmente:

```css
input[type="range"].vertical-slider:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

## Onde se aplica

- Chrome extensions com UI vertical (popup, options page).
- Qualquer web app que use sliders verticais (DAWs, mixers, equalizers, level meters).
- Firefox + Safari: ambos suportam `writing-mode: vertical-lr` no `<input type="range">` desde 2024 — cross-browser limpo.

## Referência

- MDN: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range#orientation
- Chrome platform status: writing-mode for input is the canonical solution.
- Template do harness (`forge/scaffolder/presets/chrome-extension/src/popup/popup.css.hbs`) já vem com o padrão correto a partir de v0.17.1.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
