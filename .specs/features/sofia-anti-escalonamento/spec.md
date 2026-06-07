# Feature: sofia-anti-escalonamento

> Scope: **Medium** · Tier: **Opus** (prod, user-facing, fala com cliente pagante) · decided_by: bruto, 2026-06-07
> Origem: reclamação do usuário "Sofia não tá respondendo ninguém, abre ticket pra tudo" + print do ticket SUP-2026-0371.

## Problema (observado em prod)

No ticket SUP-2026-0371, a Sofia deu a resposta certa de login (área de membros Julia + senha `ottoni123`), o cliente respondeu "Nao consegui", e a Sofia **escalou na hora** — "vou abrir um ticket pra você... tenha em mãos o comprovante da compra e a plataforma". Comportamento sistêmico: escala no primeiro "não consegui" em vez de fazer troubleshooting.

## Causa-raiz (confirmada em código + prompt vivo)

`requires_ticket` **não é o culpado** — nem o form nem o auto-reply de ticket consomem o flag. O escalonamento vem da **boca da Sofia**, por duas fontes que se empilham:

1. **`system_prompt` (runtime, `ai_config`)** — seção "QUANDO O CLIENTE RELATA QUE NÃO RECEBEU ACESSO", regra 3: "ou ele já tentou o link e não funcionou → ... diga 'vou abrir um ticket'". "Não consegui" = "já tentou e não funcionou" → escala. Não há degrau de troubleshooting (reset de senha, qual erro) antes.
2. **`buildDadosOperacionais` ramo `fluxonSemCompra` (`src/lib/sofia/context.ts:50`)** — injeta conduta de escalonamento ("avise que vai abrir um ticket") para QUALQUER cliente sem compra no Fluxon. Como Julia/Cleiton vendem só em Hotmart/PagTrust (cobertura parcial do Fluxon), ~90% dos clientes caem em `fluxonSemCompra=true`. Isso sequestra casos de login/acesso onde a Sofia JÁ TEM o dado da área de membros. Pior: diz "vou abrir um ticket" mesmo no auto-reply **dentro de um ticket que já existe**.

Config (`temperature=0.2`, `confidence_threshold=0.6`) está saudável — não mexer.

## Decisão de produto (decided_by: usuário, 2026-06-07)

**Escalonamento só em último caso.** A Sofia troubleshoota primeiro (reset de senha, "qual mensagem de erro apareceu?", usa o dado de acesso que já tem). Só escala se o cliente continuar travado DEPOIS de tentar, ou pra coisa que ela estruturalmente não faz (reembolso, fraude, verificação manual de compra, pedido explícito de humano). Os gatilhos de **ESCALAÇÃO IMEDIATA** existentes (reembolso/fraude/financeiro/pedido de humano/3+ repetições) **permanecem** — são corretos.

## Escopo do fix

1. **system_prompt** (runtime, sem deploy): reescrever a seção "NÃO RECEBEU ACESSO" com um degrau de troubleshooting ANTES de escalar (confirmar e-mail → orientar "Esqueci minha senha" → perguntar o erro exato → só então escalar). Sem tocar nas REGRAS INEGOCIÁVEIS nem na ESCALAÇÃO IMEDIATA.
2. **`context.ts` `buildDadosOperacionais`** (código, deploy): suavizar o ramo `fluxonSemCompra` — não empurrar "abrir ticket" como conduta padrão; orientar troubleshooting de acesso primeiro; não afirmar "não encontrei sua compra"; remover a linguagem "vou abrir um ticket" (a IA não sabe se já está num ticket).
3. **Regression test** (`sofia-context.test.ts`): atualizar a guarda byte-for-byte da copy alterada.

## Não-escopo (deferred)

- `requires_ticket` semântica (acoplado só a KB) — decorativo nos fluxos atuais; revisar se a integração WhatsApp/Fluxon o consumir. → débito `sofia-requires-ticket-semantica`.
- Cobertura de KB / confidence bimodal.

## Gate ladder

Kimiko (execute) → ⭐ Luz Estrela (review: copy/prompt, lição elefante-rosa L034, sandbox KB) → 🍼 MM (aplicar prompt em prod c/ backup + deploy código + monitoramento/rollback) → 🔪 Bruto (merge).

## Rollback

- Prompt: restaurar `system_prompt-backup-2026-06-07.txt` no `ai_config` (cache 5min).
- Código: Vercel 1-click rollback (sem migration).
- Critério: thumbs-down subir vs. baseline ou recaída de "abre ticket" sem troubleshooting nas 48h.
