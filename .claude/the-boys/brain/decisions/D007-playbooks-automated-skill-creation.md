---
type: decision
id: D007
title: "Playbooks (F21) — automated skill creation inspirada em Hermes/OpenClaw"
date: 2026-05-14
status: accepted
owner:
  - "[[Bruto]]"
affects:
  - "[[FluxonApp]]"
  - "[[Fluxon]]"
  - "[[Bethel Anúncios]]"
  - "[[Bethel RH]]"
supersedes:
related:
  - "[[D020]]"
---

# D007 — Playbooks (F21) — automated skill creation inspirada em Hermes/OpenClaw

## O quê

Adicionar **Playbooks** (`brain/playbooks/P###-<slug>.md`) ao cérebro. Playbook = procedimento recorrente documentado, criado autonomamente pelas personas quando um padrão de execução se repete pela 3ª vez (mesmo threshold do F20). Cada playbook tem: gatilho, pré-requisitos, passos numerados, verificação, variações.

Nova autoridade: as 7 personas que já podem registrar lições F20 ([[Bruto]], [[Soldier Boy]], [[Luz Estrela]], [[MM]], [[Trem-Bala]], [[Hughie]], [[A Lenda]]) podem também criar playbooks. Protocolo chamado **F21**.

## Por quê

Pesquisa em 2026-05-14 mostrou dois agentes open-source com propostas parecidas que ficaram virais:

- **[OpenClaw](https://open-claw.org/)** (Peter Steinberger, jan/2026, 100k stars em 1 semana) — "self-improving" personal AI agent. Escreve código de skill nova autonomamente quando detecta tarefa recorrente.
- **[Hermes Agent](https://hermes-agent.nousresearch.com/)** (Nous Research, fev/2026) — CLI agent com persistent memory + automated skill creation.

Ambos têm 3 ideias relevantes pro harness:

1. **Self-improving skills** → no The Boys já existe via F20 (lessons). Faltava o equivalente pra *procedimentos de execução*, não só "padrões de erro".
2. **Persistent memory** → já existe via `brain/`.
3. **Multi-platform** → não-objetivo (foco em dev, não chat pessoal).

A ideia #1 expandida = Playbooks. Captura "como a gente faz X" em vez de só "o que dá errado quando".

## Aplica quando

- Persona executa procedimento manual sequencial pela 3ª vez na mesma sessão ou em sessões próximas (ex: "subir Obsidian num projeto novo", "mapear brownfield", "aplicar migration Supabase").
- Protocolo F21: persona registra playbook autonomamente em `brain/playbooks/P###-<slug>.md` via template `playbook.md`.
- Build regenera `the-boys-playbooks.mdc` (Cursor), `sync-all` propaga pros clientes.

## Consequências

- **Brain ganha 5ª categoria**: convention (how-we-work), decision (D###), lesson (L###), stack, project, **playbook (P###)**.
- **Cursor recebe** novo `.cursor/rules/the-boys-playbooks.mdc` automaticamente.
- **Bases nova**: `brain/views/playbooks.base` no MOC.
- **Validator** ganha checagem de IDs sequenciais P### (igual D### e L###).
- **Não migra** pra Hermes/OpenClaw nem adota framework deles — só importa a ideia.

## Alternativas consideradas

- **Migrar pra OpenClaw**: descartado. The Boys é especializado em SDD/dev com 10 personas + gate ladder + conflict protocol — OpenClaw é genérico (assistente pessoal multi-uso, foco em WhatsApp/Telegram). Domínio diferente.
- **Hermes Agent como backend**: descartado. Hermes roda 300+ modelos; The Boys roda em Claude prim. Sem ganho prático.
- **Skill = nova persona**: descartado. Persona é commitment pesado (voice, role, gate ladder, conflict). Não vale criar persona pra cada playbook.
- **Skill = `.claude/skills/<name>/SKILL.md` autogerado**: deferred. F21 primeiro entrega o **dado** (playbook em `brain/`); geração de SKILL.md a partir do playbook fica pra v0.16+ se virar repetitivo.
