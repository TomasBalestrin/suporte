---
type: lesson
id: L015
title: "current_setting('request.jwt.claim.role') retorna NULL no Supabase Dashboard SQL Editor, não 'service_role'"
date: 2026-05-15
owners:
  - "[[Luz Estrela]]"
  - "[[Soldier Boy]]"
related:
  - "[[bethel-contratos]]"
  - "[[supabase]]"
occurrences: 1
severity: critical
---

# L015 — Trigger checando `current_setting('request.jwt.claim.role', true)` quebra bootstrap via Dashboard SQL Editor

## Gatilho

Você quer escrever uma **policy ou trigger no Postgres/Supabase** que diferencie:
- requisição via API com JWT `authenticated` (cliente do app)
- requisição via service_role (Edge Function / admin client / Dashboard)

E você ouviu/leu que "o Dashboard SQL Editor usa service_role". Pega `current_setting('request.jwt.claim.role', true)` como guard, comparando contra `'service_role'`. Algo tipo:

```sql
-- ❌ Errado:
IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
  RAISE EXCEPTION 'só service_role pode...';
END IF;
```

## Erro

**O claim `request.jwt.claim.role` é uma GUC setada pelo PostgREST/Supabase API ao processar uma request HTTP via gateway.** No Dashboard SQL Editor (que conecta direto no Postgres), essa GUC **não é setada** — `current_setting` retorna `NULL` (porque chamamos com `missing_ok=true`).

Resultado:
- `NULL <> 'service_role'` é `NULL` em Postgres (não TRUE nem FALSE).
- `IF NULL THEN ...` se comporta como `IF FALSE` — então **não dispara**.
- MAS, se você fizer `COALESCE(current_setting(...), '') <> 'service_role'`, vira `'' <> 'service_role'` = TRUE → **trigger dispara e bloqueia o próprio Dashboard**.

Probe que confirma (rodar no Dashboard SQL Editor):

```sql
SELECT
  current_user                                          AS current_user,
  session_user                                          AS session_user,
  current_setting('request.jwt.claim.role', true)       AS jwt_role_claim,
  auth.role()                                           AS auth_role;
-- Resultado típico no Dashboard:
-- current_user=postgres, session_user=postgres, jwt_role_claim=NULL, auth_role=NULL
```

## Causa

GUCs `request.jwt.*` são populadas pelo PostgREST (`SET LOCAL`) com base no JWT assinado da request HTTP — não pela conexão Postgres direta. O Dashboard SQL Editor não passa por PostgREST → claims não chegam.

Vale notar: `current_user` e `session_user` no Dashboard são `postgres` (o role nativo do Postgres) — porque é um superuser conectado direto. Isso é diferente do role do JWT que o PostgREST setaria (`anon`, `authenticated`, `service_role`).

## Fix

Usar `auth.role()` (helper oficial Supabase) em vez do `current_setting` cru. `auth.role()` retorna:
- Dashboard SQL Editor → `NULL` (sem claim de JWT)
- API com JWT `service_role` → `'service_role'`
- API com JWT `authenticated` → `'authenticated'`
- API anônima (sem JWT) → `'anon'`

Estrutura correta do trigger:

```sql
-- ✅ Bloqueia só quando vier de cliente authenticated da API.
-- Dashboard (auth.role()=NULL) e service_role passam.
IF NEW.role IS DISTINCT FROM OLD.role
   AND auth.role() = 'authenticated' THEN
  RAISE EXCEPTION 'role só pode ser alterado via service_role (Dashboard)'
    USING ERRCODE = '42501';
END IF;
```

A semântica vira "**bloquear se a request claramente vier de cliente authenticated**", não "permitir só se for service_role". Esses dois enunciados parecem equivalentes, mas o segundo bloqueia o Dashboard por acidente.

## Como pegar isso na planta (próxima vez)

- **Code review de trigger/policy** que tenta diferenciar service_role de authenticated: bater olho se usa `auth.role()` ou `current_setting`. Se usa `current_setting` com COALESCE pra string vazia → probable bug.
- **Probe empírico no Dashboard antes do deploy** de qualquer migration que adicione trigger/policy desse tipo. Rodar o SELECT acima e cravar o resultado. Confiar em doc casual é receita pra quebrar bootstrap.
- **Bootstrap manual via Dashboard precisa funcionar** — se sua app depende de promover 1º admin / setar flag / inicializar dado via SQL Editor, esse caminho não pode ser bloqueado pela própria proteção que você criou.

## Notas

- Pego em prod no **BETHEL CONTRATOS** (2026-05-15), feature 007 (RBAC admin), trigger M-06 `fn_block_self_role_change`. Luz Estrela suspeitou em code review estático ("Dashboard pode não setar o GUC"). Probe empírico em prod confirmou (`auth.role()=NULL`). M-06 corrigido pré-deploy.
- O guard alternativo `current_user IN ('postgres', 'supabase_admin')` também funciona pro Dashboard, mas vaza o nome do role superuser — `auth.role()` é mais limpo semanticamente.
- Em policies de RLS, a mesma confusão pode aparecer com `current_setting('request.jwt.claims', true)` (objeto JSON inteiro). Mesmo princípio: NULL no Dashboard. Usar `auth.uid()`, `auth.role()`, `auth.jwt()` (helpers oficiais).
- Ver [[L014-create-or-replace-function-novo-arg-default-cria-overload]] — outra lição cravada na mesma feature.
