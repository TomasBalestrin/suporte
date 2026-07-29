---
type: lesson
id: L026
title: "WhatsApp Coexistence (Business app + Cloud API no mesmo número) é gated — só Solution Partner ou Tech Provider aprovado pela Meta pode usar"
date: 2026-05-19
owners:
  - "[[Bruto]]"
  - "[[Francês]]"
occurrences: 1
severity: high
related:
  - "[[L013-multiplas-sessoes-claude-paralelas-mesmo-repo]]"
---

# L026 — WhatsApp Coexistence é feature gated (precisa Tech Provider/Solution Partner)

## Gatilho

Mapeei um playbook explicando como "adicionar número WhatsApp Business app existente ao Fluxon via Coexistence" baseado em docs Meta e artigos de blog (yCloud, Sanuker). O playbook afirmava que **qualquer empresa com Cloud API direto + System User Token** pode iniciar Embedded Signup e escolher "Conectar app do WhatsApp Business existente". Coloquei como "próximo passo" pro dia seguinte com playbook completo (passos no Business Manager + INSERT em remetentes + criação de templates).

Cenário concreto (2026-05-18 22:59 BRT no Fluxon): sessão Claude paralela criou o playbook completo no `STATE.md` do Fluxon. Próxima sessão (2026-05-19) iria executar o onboarding do chip Carlos (`5549999742914`).

## Erro

A premissa está **errada**. A doc Meta oficial é explícita:

> *"You must already be a Solution Partner or Tech Provider to enable onboarding of WhatsApp Business app users."* — [Meta — Onboard WhatsApp Business App users](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users)

A distinção crítica que confunde:

| Operação | Requer ser Tech Provider? |
|---|---|
| **Cloud API direto** — adicionar número novo (não-Coexistence), criar templates, mandar mensagens em escala | ❌ Não — qualquer empresa com Meta App + System User pode |
| **Coexistence** — conectar **app existente** à Cloud API sem tirar do celular | ✅ Sim — gated pelo Embedded Signup com Advanced access em `whatsapp_business_management` |

Ambas usam Cloud API. A diferença é o **fluxo de onboarding**. Coexistence usa Embedded Signup v3+ que só aparece pra apps com Advanced access aprovado pela Meta (App Review obrigatório).

Em 2026 mudou também: o old **On-Behalf-Of (OBO) model** foi descontinuado — empresas finais devem possuir o WABA direto, BSPs não podem mais "guardar" WABA por trás.

## Fix / Validação

Antes de prometer "vamos fazer Coexistence" em qualquer playbook ou plano:

1. **Validar com Meta docs oficiais primeiro** — não confiar só em blogs (yCloud, Sanuker, Respond.io tendem a vender o serviço deles, podem omitir o pré-requisito de ser parceiro).
2. **Checar status do app:** o app tem Advanced access em `whatsapp_business_messaging` + `whatsapp_business_management`? Se não, Coexistence está bloqueada.
3. **Checar se faz sentido virar Tech Provider:** se a empresa só opera WABAs sob seu próprio Business Portfolio (uso interno, mesmo CNPJ), virar Tech Provider é frágil — Meta pode rejeitar a App Review com "uso interno, Standard access basta".
4. **Caminho alternativo:** se Coexistence é necessária mas Tech Provider não cabe, usar BSP/Solution Partner existente (Twilio, 360Dialog, Wati, Z-API, Take Blip). BSPs já têm o status — empresa final paga mensalidade pra usar a infra deles pra Coexistence específica.

## Ocorrência canônica

**Fluxon — Bethel/MV4 (2026-05-18 + 2026-05-19):** sessão Claude paralela criou playbook "Adicionar número via Coexistence" no STATE.md afirmando que dava pra executar direto (sem BSP). Próxima sessão (Bruto, 2026-05-19) descobriu via Meta docs + cross-check com yCloud + chakrahq que **a premissa estava errada**: Coexistence é gated. Pior: Bethel/MV4 tem todos os WABAs sob 1 Business Portfolio (`798432095945362` MV4 Digital LTDA), o que torna virar Tech Provider frágil pela narrativa "uso interno, não cliente externo". Decisão final parqueada pelo usuário. Playbook do STATE.md marcado com banner ⚠️ REVISAR.

## Como propagar (canon do harness)

- O **Francês** (researcher) sempre valida premissa de feature gated via doc oficial do provedor (Meta, Google, Stripe, etc) antes de mapear playbook — não confiar só em vendor blogs.
- O **Bruto** (orquestrador) treat "feature exclusiva a parceiros aprovados" como red flag — se o playbook depende de status especial (Tech Provider, Solution Partner, Marketplace App), confirmar o status ANTES de prometer execução.
- A **Lenda** (red-team) red-teamia playbooks com "isso assume que tem permissão de Y — temos Y?" quando o playbook é arquitetural.
