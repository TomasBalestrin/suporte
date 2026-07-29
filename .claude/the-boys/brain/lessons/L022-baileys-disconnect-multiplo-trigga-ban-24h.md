---
type: lesson
id: L022
title: "Múltiplos disconnect+reconnect/restore num mesmo chip em <30min trigga ban WhatsApp 24h"
date: 2026-05-18
owners:
  - "[[Bruto]]"
occurrences: 2
severity: high
related:
  - "[[L010-whatsapp-lid-pn-dichotomy]]"
  - "[[L021-baileys-dupe-impossivel-via-lid-anonimo]]"
---

# L022 — Múltiplos disconnect+reconnect/restore num mesmo chip em <30min trigga ban WhatsApp 24h

## Gatilho

Estou debugando um chip Baileys em prod e quero forçar algum comportamento (emit de `messaging-history.set`, refresh de cache do socket, troubleshooting). Recorro a chamadas em sequência: `POST /api/chips/:phone/disconnect` + `POST /api/chips/:phone/restore` + `POST /api/chips/:phone/connect` — repetindo 2-3 vezes em menos de 30 minutos.

Cenário concreto da reincidência (2026-05-18): tentei `messaging-history.set` reemitir via disconnect+connect (não emitiu). Aí tentei restore de backup + connect (também não emitiu). Foram ~3 ciclos disconnect/restore/connect em ~15min no chip Carlos.

## Erro

WhatsApp aplica **restrição temporária 24h** no número. O socket Baileys conecta brevemente, mas em segundos cai com `statusCode=401 "Connection Failure" wasPairing=true`. Auto-restore tenta de novo → 401 de novo. Loop fatal.

A causa raíz: o servidor da Meta interpreta múltiplas connect/disconnect rápidas + tentativas de pareamento + restore como **comportamento suspeito** (provável bot ou conta comprometida). Em vez de derrubar só a sessão Web, derruba o número inteiro — todas as sessões (Web, Desktop, celular nativo) ficam degradadas por 24h, sem possibilidade de re-pareamento confiável.

**Ocorrência #1** (2026-04-29, registrado em STATE.md decisão #16): chip "Tati" (5549998370598) — sequência idêntica de tentativas múltiplas de re-pareamento após 401 conflict → ban temporário 24h.

**Ocorrência #2** (2026-05-18, esta lição): chip Carlos (5549999742914) — durante debug do follow-up worker.

## Correção Enforçada

**Quando aparecer `statusCode=401` no log do Baileys, PARE TUDO:**

1. **Não chame `connect` de novo**. O auto-restore do `chip-session.js` já tenta — confia nele uma vez.
2. **Não chame `restore`**.
3. **Não chame `disconnect`+`connect`**.
4. **Mande o dono do chip revogar TODAS as sessões Web no celular** (WhatsApp → Aparelhos conectados → Sair de todas).
5. **Espera 5-10min antes de tentar re-pareamento**. Se for produção crítica e o ban já aconteceu, espera **24h**.
6. **Re-pareia UMA VEZ** quando voltar.

**Em debug/exploration: limite estrito de 1 disconnect+connect a cada 30min por chip.** Se precisa mais que isso pra entender algo, **DESISTE da abordagem** — provavelmente tem outro caminho (ler arquivos auth, query DB direto, testar com chip não-produção).

**Pra disparos automatizados em workers**: jamais incluir lógica que faça disconnect/connect repetido em curto prazo. O auto-restore já cobre crashes naturais.

## Onde se aplica

- Projetos WhatsApp via **Baileys** (não-oficial). Cloud API da Meta não tem esse risco.
- **Crítico em produção** — ban 24h significa cliente sem atendimento durante o intervalo. Welcome workers, follow-ups, suporte tudo congelado.
- Durante debug, **trabalhe em chip de staging** (chip de teste pareado num número descartável) — não no chip que atende cliente.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).