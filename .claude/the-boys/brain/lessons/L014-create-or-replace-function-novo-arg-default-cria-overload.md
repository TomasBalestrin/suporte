---
type: lesson
id: L014
title: "CREATE OR REPLACE FUNCTION com novo arg DEFAULT cria OVERLOAD, não substitui"
date: 2026-05-15
owners:
  - "[[Luz Estrela]]"
  - "[[MM]]"
occurrences: 1
severity: high
related:
  - "[[bethel-contratos]]"
  - "[[supabase]]"
  - "[[postgres]]"
---

# L014 — `CREATE OR REPLACE FUNCTION` adicionando arg com `DEFAULT` cria OVERLOAD, não substitui

## Gatilho

Você está mexendo numa função PL/pgSQL existente no Postgres/Supabase (`fn_xyz(a, b, c)`) e precisa **adicionar um parâmetro** com `DEFAULT` no final (`fn_xyz(a, b, c, d DEFAULT FALSE)`). Pega `CREATE OR REPLACE FUNCTION` e adiciona o arg novo, confiando que o `OR REPLACE` vai substituir a versão antiga.

## Erro

**Postgres trata função pela tupla `(schema.nome, tipos_dos_args)`.** Mudar o número de args muda a "identidade" da função — `CREATE OR REPLACE` aceita o SQL sem erro, mas o resultado é **duas funções com o mesmo nome**, uma antiga (sem o novo arg) e uma nova (com).

Probe que detecta:

```sql
SELECT pg_get_function_identity_arguments(oid)
FROM pg_proc WHERE proname='fn_xyz' AND pronamespace='public'::regnamespace;
-- Se retornar 2 linhas: você caiu na pegadinha.
```

## Causa

Estrutura do catálogo Postgres: cada combinação (nome, arg_types) é uma entrada distinta em `pg_proc`. `CREATE OR REPLACE` só substitui se a tupla bater **exatamente**. Adicionar um parâmetro (mesmo com `DEFAULT`) gera uma tupla diferente → cria uma nova função.

**Impacto operacional**:
- Calls antigos (3 args) caem na função antiga (sem o comportamento novo).
- Calls novos (4 args) caem na função nova.
- Resolução de overload em call ambíguo (ex: cliente PostgREST que omite o arg com DEFAULT) pode pegar **qualquer um dos overloads** — comportamento não-determinístico.

Pego em prod no **BETHEL CONTRATOS** (2026-05-15) na migration M-05 da feature 007 (`fn_cancelar_contrato` ganhando `p_is_admin BOOLEAN DEFAULT FALSE`). Luz Estrela já tinha suspeitado em code review, MM confirmou no smoke pós-migration.

## Fix imediato

`DROP FUNCTION IF EXISTS public.fn_xyz(<tipos antigos>);` **antes** do `CREATE OR REPLACE` (mesma migration). Exemplo do caso real:

```sql
-- M-05: fn_cancelar_contrato ganha p_is_admin BOOLEAN DEFAULT FALSE
DROP FUNCTION IF EXISTS public.fn_cancelar_contrato(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.fn_cancelar_contrato(
  p_contrato_id UUID,
  p_criador_id  UUID,
  p_motivo      TEXT DEFAULT NULL,
  p_is_admin    BOOLEAN DEFAULT FALSE
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$ ... $$;
```

`IF EXISTS` torna a migration idempotente (rodar 2x não falha).

## Como pegar isso na planta (próxima vez)

- **Code review de migration** que muda assinatura de função: bater olho se tem `DROP FUNCTION IF EXISTS (tipos antigos)` antes do `CREATE OR REPLACE`. Se não tem, pedir.
- **Smoke pós-migration**: rodar o probe acima (`SELECT pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname='...'`). Se vier mais de 1 linha, sinal claro.
- **Regra prática**: `CREATE OR REPLACE FUNCTION` substitui apenas se nem o nome nem a tupla de args mudar. Mudou args? Drop antes.

## Notas

- A doc do Postgres diz isso ([CREATE FUNCTION — Notes](https://www.postgresql.org/docs/current/sql-createfunction.html)), mas é fácil esquecer porque `CREATE OR REPLACE` "soa" como upsert.
- Sintoma diferente do erro `42P13 "cannot change return type"`: mudar **tipo de retorno** falha alto (erro explícito); adicionar args com DEFAULT passa silencioso.
- Funções `SECURITY DEFINER` overloaded podem virar superfície de ataque se uma das versões der bypass. No caso da 007, as duas versões de `fn_cancelar_contrato` tinham guards similares — sem risco real, só dívida técnica. Mas em outro contexto pode virar buraco.
- Detectado durante o execute Large da [[feature 007 RBAC|bethel-contratos]] em prod (commit `ecdc6b4`); fix incorporado direto no arquivo M-05 antes do commit pra quem aplicar do zero pegar o comportamento certo.
