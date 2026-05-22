---
type: lesson
id: L021
title: "Cross-ref anti-duplicação de disparo é cego pra LIDs anônimos do WhatsApp"
date: 2026-05-18
owners:
  - "[[Bruto]]"
occurrences: 3
severity: high
related:
  - "[[L010-whatsapp-lid-pn-dichotomy]]"
---

# L021 — Cross-ref anti-duplicação de disparo é cego pra LIDs anônimos do WhatsApp

## Gatilho

Quero disparar uma campanha de WhatsApp via chip-A pra uma lista de N phones, garantindo que o chip-A **NÃO mande pra quem já contatou antes**. Faço cross-ref via DB: pego `mensagens.direcao='outbound'` do chip-A, extraio `conversa.jid`, comparo com `resolve-jid(phone)` de cada lead na lista. Pulo quem dá match.

Acontece em **bridge externo→FluxonApp** (Quill Forms backfill, Disparotey integration, etc) onde o chip já está rodando há tempos com `WelcomeWorker` ou similar que JÁ disparou welcome pra muitos dos mesmos phones.

## Erro

O cross-ref deixa passar dupes silenciosamente. O destinatário recebe a mesma mensagem **2x ou 3x** — recadastramento, irritação, bloqueio do chip.

Causa raíz: o WhatsApp anonimiza JIDs via **LID** (`12345678901234@lid`) em vez de PN (`5511999999999@s.whatsapp.net`) — sobretudo desde 2024. Quando `sock.sendMessage(jid)` é chamado com `jid` retornado por `sock.onWhatsApp(phone)`, a Meta pode devolver LID. A `conversa` é gravada com `jid=LID`, **sem forward mapping `phone → LID` em lugar nenhum**.

Quando eu faço cross-ref futuro chamando `resolve-jid(phone)`, recebo PN. Procuro em `conversas.jid` por PN — não acha. Procuro em `jid_aliases.pn_jid` → `lid_jid` — só acha se o LID já foi resolvido reverso via `resolve-lids` (que **não funciona pra LIDs onde o destinatário nunca interagiu de volta** — Meta não devolve PN nesse caso).

Resultado: dezenas de LIDs anônimos no histórico do chip que NUNCA aparecem em nenhum cross-ref. Cegueira permanente.

Bônus crítico: **`sock.onWhatsApp(phone)` retorna `exists:false`** quando o chip remetente foi **bloqueado pelo destinatário**. Isso pode ser mascarado como "número sem WhatsApp", quando na verdade é "número me bloqueou". Validável: chamar o mesmo `onWhatsApp(phone)` via OUTRO chip — se retornar JID válido, o primeiro chip está bloqueado.

## Correção Enforçada

**1. No service Baileys, persistir forward `phone → jid` em `jid_aliases` ANTES de cada `sock.sendMessage`** (não DEPOIS, não via event). Capturar o LID no instante que a Meta atribui:

```js
// chip-session.js — wrapper antes de cada send:
async function sendText(phone, text) {
  const jid = await this.resolveJid(phone)
  if (jid?.endsWith('@lid')) {
    const pnJid = phoneToPnJid(phone) // ex.: '5511999999999@s.whatsapp.net'
    await rememberAlias(this.chipId, jid, pnJid) // grava em jid_aliases
  }
  return this.sock.sendMessage(jid, { text })
}
```

Assim cross-refs futuros (via PN do lead → procurar lid_jid pareado) ficam blindados desde o instante 0.

**2. Antes de marcar um phone como "sem WhatsApp", testar com OUTRO chip da operação.** Se o segundo chip resolve o JID, o primeiro está bloqueado — marcar `status='bloqueado'`, **NÃO** `ignorado` ou `sem_wpp`. Lógica:

```js
const jidA = await resolveJid(chipA, phone)
if (!jidA) {
  const jidB = await resolveJid(chipB, phone) // chip alternativo
  if (jidB) status = 'bloqueado'  // chipA foi bloqueado pelo destinatário
  else      status = 'sem_wpp'    // realmente não tem WhatsApp
}
```

**3. Nunca usar `messaging-history.set` chats como sync sob demanda.** O event só dispara em **estreia (pareamento novo)**. Reconnect via auth restaurada **não emite**. Tentar disconnect+reconnect pra forçar não funciona — só re-pareamento (que tem risco 401 conflict + ban temporário, ver L010).

## Onde se aplica

- Projetos WhatsApp via **Baileys** (não-oficial, fora da Cloud API da Meta).
- Cenários: disparo em massa, follow-up automático, welcome worker, qualquer fluxo que envia 1 msg outbound pra uma lista de phones.
- Crítico em **multi-chip** com worker automático rodando há tempos (caso FluxonApp/Carlos).
- Não se aplica a Cloud API da Meta (lá o JID é sempre PN).

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).