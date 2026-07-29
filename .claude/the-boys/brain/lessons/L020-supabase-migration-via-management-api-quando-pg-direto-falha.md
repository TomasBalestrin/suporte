---
type: lesson
id: L020
title: "Aplicar migration Supabase via Management API quando `pg` direto e pooler falham"
date: 2026-05-18
owners:
  - "[[Bruto]]"
  - "[[Kimiko]]"
  - "[[MM]]"
occurrences: 1
severity: medium
related:
  - "[[L015-supabase-jwt-claim-role-null-no-dashboard]]"
---

# L020 — Aplicar migration Supabase quando `pg` direto e pooler falham

## Gatilho

Precisa rodar `CREATE TABLE`/`ALTER`/`CREATE FUNCTION` numa migration nova num projeto Supabase. As 3 vias canônicas falham em sequência:

1. **`supabase db push`** (CLI) — retorna que tem **backlog enorme** de migrations não aplicadas (ex.: 11 arquivos no `supabase/migrations/`), mesmo todas já tendo sido aplicadas via outras vias. O CLI rastreia em uma tabela `_supabase_migrations` que pode estar dessincronizada da realidade. Push tenta reaplicar tudo → conflitos `relation already exists`.

2. **`pg` direto via Node** (`pg.Client` com host `db.<ref>.supabase.co:5432`) — host **só responde via IPv6**. No Windows com rota IPv4 padrão, `connect ENETUNREACH` ou DNS lookup falha. Supabase mudou direct connection pra IPv6-only em algum momento de 2025/2026.

3. **Pooler `aws-0-<region>.pooler.supabase.com:5432` ou `:6543`** — em alguns projetos retorna `Tenant or user not found` em **todas as regiões testadas** (sa-east-1, us-east-1, us-east-2, us-west-1, eu-west-1). Causa exata desconhecida, mas o erro é determinístico pra esse projeto específico (provavelmente role/IAM mal-cadastrado, ou conta no plan errado).

Resultado: dev fica preso 30-60min tentando os 3 caminhos antes de descobrir o 4º.

## Erro

Sintomas típicos por via:
- CLI: `supabase db push` mostra lista de migrations já aplicadas tentando reaplicar.
- `pg` direto: `connect ENETUNREACH ::1:5432` ou `getaddrinfo ENOTFOUND db.<ref>.supabase.co` (DNS só tem AAAA, sem A record).
- Pooler: `Tenant or user not found` em qualquer região, qualquer porta.

Tentativa típica que ainda **não funciona**:
- Forçar IPv4 com `family: 4` no `pg.Client` → DNS não tem A record, falha.
- `INSERT INTO supabase_migrations.schema_migrations` na mão pra "marcar como aplicado" → mascara o problema mas não roda o SQL.

## Correção Enforçada

Usar **Supabase Management API**:

```
POST https://api.supabase.com/v1/projects/<project_ref>/database/query
Authorization: Bearer $SUPABASE_ACCESS_TOKEN
Content-Type: application/json

{ "query": "<SQL aqui — pode ser multi-statement>" }
```

Onde:
- `<project_ref>` = chave do projeto Supabase (ex.: `lujfqkffrjxrddxfakjr`), visível na URL do dashboard.
- `$SUPABASE_ACCESS_TOKEN` = Personal Access Token criado em https://supabase.com/dashboard/account/tokens (NÃO é o `service_role_key`; é um token pessoal de gerenciamento). Costuma estar em `.env.local` de projetos auxiliares (Disparotey, scripts) — herdar de lá em vez de criar novo.

Script Node básico:

```js
import 'dotenv/config';
const SQL = await fs.readFile('supabase/migrations/<arquivo>.sql', 'utf8');
const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: SQL }),
});
console.log(r.status, await r.text());
```

Vantagens:
- Funciona via HTTPS público (qualquer IPv4/v6, sem dependência de pooler).
- Multi-statement OK (não precisa quebrar em `;`).
- Resposta detalhada inclui linhas afetadas e erros estruturados.

Limites:
- Endpoint é **gerenciamento**, não DML rotineiro. Não usar pra `SELECT/INSERT` de produção (é mais devagar que o REST/pooler normais).
- Não é "aplicado oficialmente" do ponto de vista da tabela de migrations do CLI — se quiser deixar registrado, fazer `INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260518000000')` após sucesso, pra o `supabase db push` futuro não tentar reaplicar.

## Onde se aplica

- Projeto Supabase novo cujo pooler retorna "tenant not found".
- Windows sem rota IPv6 funcional (típico).
- Migration urgente em prod (não pode esperar setup de túnel IPv6 ou pgbouncer alternativo).
- Casos onde o CLI Supabase está dessincronizado e `db push` é arriscado.

## Anti-padrões que esse fix evita

- "criar túnel IPv6 só pra aplicar 1 migration"
- "forçar `db push` e resolver conflitos `relation already exists` na mão"
- "subir VM no exterior só pra ter IPv4 → IPv6"
- "INSERT manual na tabela de migrations + rodar SQL no dashboard SQL editor manualmente" (funciona mas vira hábito ruim — não é idempotente nem versionado)

## Aplicado no FluxonApp em 2026-05-18

Migration `20260518000000_leads_externos.sql` (criar tabela `leads_externos` + índices + RLS). 3 vias falharam (CLI, pg direto, pooler em 5 regiões). Resolveu via Management API com `SUPABASE_ACCESS_TOKEN` reaproveitado do `.env.local` do Disparotey. Mesma técnica usada em todas as migrations seguintes desta sessão (`leads_externos_fix_unique`, `wa_chats`, `claim_rpcs_anti_dupe`, `fluxos_lead_unified`, `deprecate_followup_config`).

Atualizar `brain/projects/fluxonapp.md` removendo recomendação anterior de "só use `pg` direto pra migrations".

---

> Após registrar, rodar `npm run build && npm run sync:cursor` no repo do harness antes do commit.
