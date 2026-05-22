---
type: lesson
id: L028
title: "Chip WhatsApp recém-saído de ban tem restrição granular de outreach (criar grupo/contatar novo) mas envio em grupo existente funciona"
date: 2026-05-19
owners:
  - "[[Bruto]]"
occurrences: 1
severity: medium
related:
  - "[[L022-baileys-disconnect-multiplo-trigga-ban-24h]]"
---

# L028 — Restrição pós-ban é granular: outreach bloqueado, envio liberado

## Gatilho

Chip Baileys voltou de ban 24h (repareado via [[P005]]). Operador quer voltar à operação:
- (a) enviar mensagens em grupos onde o chip já é membro/admin → **funciona**
- (b) criar grupos novos / adicionar pessoas que nunca interagiram → **bloqueado**

A intuição errada é "o chip voltou, posso fazer tudo de novo". Na verdade o WhatsApp mantém um **período de desconfiança** onde só libera operações de baixo risco.

## Erro

Tentar criar grupos (ou disparar pra números frios) logo após o chip voltar do ban. Erros que aparecem no resultado da operação Baileys:

- **`account_reachout_restricted`** — conta restrita de "alcançar" gente nova (criar grupo com participantes, mandar 1ª mensagem pra número que nunca respondeu). É anti-spam direcionado.
- **`rate-overlimit`** — quando há várias tentativas de criação em sequência, o limite de taxa (já reduzido pra chip suspeito) estoura nas tentativas 2+.

Caso real (FluxonApp, 2026-05-19): Carlos voltou de ban ~14h, fez 5 lotes de disparo em grupos existentes (**35/35 enviados, 0 erros**), e às ~21h tentou criar 4 grupos novos → #1 `account_reachout_restricted`, #2-4 `rate-overlimit`. Mesmo chip, mesma hora: envio OK, criação bloqueada.

## Correção Enforçada

1. **Pós-ban, separar operações por risco.** Liberadas cedo: enviar em grupo/conversa existente. Bloqueadas por dias: criar grupo, adicionar membro novo, 1ª mensagem pra número frio.
2. **Não interpretar `account_reachout_restricted` como "chip caiu de novo".** O chip continua `conectado` e funcional pra envio. É restrição de feature, não de sessão. Não disparar [[P005]] nem reparear — não adianta.
3. **Esperar o chip "esfriar"** (empiricamente 24-72h sem operação agressiva) antes de tentar outreach. Ou usar outro chip não-restrito pra a tarefa de criação.
4. **Pré-checar antes de prometer ao operador**: se o chip saiu de ban há <72h, avisar que criação de grupo provavelmente vai falhar e oferecer (a) esperar, (b) usar outro chip.

## Onde se aplica

- Qualquer chip Baileys/WhatsApp pós-ban, pós-pareamento novo, ou recém-criado (chip "frio").
- Operações de outreach: `groupCreate`, `groupParticipantsUpdate` (add), 1ª DM pra número sem histórico.
- NÃO se aplica a: envio em grupo onde já é membro, resposta a quem te mandou mensagem, envio pra contato que já respondeu antes.

## Anti-padrões que evita

- "o chip voltou, então re-pareei errado / preciso reparear de novo" (não — é restrição de feature)
- "criar 5 grupos de uma vez logo após o chip voltar" (rate-overlimit garantido)
- prometer ao operador que a criação de grupos vai funcionar sem checar há quanto tempo o chip saiu de ban

## Aplicado no FluxonApp em 2026-05-19

Diagnóstico do `grupo_automacoes.resultado` revelou os 2 erros. Recomendado a Eduardo: não criar grupos via Carlos hoje, esperar esfriar ou usar Cleiton (volta 2026-05-20). Envio normal seguiu liberado — 5 lotes 35/35.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` no repo do harness antes do commit.
