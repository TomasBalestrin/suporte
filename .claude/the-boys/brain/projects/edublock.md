---
type: project
name: EduBlock
aliases:
  - EduBlock
  - edublock
folder: C:/Users/lluys/Desktop/PROJETOS/EduBlock
stack: [wxt, vite, typescript]
deploy: unpacked (sem Web Store) — projeto educativo
status: active
owner:
  - "[[Hughie]]"
mapped_by: "[[Bruto]]"
mapped_at: 2026-05-20
related: []
---

# Projeto: EduBlock

> Extensão de ad-block do Eduardo, construída pra **aprender a plataforma de extensão MV3** (não pra competir com uBlock). Decisões locais ficam no `.specs/project/STATE.md` do repo (D001–D020); aqui é o resumo "como funciona / o que lembrar".

## O que é

- Extensão **Chromium MV3** (Chrome/Edge, 112+) que bloqueia pop-up/redirect/banner gráfico e esconde cookie banner/overlay. Objetivo é educativo (D003): aprender manifest, permissões, `declarativeNetRequest`, content scripts, `chrome.storage`, service worker.
- **Pasta**: `C:/Users/lluys/Desktop/PROJETOS/EduBlock` · **Stack**: WXT (wxt.dev) + Vite + TS strict · **Deploy**: unpacked, sem Chrome Web Store, zero telemetria.
- SDD completo no repo: `.specs/project/` (PROJECT.md, STATE.md) + `.specs/features/{mvp-adblock,youtube-adblock}/`.

## Arquitetura em 30s

- **Bloqueio de rede**: ruleset estático `declarativeNetRequest` derivado da EasyList (~30k regras, convertido no build via `@ghostery/urlfilter2dnr`). Toggle global = `updateEnabledRulesets`; whitelist por site = allow-rules dinâmicas.
- **Cosmético**: content script (`entrypoints/content.ts`, `<all_urls>`) esconde cookie banner/overlay via CSS; SW injeta CSS cross-frame via `chrome.scripting.insertCSS` (bypassa CSP, D012).
- **YouTube** (`entrypoints/youtube.content.ts`, só `*://*.youtube.com/*` + `/watch`): **auto-skip no player** — detecta `.ad-showing`, clica "Pular", e em ad não-pulável dá seek-to-end. Seletores centralizados em `src/lib/youtube-selectors.ts`.
- **Estado**: `chrome.storage.local` (`globalEnabled`) + `sync` (`whitelist`) + `stats` (BlockStats, contador no popup). Content scripts leem storage direto (D010).

## Como rodar localmente

- `npm install` → `npm run build` (output em `dist/chrome-mv3`).
- `chrome://extensions` → modo desenvolvedor → "Carregar sem compactação" → `dist/chrome-mv3`.
- **Após qualquer rebuild que mude o manifest, recarregar a extensão (↻)** — senão não pega content script novo.
- `npm run compile` (tsc), `npm run test` (Playwright smoke), `npm run convert:easylist` (regenera regras DNR).

## Armadilhas / "não faça"

- **EasyList/DNR NÃO mata ad de YouTube.** O ad vem na mesma stream/domínio (`googlevideo.com/videoplayback`) do vídeo — DNR não separa, e a própria EasyList tem regras `@@` que *permitem* tráfego YT. Bloqueio de rede de pre-roll quebra o vídeo. Por isso YT é **auto-skip no player**, não bloqueio de rede (D019).
- **Auto-skip do YT é gato-e-rato** com o Google: quebra quando o YT renomeia as classes do player. Sintoma: console mostra `[EduBlock-YT]` chiando num vídeo com ad. Conserto: editar SÓ `src/lib/youtube-selectors.ts` (módulo isolado de propósito, pra manutenção do YT não tocar o MVP estável).
- `dist/` é **gitignored** (build output) — nunca `git add dist/`.
- `onRuleMatchedDebug` (contador de bloqueios) **só dispara em extensão unpacked** — OK pro educativo, trocar por `getMatchedRules` polling se um dia distribuir.

## Estado atual

- **v0.1.2 (tag) — `youtube-adblock` FECHADA e validada** (UAT real do Eduardo passou 2026-05-20: ad pulado no YouTube). MVP de notícias (pop-up/banner/cookie) estável desde v0.1.0.
- Dívidas aceitas não-bloqueantes: YT-R1 (1º ad da sessão pode escapar se SW acordar lento), YT-R2 (anti-adblock popup defer), YT-R3 (Shorts/embed/overlay cosmético fora do escopo). Detalhe em `.specs/project/STATE.md`.
- Próximas frentes prováveis: cobrir Shorts (`/shorts`), endurecer YT-R1.

## Pessoas / contexto

- Dono e único usuário: **Eduardo** (MV4). Sem usuário final externo — projeto pessoal/educativo. Modalidade //YOLO (D016): Claude implementa, Eduardo lê e valida por UAT.
