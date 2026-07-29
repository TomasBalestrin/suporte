# Feature: sofia-purchase-lookup (cross-reference WP↔Fluxon)

> Scope: **Medium (cirúrgico)** · Tier: **Opus** (dado vivo, external API, deploy) · 1 arquivo (`route.ts`).

## Problema (confirmado no banco vivo, 3 fontes)

A falha real nº 1 da Sofia era "cliente pagante + Sofia não acha a compra/conta" — **24/89 thumbs-down (27%)** históricos. Investigação (2026-05-23) revelou 3 camadas:

1. **Causa dominante = pre-fetch quebrado** (refactor v2 tirou o `consultar_fluxon` determinístico). Casos como robertastev (REELS MAGNETICOS, achável no Fluxon) e carlosbarbosa (IMPLEMENTAÇÃO CLEITON) recebiam "não encontrei conta" porque a Sofia só chamava o WP (email-only) e nunca o Fluxon. **Já consertado** pela restauração do pre-fetch (22/05).
2. **Irrecuperável**: tipo larissaneves — `identificacao: nao_encontrado` + 0 compras no Fluxon. Sem compra na fonte → nenhum fix no suporte resolve (cobertura do Fluxon / cliente sem compra real). Fora de escopo.
3. **Resíduo recuperável (ESTA feature)**: o WP (`/api/support/wordpress/consultar-acesso`) é **email-only**. Quando o cliente digita um e-mail que não bate com a conta de membros mas o **Fluxon casa ele por CPF/telefone**, a resposta do Fluxon traz o `cliente.email` canônico — dá pra reconsultar o WP com o e-mail certo.

## Contrato do Fluxon (sondado ao vivo, read-only)

`GET {FLUXON_BASE_URL}/api/support/lead?cpf=&email=&telefone=` (header `X-API-Key`) retorna:
- `identificacao`: `match_email` | (match por outras chaves) | `nao_encontrado`
- `cliente`: `{ nome, email, telefone, cpf_ultimos_4 }` ← **e-mail canônico aqui**
- `compras`: `[{ produto, plataforma, link_acesso, login_instrucao, whatsapp_entrega, ... }]`

`POST .../wordpress/consultar-acesso` body `{ email }` retorna `encontrado_em: julia|cleiton|ambas|<não>` + `dados`/`dados_ambas`. **Só aceita email.**

## Decisão (decided_by: butcher, usuário 2026-05-23)

Implementar o **cross-reference**: na pre-fetch, quando a busca WP por e-mail digitado falha mas o Fluxon casou, reconsultar o WP com o `cliente.email` do Fluxon. Se o e-mail que casou ≠ o digitado, **anotar no contexto** pra Sofia avisar o cliente sob qual e-mail está a conta. Fora de escopo: o caso `nao_encontrado` (Fluxon coverage — cross-repo, deferred).

## Tarefas (todas em `src/app/api/ai/chat/route.ts`)

- **T1** — No bloco pre-fetch do Fluxon (~L279-307), capturar o e-mail canônico: `let fluxonCanonicalEmail: string | null = null` e setar `fluxonCanonicalEmail = fl?.cliente?.email ?? null` quando `flRes.ok`.
- **T2** — Extrair a lógica de fetch+parse do WP (hoje inline ~L313-327) num helper module-level `async function fetchWpContext(email: string): Promise<string | null>` que retorna o contexto formatado (`encontrado_em` julia/cleiton/ambas) ou `null` se não achou. Reusa env + timeout 15s.
- **T3** — Reescrever o bloco WP da pre-fetch (~L309-332): manter o gatilho `KEYWORDS_ACESSO.test(lastMessageContent)`. Montar candidatos `[customer?.email, fluxonCanonicalEmail]` → filtrar vazios → dedupe case-insensitive. Iterar: `for (const em of candidatos) { wpContext = await fetchWpContext(em); if (wpContext) { matchedEmail = em; break } }`. Se `matchedEmail` (lowercased) ≠ `customer.email` (lowercased), prefixar `wpContext` com nota: `(Conta localizada sob o e-mail ${matchedEmail}, diferente do informado pelo cliente — informe isso a ele.)`.

## Verificação

- `npm run build` verde.
- Lógica: e-mail digitado bate → 1 só fetch (sem regressão). Digitado falha + Fluxon tem canônico diferente → 2º fetch com canônico; se achar, anota e-mail divergente. Fluxon não casou (`fluxonCanonicalEmail` null) → só o digitado (== comportamento atual).
- Smoke pós-deploy (MM): cenário com e-mail divergente + Fluxon-findable → Sofia entrega acesso citando o e-mail correto.

## Riscos / dívida

- **Latência** (Trem-Bala): no pior caso, 2 fetches WP sequenciais (timeout 15s cada) — só dispara em pergunta de acesso E quando o 1º falha. Aceitável; paralelizar não faz sentido (o 2º depende do 1º falhar). Registrar.
- Sem mudança no Fluxon nem no WP — contido no suporte.

## Gate ladder

Kimiko → ⭐ Luz Estrela (review) → 🍼 MM (deploy vercel --prod + smoke + monitora padrão "não encontrei conta") → 🔪 Bruto (merge).

## Rollback

Vercel 1-click (sem migration, sem schema). Mudança puramente de lógica de leitura.
