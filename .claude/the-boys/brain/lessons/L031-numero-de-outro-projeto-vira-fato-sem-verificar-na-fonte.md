---
type: lesson
id: L031
title: "Número de outro projeto vira 'fato' no design sem verificar — contar na fonte antes de escrever quantidade em artefato"
date: 2026-05-21
owners:
  - "[[Bruto]]"
  - "[[A Lenda]]"
  - "[[Frances]]"
occurrences: 1
severity: high
related:
  - "[[fluxon]]"
  - "[[L011]]"
---

# L031 — Quantidade lembrada de cabeça (ou de outro projeto) escrita como fato em spec/design contamina decisão downstream

## Gatilho

Você precisa de um número pra justificar uma decisão num artefato (spec / design / STATE / relatório): tamanho de base, volume de mensagens, custo, contagem de linhas, %. O número aparece "de memória" — de uma sessão anterior, de um brain note, ou de **outro projeto** do mesmo cliente. Você escreve ele no documento como se fosse fato deste projeto.

## Erro

2026-05-21, Fluxon: o Bruto escreveu no `design.md` da feature `analise-ia-leads` que a base era de **"127k leads"**, e usou isso pra justificar a escolha do modelo (`gpt-4o`) e o risco de perf do join `leads_brutos × logs_disparo`. A A Lenda repetiu o número no red-team. **O `127.683` era do projeto Hub Lead** (Supabase ref `kwqbprjdvkgkpchpevpi`) — banco DIFERENTE, que estava na memória da sessão. O `leads_brutos` real do Fluxon (`citwaazfegjixoaupzxj`) tinha **13.974** (~14k) — ordem de grandeza errada (9x).

O número errado já estava **commitado e pushado** (design.md + STATE.md) quando o usuário pegou: *"o que é esse 127k que você está falando?"* e depois *"isso não pode se repetir"*. Contaminou 2 decisões: (1) superdimensionou o risco de perf — um join 14k×44,5k é trivial pro Postgres, não o gargalo que foi pintado; (2) inflou a justificativa do modelo com stake falso.

Mesma família de [[L011]] (review não pega o que falta) e da postura geral do harness contra chute: **quantidade citada como fato em doc de design vira premissa de decisão lá na frente.** Errar o número é errar a decisão.

## Correção Enforçada

1. **Nenhuma quantidade** (count, volume, tamanho, custo, %, latência) entra num artefato (spec/design/tasks/STATE/relatório) **como fato** sem ter sido medida NA FONTE deste projeto, NESTA sessão.
2. Se o número vem de memória / brain / outra sessão → **ou re-verifica na fonte, ou marca explícito** como `~estimado` / `não verificado`. Número sem proveniência verificável não vira premissa.
3. **Cross-projeto é armadilha dupla:** a MESMA métrica (leads, mensagens, usuários) tem valor DIFERENTE em cada banco. Nunca reaproveitar número do projeto A no projeto B. Confirmar o **ref do Supabase/DB** antes de citar — clientes como a MV4 têm vários projetos com schemas parecidos (Fluxon, FluxonApp, Hub Lead, Sofia) e nomes de métrica que colidem.
4. **Comando padrão pra contar no Supabase** (REST, read-only, sem CLI):
   ```
   GET {url}/rest/v1/{tabela}?select=id   (method HEAD)
   headers: apikey + Authorization Bearer <service_role>, Prefer: count=exact, Range: 0-0
   → lê o header content-range "0-0/TOTAL"
   ```

## Onde se aplica

- Qualquer artefato de SDD que cita número pra justificar decisão (modelo, índice, arquitetura, escopo, custo).
- Especialmente forte quando o usuário opera **múltiplos projetos com schemas parecidos** — métrica com mesmo nome, valor diferente por banco.
- Vale pra qualquer persona que escreve em `.specs/` ou no brain (Bruto, A Lenda, Hughie, Francês).

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
