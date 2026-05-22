---
type: lesson
id: L025
title: "Pipeline de lead repetitivo em N fontes vira N rows numa tabela unificada — não 1 endpoint + 1 config singleton por fonte"
date: 2026-05-19
owners:
  - "[[Bruto]]"
occurrences: 1
severity: medium
related:
  - "[[L019-fix-parcial-em-1-de-N-callsites-gera-regressao-silenciosa]]"
---

# L025 — Pipeline de lead repetitivo em N fontes vira N rows numa tabela unificada

## Gatilho

Operador (cliente final, sem dev) precisa adicionar nova planilha/form como fonte de lead. Pra cada nova fonte, fluxo é o MESMO conceito:
1. Endpoint recebe webhook
2. Aplica filtros (renda, posição, anti-dupe)
3. Espera atraso (imediato, +30min, em horário fixo)
4. Renderiza template de mensagem com placeholders
5. Envia via chip específico (com estratégia de fallback)

**Sem unificação:** cada nova fonte exige:
- Criar endpoint Next.js dedicado
- Criar tabela ou config singleton dedicada
- Criar worker dedicado ou refatorar worker existente pra ler config diferente
- Editar UI pra mostrar config nova
- Deploy

Resultado: **adicionar 1 fonte custa 1-2 horas de dev mesmo pra mudança de copy**. Operador depende de dev sênior.

## Erro

Stack tende a se fragmentar em N anti-patterns concorrentes:
- N tabelas `xxx_config` singleton (mesmo schema com nomes diferentes)
- N endpoints `/api/xxx/yyy` quase idênticos
- N workers ou workers acoplados a strings hardcoded
- N pontos de UI pra editar texto/chip/filtro
- Operador perde controle de "quantas planilhas estão vivas"

E quando bug aparece num fluxo (ex.: mutex faltando), o fix tem que ser replicado em todos os outros (ver [[L019]]).

## Correção Enforçada

Modelar pipeline como **tabela de rows configuráveis**:

```sql
CREATE TABLE fluxos_lead (
  id uuid PRIMARY KEY,
  nome text,
  ativo boolean,
  -- ① FONTE
  fonte_endpoint text,            -- '/api/external/leads/quilforms'
  fonte_filtro_chave text,        -- 'form_id'
  fonte_filtro_valor text,        -- '15519' (ou NULL = aceita qualquer)
  -- ② FILTROS (jsonb pra flexibilidade)
  filtros jsonb,
  -- ③ ATRASO
  atraso_tipo text,               -- 'imediato' | 'after_minutos' | 'horario_fixo'
  atraso_minutos int,
  atraso_horario text,
  -- ④ MENSAGEM
  template_id uuid REFERENCES templates_mensagem(id),
  -- ⑤ CHIP
  chip_phone_primario text,
  chip_fallback_estrategia text,  -- 'esperar' | 'ignorar' | 'outro_chip'
  chip_fallback_phone text
);

CREATE UNIQUE INDEX fluxos_unique_ativo ON fluxos_lead(fonte_endpoint, fonte_filtro_valor) WHERE ativo;
```

Endpoint **genérico** resolve fluxo via filter-key no payload:

```ts
// /api/external/leads/quilforms
const { fluxo } = await db.from('fluxos_lead')
  .select('id, nome')
  .eq('fonte_endpoint', '/api/external/leads/quilforms')
  .eq('fonte_filtro_chave', 'form_id')
  .eq('fonte_filtro_valor', payload.form_id)
  .eq('ativo', true)
  .maybeSingle();

await db.from('leads_externos').insert({
  ...lead,
  fluxo_id: fluxo?.id ?? null,
  status: fluxo ? 'recebido' : 'sem_fluxo'  // bucket sem_fluxo pra revisão manual
});
```

Worker **lê config por fluxo**, não config global:

```ts
const { data: leads } = await db.rpc('claim_leads_externos_recebidos', { p_limit: 5 });
const fluxos = await fetchFluxosByIds(leads.map(l => l.fluxo_id));
for (const lead of leads) {
  const fluxo = fluxos.get(lead.fluxo_id);
  if (!atrasoCumprido(fluxo, lead.recebido_at)) { rollback(); continue; }
  await session.sendTextByPhone(lead.phone, render(fluxo.template, lead));
}
```

UI **um editor por linha** com 5 cards visuais (Fonte/Filtros/Atraso/Mensagem/Chip). Adicionar fonte nova = `INSERT INTO fluxos_lead` via UI. Zero código.

**Lead "órfão"** (recebido mas filter-key não casa com nenhum fluxo ativo): grava com `status='sem_fluxo'` em vez de retornar 404. Apps Script do operador não vê erro no log; operador inspeciona bucket via UI e decide criar fluxo retroativo ou marcar ignorado.

## Onde se aplica

- Sistema com N fontes diferentes alimentando o mesmo pipeline (welcome de lead, follow-up, notificação).
- Particularmente bom quando operador não-dev precisa adicionar/editar fontes.
- Aplica também a:
  - Pipelines de e-mail (N forms → N templates → N senders)
  - Webhooks de pagamento (N gateways → N flows)
  - Integrações Zapier-style internas (N triggers → N actions)

## Anti-padrões que esse modelo evita

- "criar nova migration toda vez que aparece form novo"
- "duplicar worker pra cada fonte"
- "config singleton com nome esquisito pra cada cliente"
- "lead órfão retorna 404 → log fica cheio de erro"

## Aplicado no FluxonApp em 2026-05-19

Migration `20260519130000_fluxos_lead_unified.sql` cria as 2 tabelas + 1 FK. Tipos em `src/types/fluxo.ts`. APIs em `src/app/api/fluxos/` + `src/app/api/templates-mensagem/`. UI em `src/app/dashboard/fluxos/` + `src/components/fluxos/`. Worker `service/lib/leads-worker.js` refatorado. Endpoint `src/app/api/external/leads/quilforms/route.ts` refatorado.

`followup_config` singleton anterior marcado deprecated via COMMENT SQL (drop programado pra 2026-05-26 após 1 semana de compat).

---

> Após registrar, rodar `npm run build && npm run sync:cursor` no repo do harness antes do commit.
