---
type: lesson
id: L010
title: "WhatsApp Multi-Device LID↔PN — sempre resolver antes de upsertar conversa"
date: 2026-05-15
owners:
  - "[[Bruto]]"
occurrences: 2
severity: high
related:
  - "[[fluxonapp]]"
---

# L010 — WhatsApp Multi-Device LID↔PN — sempre resolver antes de upsertar conversa

## Gatilho

Persistir mensagens recebidas via Baileys (ou qualquer client WhatsApp Multi-Device) usando `key.remoteJid` direto como identificador da conversa, sem resolver `@lid` → `@s.whatsapp.net` antes do upsert.

## Erro

WhatsApp Multi-Device (Beta MD desde 2021, default desde 2023) atribui DOIS JIDs pra mesma pessoa:
- **PN** (Phone Number): `554988850410@s.whatsapp.net` — telefone real, estável
- **LID** (Linked ID): `90628272717836@lid` — anônimo, key trocada, opaco

Em chats 1-1, o `key.remoteJid` em `messages.upsert` pode chegar como qualquer um dos dois — depende de versão WA do peer, da ordem dos eventos, de quem iniciou a conversa, e se a Meta já resolveu a equivalência. Resultado: **2 conversas separadas pra mesma pessoa**, cada uma com pedaços do histórico:

```
conversas:
  id=A  jid=90628272717836@lid              nome="Juce Garbo"   msgs=1
  id=B  jid=554988850410@s.whatsapp.net     nome=NULL           msgs=2
```

UI mostra avatar e nome divergentes; usuário acha que tem "dois contatos diferentes". Em grupos a Meta resolve (groupMetadata expõe LID + telefone), mas em DM pode demorar.

Incidente concreto (FluxonApp 2026-05-14): caso "Juce Garbo" no chip EQUIPE CLEITON. 1 conversa LID com nome + 1 conversa PN sem nome. Cleanup manual: `UPDATE mensagens.conversa_id LID→PN, UPDATE conversas.nome PN, DELETE conversa LID`.

## Correção Enforçada

**Não confiar em `key.remoteJid` direto.** Camada de resolução em 3 níveis (defesa em profundidade):

### 1. Tabela de aliases (canônico)
```sql
CREATE TABLE jid_aliases (
  chip_id UUID NOT NULL REFERENCES chips(id) ON DELETE CASCADE,
  lid_jid TEXT NOT NULL CHECK (lid_jid LIKE '%@lid'),
  pn_jid  TEXT NOT NULL CHECK (pn_jid LIKE '%@s.whatsapp.net'),
  origem  TEXT NOT NULL DEFAULT 'unknown',
  UNIQUE (chip_id, lid_jid)
);
```

### 2. Fontes de alimentação (idempotente, RPC)
- **`wa_contatos`** (canônico, vem de `contacts.upsert` Baileys — campo `lid` + `id` PN no Contact)
- **`grupos_membros`** com telefone resolvido pela Meta (groupMetadata)
- **`rawMsg.key.{remoteJidAlt,participantPn,senderPn}`** (Baileys 6.7+ pode revelar em chats LID)

```sql
INSERT INTO jid_aliases (...) SELECT ... FROM wa_contatos WHERE lid IS NOT NULL ...
ON CONFLICT (chip_id, lid_jid) DO NOTHING;
```

### 3. Resolver no service ANTES do upsert
```js
const resolvedJid = await resolveJid(chipId, msg.key.remoteJid);  // LID → PN se conhecido
await persistMessage({ jid: resolvedJid, ... });
```

Cache em memória (10min TTL) pra não fazer SELECT por mensagem.

### 4. Consolidação retroativa (idempotente)
RPC `consolidate_lid_conversas(chip_id)` move msgs LID→PN, preserva nome, deleta conversa LID. Roda após cada `syncGroups`.

## Por que isso pega gente

- **Baileys 6.7+ não expõe `lidMapping.getPNForLID`** — `signalRepository` existe mas sem helper. Documentação oficial é fraca; tutoriais ignoram.
- **Bug é silencioso**: em DEV com 2-3 contatos de teste o LID demora a aparecer. Em PROD com 100+ chats o defeito é "uns contatos aparecem duplicados, outros não" — fácil de atribuir a "bug do WhatsApp".
- **`key.participant`** (em grupos) é o JID do remetente, NÃO do peer da conversa — não resolve o problema.
- **Meta NÃO promete consistência**: mesmo após resolver, mensagens novas podem chegar como LID se o peer mudar a primary device.

## Detecção

```sql
-- Conversas duplicadas pra mesmo chip:
SELECT chip_id, COUNT(*) AS n
FROM conversas
GROUP BY chip_id, regexp_replace(jid, '@(lid|s\.whatsapp\.net)$', '')
HAVING COUNT(*) > 1;
```

Ou cruzar `wa_contatos.lid` com `conversas.jid LIKE '%@lid'` que tem PN equivalente em outra conversa.

## Aplica a

- FluxonApp (Baileys Multi-Device) — fix entregue 2026-05-15 ([[fluxonapp]])
- Qualquer projeto futuro usando Baileys / whatsapp-web.js / wppconnect em modo MD
- Não aplica a: Cloud API oficial da Meta (lá só tem PN, sem dichotomy)

## Referências
- [WhatsApp Multi-Device Architecture (Engenharia Meta)](https://engineering.fb.com/2021/07/14/security/whatsapp-multi-device/)
- Baileys issue tracker: buscar "LID" pra ver discussões em aberto
- Migration de referência: `supabase/migrations/20260514100000_jid_aliases.sql` no FluxonApp
