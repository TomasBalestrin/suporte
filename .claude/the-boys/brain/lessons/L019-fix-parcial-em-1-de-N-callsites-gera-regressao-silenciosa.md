---
type: lesson
id: L019
title: "Fix de bug em 1 callsite de N gera regressão silenciosa — sempre grep o padrão antigo antes de commit"
date: 2026-05-17
owners:
  - "[[Bruto]]"
  - "[[Luz Estrela]]"
  - "[[Frances]]"
occurrences: 1
severity: high
related:
  - "[[fluxonapp]]"
  - "[[L011]]"
---

# L019 — Criar helper novo + migrar UM consumidor + esquecer os outros = bomba relógio

## Gatilho

Você descobriu um problema sistêmico (ex.: cap de 4.5MB do Vercel em `/api/media/upload` cortando vídeos grandes), criou o helper certo (ex.: `uploadMediaDireto` via signed URL do Supabase Storage), commitou ("fix: bypass cap 15MB do Vercel"), validou em **um** lugar que usa o fluxo. Marcou como resolvido no STATE.md / chat / memória.

## Erro

**Os outros N-1 consumidores do padrão antigo permanecem quebrados — invisíveis até alguém testar.** Caso real no FluxonApp 2026-05-17: commit `427fdbf` (2026-05-15) criou `uploadMediaDireto`, mas só **DispararLoteClient** foi migrado. Templates, Disparos, Chat, Grupos, GrupoActions (5 callsites) continuaram chamando `/api/media/upload` direto. 2 dias depois usuário tentou subir vídeo 14MB pelo Templates → HTTP 413 + frontend explode "Unexpected token 'R'..." (parsing JSON do plain text "Request Entity Too Large"). Usuário cobrou: "PROBLEMAS QUE JÁ HAVIAM SIDO CONCERTADOS VOLTARAM" — porque do ponto de vista dele, o bug "já foi consertado". Do ponto de vista do código, o fix existia mas era ilha.

Pior: o `next.config.ts` ganhou `experimental.proxyClientMaxBodySize: '50mb'` em algum momento — config **morta no Vercel** (só funciona em self-hosted Node). Cosmética falsa que mascarou a urgência de migrar os outros 5.

Variante já registrada: [[L011-review-estrutural-nao-pega-arquivo-faltante]] — review checa o que existe, não o que falta. Esta lição é a versão "callsites de padrão antigo" do mesmo failure mode.

## Correção Enforçada

1. **Antes de commitar um fix que introduz padrão novo** (helper, util, API), faça grep do **padrão antigo** no repo e liste todos os callsites. Migre todos no mesmo PR/commit, OU abra issue explícita listando os pendentes ANTES de fechar o original como "resolvido".
   - Comando padrão: `grep -rn "<padrão-antigo>" src/ --include="*.tsx" --include="*.ts"`
   - Em Claude Code: `Grep tool` com pattern do padrão antigo + `output_mode: files_with_matches`.

2. **No PR/commit do fix**, listar explicitamente: "Migrei callsites: X, Y, Z. Pendentes: A, B (motivo)." Pendentes sem motivo é dívida silenciosa.

3. **Quando você muda fluxo de upload/auth/payment/qualquer-coisa-com-cap-do-vendor** (Vercel body limit, Supabase rate limit, Stripe API version, etc.), assumir que TODOS os callsites estão errados até prova em contrário. Default = quebrado, prova = grep + leitura.

4. **Config "experimental" do Next/Vercel** que ninguém sabe explicar = morta. Não deixar como segurança — ou valida com curl em prod, ou remove.

## Onde se aplica

- Qualquer fix que introduz helper/util novo substituindo um pattern direto.
- Migrações de API (v1 → v2), troca de auth, troca de SDK, mudança de bucket.
- Vale especialmente quando o fix nasce de bug do vendor (limite, deprecation, breaking change) — usuário assume que "consertaram" enquanto N-1 callsites continuam vulneráveis.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
