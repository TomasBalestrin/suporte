---
type: lesson
id: L032
title: "Numeração sequencial (D###, migration NNNN) colide entre 2 chats em paralelo — reserva tem que ser claim atômico + faixa por agente"
date: 2026-05-21
owners:
  - "[[Bruto]]"
occurrences: 3
severity: high
related:
  - "[[L033]]"
---

# L032 — Reserva de número sequencial por "está livre" não é atômica: dois agentes em paralelo pegam o mesmo

## Gatilho

Dois chats/agentes trabalham em **branches paralelas** do mesmo repo (multichat). Cada um precisa de um identificador **sequencial** pra um artefato: decisão `D###` no STATE, migration `NNNN_*.sql`, ADR, diretório de feature. Cada um pega "o próximo número livre".

## Erro

2026-05-21, Hub Lead, dois chats (Chat A = event-forms / Chat B = sheets-sync). O protocolo de paralelismo (`D027`) **reservou no STATE**: *"próxima migration livre = 0009"*. Os **dois** leram isso e os **dois** pegaram. Resultado, 3 colisões na mesma sessão:
1. **`D027` duplicado** — "protocolo paralelo" (Chat B) × "tag UX" (Chat A).
2. **Migration `0009` duplicada** — `0009_tag_manual` (Chat A) × `0009_sheets_sync` (Chat B).
3. Chat B cedeu e pegou `0010` → **`0010` também colidiu** (Chat A já tinha avançado pra `0010_count_leads` + `0011` enquanto B trabalhava).

Sintoma: conflito de merge no `STATE.md` (os dois editaram a mesma região) + dois arquivos de migration com o mesmo número (o runner aplica errado ou pula). A raiz: **declarar que "X está livre" não impede dois consumidores de consumirem X.** Reserva sem dono é só uma observação, não um lock. E "o próximo livre" muda enquanto o outro agente commita.

## Correção Enforçada

1. **Reserva = claim explícito de QUEM pega, escrito e commitado ANTES de usar.** "`0009` está livre" não vale; "`0009` é do Chat B (sheets), commitado às 15h" vale.
2. **Faixa por agente** onde o número é só rótulo (decisões `D###`, ADRs): Chat A na faixa baixa (`D0xx`), Chat B numa faixa alta reservada (`D1xx`). Nunca mais colidem. (Foi o que resolveu: sheets virou `D101`.)
3. **Migration é sequencial obrigatório** (o Postgres aplica em ordem) → faixa não serve. Regra: **cravar o número olhando o `git` do `main` ATUAL na hora de criar, não o estado da branch base de quando começou** — o outro agente provavelmente avançou. Confira `ls supabase/migrations/` no `main` antes de numerar.
4. **IDs por timestamp matam a colisão na raiz** (`D-YYYYMMDD-HHMM`, estilo Zettelkasten / nota-por-decisão). Se multichat virar rotina, migrar o `STATE.md` monolítico pra `decisions/` (1 nota = 1 arquivo) elimina tanto a colisão de número quanto o conflito de merge no arquivo único.

## Onde se aplica

- Qualquer projeto com **2+ chats/agentes em branches paralelas** e numeração sequencial compartilhada (decisões, migrations, ADRs, dirs de feature).
- Forte no harness The Boys quando o usuário roda 2 chats no mesmo repo pra paralelizar (ver protocolo de trabalho paralelo / "Gate Ladder").
- O `STATE.md` (ou qualquer doc monolítico append-only) é o ponto de atrito — append por blocos distintos minimiza, mas não elimina.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
