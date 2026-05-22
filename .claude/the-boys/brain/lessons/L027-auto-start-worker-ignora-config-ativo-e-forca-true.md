---
type: lesson
id: L027
title: "Auto-start de worker ignora flag `config.ativo` e o `start()` força ativo=true — defesa em camadas só sobrevive com fila pendente vazia"
date: 2026-05-19
owners:
  - "[[Bruto]]"
  - "[[MM]]"
occurrences: 1
severity: medium
related:
  - "[[L022-baileys-disconnect-multiplo-trigga-ban-24h]]"
  - "[[L024-queue-worker-claim-atomico-defesa-profunda]]"
---

# L027 — Auto-start de worker ignora `config.ativo`

## Gatilho

Worker periódico/de fila com dois controles aparentes:
1. **Tabela de config por entidade** (`xxx_config.ativo: boolean`) — interface "liga/desliga" no UI.
2. **Fila de trabalho pendente** (`xxx_fila.status='pendente'`) — itens a processar.

Boot do processo dispara `autoStartXxx()` que itera entidades com fila pendente e chama `worker.start(id)`.

Operador desliga o flag `config.ativo=false` esperando que isso pare o worker. Container reinicia (deploy/restart/crash). Worker volta a rodar **mesmo com flag desligado**, porque:

- `autoStartXxx()` **não checa** `config.ativo` — usa só `fila.status='pendente'`.
- `worker.start(id)` **força** `UPDATE config SET ativo=true` (provavelmente pra "garantir que o config existe e está pronto").

Resultado: a única forma real de manter o worker desligado é manter `fila` sem itens `pendente`. Setar `ativo=false` é decorativo.

## Erro

```js
// chip-manager.js (FluxonApp, 2026-05-19)
async autoStartWarming(warmingWorker) {
  const { data: pendentes } = await getDb()
    .from('warming_lids')
    .select('chip_id')
    .eq('status', 'pendente');
  // ❌ não consulta warming_config.ativo
  const chipIds = [...new Set((pendentes ?? []).map((r) => r.chip_id))];
  for (const cid of chipIds) {
    await warmingWorker.start(cid);
  }
}

// warming-worker.js:71-86
async start(chipId) {
  let { data: cfg } = await db.from('warming_config').select('*').eq('chip_id', chipId).single();
  if (!cfg) {
    await db.from('warming_config').insert({ chip_id: chipId, ativo: true });
  } else {
    await db.from('warming_config').update({ ativo: true }).eq('chip_id', chipId);
    // ❌ FORÇA ativo=true sem checar valor anterior nem motivo
  }
  // ... entra no loop
}
```

Operador imagina hierarquia:
- `config.ativo=false` → off global
- `config.ativo=true` + `fila vazia` → ligado mas inativo
- `config.ativo=true` + `fila cheia` → trabalhando

Realidade:
- `fila cheia` → trabalhando, qualquer valor de `ativo` é ignorado e sobrescrito pra true

## Correção Enforçada

**Curto prazo (operacional, sem deploy):**
1. Pra parar o worker em runtime: chamar `worker.stop(id)` (já existe).
2. Pra **impedir auto-start no próximo boot**: limpar a fila pendente — `UPDATE fila SET status='ignorado', erro='pausado_<motivo>_<data>' WHERE entity_id=X AND status='pendente'`. **Não basta** setar `config.ativo=false`.

**Médio prazo (fix de design):**
3. `autoStartXxx` deve respeitar `config.ativo`:
   ```js
   const { data: pendentes } = await getDb()
     .from('warming_lids')
     .select('chip_id, warming_config!inner(ativo)')
     .eq('status', 'pendente')
     .eq('warming_config.ativo', true);  // ← gate
   ```
4. `worker.start(id)` **não** deve forçar `ativo=true`. Se chamado com `ativo=false`, retornar `{ ok: false, error: 'worker desativado por config' }` e deixar o operador ligar explicitamente.

**Longo prazo (UX):**
5. UI deve mostrar **ambos os estados**: "config: ligado/desligado" + "fila: N pendentes" + "runtime: rodando há Xmin / parado". Operador entende a hierarquia.

## Onde se aplica

- `WarmingWorker` (FluxonApp) — confirmado.
- Outros workers do mesmo projeto com padrão `autoStartXxx + start(id)`:
  - `WelcomeWorker` (boas_vindas_fila) — autoStart genérico no boot, sem `xxx_config` próprio, depende de `mentoria_config.ativo`. **Auditar**: o `start()` força `mentoria_config.ativo=true`?
  - `MentoriaFollowupWorker` — idem.
  - `LeadsWorker` — agora lê `fluxos_lead.ativo` por lead na hora de processar, então OK pra essa camada — mas o trigger periódico (`scheduler`) precisa do mesmo cuidado.
- Mais amplo: qualquer worker que combine "tabela de config flag + tabela de fila pendente + auto-start no boot" precisa do gate no auto-start.

## Anti-padrões relacionados

- "operador desligou no painel mas o sistema voltou sozinho depois do deploy" — sintoma clássico desse padrão.
- "ativo=true é o estado bom, então deixa eu garantir que está true" — bom-intencionado mas atropela o operador.
- Defesa em camadas (L024) supõe que cada camada respeita as outras. Se uma camada **força** o estado da outra, defesa quebra.

## Aplicado no FluxonApp em 2026-05-19

Incidente: Carlos voltou do ban 24h, Eduardo pediu garantir "nenhuma função automática ativa". Audit revelou 288 `warming_lids` pendentes pro Carlos com `warming_config.ativo=false`. Bug: o `autoStartWarming` ignora isso e o `start()` force-trues no próximo boot.

**Aplicado (operacional)**: 288 LIDs marcados `status='ignorado'` com tag `pausado_apos_ban_2026-05-19_eduardo` + `warming_config.ativo=false` (decorativo, mas reverso fácil quando religar).

**Pendente (deploy)**: fix de design em `chip-manager.js:82-113` (`autoStartWarming` checar `warming_config.ativo`) + `warming-worker.js:85` (`start()` não forçar `ativo=true`).

---

> Após registrar, rodar `npm run build && npm run sync:cursor` no repo do harness antes do commit.