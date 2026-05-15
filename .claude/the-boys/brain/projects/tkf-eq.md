---
type: project
name: TKF EQ
aliases:
  - TKF EQ
  - tkf-eq
  - TKF Equalizer
folder: C:/Users/lluys/Desktop/PROJETOS/tkf-eq
stack: [chrome-extension, vite, react, tailwind, crxjs]
deploy: chrome-web-store
status: active
owner:
  - "[[Hughie]]"
mapped_by: "[[Bruto]]"
mapped_at: 2026-05-14
related: []
---

# Projeto: TKF EQ

> Extensão Chrome (manifest v3) que adiciona equalizador de 10 bandas com presets pros vídeos do YouTube. Scaffolded com `forge:new --stack=chrome-extension` no harness v0.17.0; primeiro uso real do preset chrome-extension.

## O que é

- **Equalizador de áudio pro YouTube** via Web Audio API
- 10 bandas: 32, 64, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz (range ±12 dB cada)
- 7 presets curados: Flat, Rock, Bass, Pop, Jazz, Vocal, Treble
- Toggle ON/OFF global, reset, persistência em `chrome.storage.local`
- **Pasta**: `C:/Users/lluys/Desktop/PROJETOS/tkf-eq`  ·  **Stack**: Vite 5 + React 18 + TS + Tailwind 4 + `@crxjs/vite-plugin@^2.0.0`  ·  **Deploy**: Chrome Web Store (manifest v3)

## Arquitetura em 30s

- **Popup** (`src/popup/popup.tsx`): React UI com 10 sliders verticais, preset dropdown, toggle ON/OFF. Persiste em `chrome.storage.local` + envia via `chrome.tabs.sendMessage` pro content script.
- **Content script** (`src/content/main.ts`): injetado em `*://*.youtube.com/*`. Hookia cada `<video>` em `AudioContext` → cadeia de 10 `BiquadFilterNode` (peaking) → `destination`. `MutationObserver` re-aplica em vídeos novos (YouTube é SPA). `chrome.runtime.onMessage` listener pra atualizar gains live.
- **Service worker** (`src/background/service-worker.ts`): stub, ainda sem lógica.
- **Constantes** (`src/lib/eq-bands.ts`): frequências, presets, defaults, message types, storage key.

## Como rodar localmente

```bash
cd C:/Users/lluys/Desktop/PROJETOS/tkf-eq
npm install      # ~132 packages (crxjs + react + tailwind + types)
npm run dev      # vite watch mode + HMR pro popup
```

Carregar no Chrome:
1. `chrome://extensions` → Developer mode ON
2. Load unpacked → `dist/`
3. Abre vídeo no YouTube → clica ícone TKF EQ → toggle ON → ajusta sliders

## Armadilhas / "não faça"

- **`createMediaElementSource` lança se o `<video>` já foi hookado em outro AudioContext.** O código pega o throw e silencia (`buildRig` retorna `null`). Evita rehook.
- **YouTube é SPA** — `<video>` muda de URL sem reload da página. `MutationObserver` reativa o `applyState` a cada mudança no DOM. Sem isso, EQ deixaria de funcionar após trocar de vídeo.
- **AudioContext começa suspended** por Chrome autoplay policy. `applyState` chama `ctx.resume()` em cada update — assim que o user toggle ON no popup, contexto ativa.
- **Ícones obrigatórios pra Chrome Web Store**: 16, 48, 128 px PNG em `public/icons/`. Hoje TODO no manifest.config.ts; sem icones em dev funciona, na store rejeita.

## Estado atual

- ✅ MVP: 10-band EQ + 7 presets + popup + persistência + apply em YouTube real
- ✅ Build green (vite v5.4 + tsc strict)
- ❌ Ícones ainda não criados
- ❌ Não publicado na Chrome Web Store
- ❌ Sem unit tests (Web Audio testing é raro vale-a-pena pra EQ aplicativo)

## Pessoas / contexto

- Primeiro projeto de extensão Chrome do harness — usado pra validar o preset `chrome-extension` (v0.17.0).
- Owner: usuário (eduardotkfm-maker).
