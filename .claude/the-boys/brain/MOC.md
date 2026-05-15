---
type: moc
title: The Boys — Map of Content
updated: 2026-05-14
---

# 🧠 The Boys — Map of Content

> Porta de entrada do vault. O que tá vivo aqui, quem é o time, onde decidir o quê. Pin essa nota (`Right-click tab → Pin`) pra ela ficar aberta.

---

## Time (10 personas)

![[personas.base]]

> Como invocar: `/a-lenda`, `/bruto`, `/edgar`, `/frances`, `/hughie`, `/kimiko`, `/luz-estrela`, `/mm`, `/soldierboy`, `/trem-bala`.

## Decisões ativas

![[decisions-ativas.base]]

> Nova decisão? `Cmd+P` → "Insert template" → `decisao` → preenche → grava em `brain/decisions/D###-<slug>.md`.

## Lições (F20 — Memória Autônoma)

![[lessons.base]]

> Padrão de erro recorrente (3ª ocorrência)? Registra como L###. Depois: `npm run build && npm run sync:cursor` ([[L004]] explica por quê).

## Playbooks (F21 — automated skill creation)

![[playbooks.base]]

> Procedimento que você executou pela 3ª vez? Vira P###. Captura "como a gente faz X" — gatilho, pré-requisitos, passos, verificação. Inspirado em [Hermes](https://hermes-agent.nousresearch.com/) / [OpenClaw](https://open-claw.org/) (ver [[D007]]), mas especializado pro fluxo SDD/brain do harness.

## Projetos mapeados

![[projects.base]]

> Brownfield novo? O [[Francês]] mapeia no 1º contato; usa template `projeto-mapeado`.

## Stacks

![[stacks.base]]

## Atividade recente

![[recent.base]]

---

## Por onde começar

- **Como o usuário trabalha** — convenções gerais, identidade git, idioma, ambiente: [[how-we-work]]
- **Brain README** — como navegar e contribuir: [[brain/README]]
- **Gate ladder visual** — qual ladder dispara em qual scope: [[gate-ladder]]
- **Arquitetura do harness** — pipeline `source → build → dist → install → cliente`: [[harness-arch]]
- **Failure modes do time** — o que cada persona previne: [[FAILURE_MODES]]
- **Protocolo de conflitos** — quem ganha quando 2 personas discordam: [[conflict-protocol]]

## Como contribuir

| Quero | Template | Vai pra | Pós-edição |
|---|---|---|---|
| Registrar decisão cross-projeto | `decisao` | `brain/decisions/` | `npm run build` |
| Registrar lição F20 | `licao-f20` | `brain/lessons/` | `npm run build && npm run sync:cursor` |
| Mapear projeto novo | `projeto-mapeado` | `brain/projects/` | — |
| Mapear stack nova | `stack` | `brain/stacks/` | — |

> **Regra**: edita o **source** no harness aqui. Vendorizado nos projetos-cliente regenera no próximo `node install/sync.mjs --target <projeto>`.

## Não-objetivos (por ora)

- Write-back automático projeto → harness — edite o canônico à mão.
- Busca semântica / embedding — não temos. Use search + tags.
- Ser repo separado — `brain/` é pasta dentro do harness.
