# State — Bethel Suporte

> Estado vivo do projeto. Decisões importantes, blocos ativos, contexto que não está no código.

## Iteração ativa

**Feature em andamento**: `sofia-prompt-v3` (fase: `tasks/execute`)
**Owner**: ~~Hughie (Specify)~~ → ~~Frenchie (Design)~~ → **Kimiko (Tasks + Execute)** → Starlight → ~~Hughie (UAT)~~ → Butcher
**Iniciada em**: 2026-04-29
**Spec aprovado**: `.specs/features/sofia-prompt-v3/spec.md` (decided_by: butcher, 2026-04-29)
**Design aprovado**: `.specs/features/sofia-prompt-v3/design.md` (decided_by: butcher, 2026-04-29)
**Backup criado**: `.specs/features/sofia-prompt-v3/prompt-backup.md`

### Estratégia de deploy (decisão usuário 2026-04-29)

- **SQL prod (ai_config + KB)**: aplicar AGORA via Kimiko, monitorar 48h via SQL
- **Edição `route.ts`**: editar mas NÃO commitar — segurar até confirmação do usuário
- **UAT**: PULADO — substituído por monitoramento SQL contínuo (12h/24h/48h)
- **Rollback**: snapshot em `prompt-backup.md`, critério automático = thumbs-down >25% nas primeiras 48h

### Deploy v3 — Status de execução (2026-04-29)

| Task | Status | Detalhe |
|---|---|---|
| T3 — `ai_config.system_prompt` ← prompt v3 | ✅ aplicado em prod | `SELECT LEFT(config_value,100)` confirma "Você é Sofia..." |
| T4 — `ai_config.temperature` 0.8→0.2 | ✅ aplicado em prod | confirmado |
| T5 — `ai_config.confidence_threshold` 0.4→0.6 | ✅ aplicado em prod | confirmado |
| T6 — KB Implementação IA (f50e70a2 + 053bb8d0) | ✅ limpo | sem "7 dias", "trial", "assinatura" |
| T7 — KB Acesso Julia (05d496c9) | ✅ limpo | sem "Abençoado", "Atenciosamente" |
| T8 — KB Acesso Cleiton (661df800) | ✅ limpo | idem |
| T9 — KB Acesso 50 Scripts (ac20abca) | ✅ limpo | idem |
| T10 — KB Pedido de Dados (e89e8091) | ✅ limpo | idem |
| T11 — `route.ts` editado | ✅ commitado (1d54232) | type-check OK |
| T15 — Commit local | ✅ feito | `fix(sofia): separar contexto do form do enrichedQuestion` |
| T15.1 — Push GitHub | ❌ BLOQUEADO | sem permissão no repo `TomasBalestrin/suporte` (user `eduardotkfm-maker`) |
| T16 — Deploy Vercel prod | ✅ aplicado | `suporte-amber.vercel.app` (deploy ID `suporte-d3kw075f6`) — 2026-04-29, build 37s |

### Baseline pré-v3 (2026-04-29, n=414 respostas históricas)

- **Thumbs-down**: 86.7% (das 82 com feedback explícito; nem todo cliente vota)
- **Confidence média**: 0.537
- **Total de respostas registradas**: 414
- **Período coletado**: 2026-03-05 a 2026-04-29

### Achado pós-Starlight (B1 aplicado 2026-04-29)

Durante o review do Starlight, identifiquei que o time inteiro (Hughie, Frenchie, Starlight, eu) assumimos que `/api/ai/chat` recebe múltiplas mensagens (chat multi-turn). **Não recebe.** O frontend `src/app/suporte/ajuda/page.tsx` faz exatamente UMA chamada à API por chat (linha 102) — cliente preenche form, submete, Sofia responde, cliente clica "Resolveu" ou "Não Resolveu". One-shot.

**Implicação**: o Caso 7 do `spec.md` ("Segunda mensagem em diante: zero saudação, zero assinatura") **nunca executa** nesta arquitetura. A regra "Demais mensagens: zero saudação..." no prompt v3 era inerte.

**Correção B1 aplicada**: simplificado a seção `TOM E FORMATO` do prompt — removida a frase sobre "demais mensagens" e a regra anti-assinatura virou linha independente forte. Não toquei em `route.ts` (não precisa de `is_first_message` flag).

**Decided_by**: butcher, 2026-04-29 — confirmado pelo usuário (pista B1).

### SQL de monitoramento pós-v3 (rodar a cada 12h, depois 24h, depois 48h)

```sql
-- Padrões proibidos (deve retornar 0 linhas após v3 estar em ar)
SELECT id, created_at, LEFT(response, 200)
FROM ai_usage_stats
WHERE created_at > '2026-04-29 22:00:00+00'  -- timestamp do deploy v3
  AND (
    response ILIKE '%Atenciosamente%'
    OR response ILIKE '%7 dias%'
    OR response ILIKE '%teste gratuito%'
    OR response ILIKE '%teste grátis%'
    OR response ILIKE '%assinatura mensal%'
    OR response ILIKE '%per[ií]odo de avalia%'
  )
ORDER BY created_at DESC;

-- Métricas de qualidade pós-v3
SELECT
  COUNT(*) FILTER (WHERE was_helpful = false)::float /
    NULLIF(COUNT(*) FILTER (WHERE was_helpful IS NOT NULL), 0) AS taxa_thumbsdown,
  AVG(confidence_score)::numeric(4,3) AS confidence_media,
  COUNT(*) AS total_respostas
FROM ai_usage_stats
WHERE created_at > '2026-04-29 22:00:00+00';
```

**Critério de rollback automático**: se `taxa_thumbsdown` superar 25% nas primeiras 48h → restaurar prompt + temperature + threshold conforme `prompt-backup.md`.

### Achados-chave do Design (Frenchie)

1. **Alucinação "7 dias" vem da KB, não é invenção do modelo** — 2 artigos duplicados (IDs `f50e70a2`, `053bb8d0`) com texto literal "7 dias de teste grátis" + "assinatura mensal" sobre a ferramenta Nextrack (terceiro). RAG injeta em qualquer pergunta sobre IA.
2. **Contaminação de tom da KB** — 11 artigos têm "Abençoado dia" e "Atenciosamente, Time Bethel Educação" copiados literalmente; explica os 110 e 47 ocorrências respectivas nas respostas.
3. **Decisão técnica `[Produto: X]`**: Opção B — separar `formProductName` do `enrichedQuestion` no `userContent`. Diff de ~5 linhas em `route.ts`.
4. **Bonus tracking**: KB tem ~55 pares de artigos duplicados — abrir ticket separado `sofia-kb-dedup` depois de v3 estabilizar.

## Diagnóstico que motivou a feature

Análise de 413 respostas reais da Sofia entre 2026-03-05 e 2026-04-29 (`ai_usage_stats`) mostrou:

| Métrica | Valor | Observação |
|---|---|---|
| Total de respostas | 413 | — |
| Thumbs up | 11 (2.7%) | feedback explicitamente positivo |
| Thumbs down | 71 (17.2%) | 6.5x mais downs que ups |
| Confidence média | 0.539 | abaixo do threshold ideal (0.6+) |
| Unanswered | 346 | majoritariamente lixo de auto-replies de outros bots externos |

### Padrões problemáticos quantificados (n=413)

- **110 respostas (26.6%)** usam "Abençoado dia" — saudação opcional virou padrão
- **47 respostas (11.4%)** dizem "verifiquei/confirmei" — risco de violar regra anti-alucinação do prompt
- **47 respostas (11.4%)** assinam "Atenciosamente, Time Bethel Educação" — proibido pelo prompt
- **42 respostas (10.2%)** caem em loop de "divergência de produto" (cliente não pediu, Sofia trava em "qual produto você comprou?")
- **38 respostas (9.2%)** mandam URL de quillforms — possíveis URLs alucinadas (sufixos como `-67` que só vêm do Fluxon)

## Config atual em prod (ai_config)

| Config | Valor atual | Default no código | Observação |
|---|---|---|---|
| `temperature` | **0.8** | 0.3 | alto demais para suporte |
| `confidence_threshold` | **0.4** | 0.7 | baixo demais — passa contexto fraco |
| `max_tokens` | 500 | 500 | OK |
| `ai_enabled` | true | true | OK |
| `ai_name` | Sofia | Sofia | OK |
| `tone` | amigavel | amigavel | OK |

**Decisão pendente** (Butcher, 2026-04-29): voltar `temperature=0.2` e `confidence_threshold=0.6` faz parte do escopo `sofia-prompt-v3`.

## Discrepâncias entre prompt e código (causas-raiz suspeitas)

1. **Tools fantasma**: o `system_prompt` instrui Sofia a usar `reenviar_whatsapp_entrega`, `orientar_reembolso`, `solicitar_mais_dados` — mas `src/app/api/ai/chat/route.ts:193-201` chama `chat.completions.create` SEM o parâmetro `tools`. Sofia tenta tools que não existem.
2. **Injeção `[Produto: X]`**: `src/app/api/ai/chat/route.ts:111-126` enriquece a query com `[Produto: ${nome}]` baseado no `product_id` do form. Quando o cliente NÃO menciona produto na pergunta, isso induz Sofia a pingue-pongue de "divergência" entre form e Fluxon.
3. **Input gating ausente**: `/api/ai/chat` aceita qualquer input. 23 das 30 últimas unanswered são auto-replies de bots externos (clínicas, dentistas, fonos) que vazam pra fila da Sofia.

## Acesso ao Supabase remoto (para queries de análise)

- Token pessoal salvo em `~/Desktop/PROJETOS/Disparotey/.env.local` como `SUPABASE_ACCESS_TOKEN_SUPORTE` (`sbp_8d9c59ab...`)
- Project ref: `zeocxcfiyhzsztwjllvl`
- CLI: `SUPABASE_ACCESS_TOKEN=$TOKEN npx supabase db query --linked "SQL"` (após `supabase link --project-ref zeocxcfiyhzsztwjllvl`)
- Workdir linkado durante análise: `/tmp/sofia-supabase/`

## Decisões registradas

### 2026-04-29 — Feature `sofia-prompt-v3` aberta

- **decided_by**: butcher
- **scope**: Medium (prompt rewrite + 3 fixes de código + ajuste de config). Pode escalar para Large na fase Tasks se virar elefante.
- **rationale**: 17% de thumbs-down e padrões de alucinação documentados pedem mudança coordenada (prompt + código + config), não só prompt.
- **gate ladder**: Kimiko (execute) → Starlight (review) → Hughie (UAT) → Butcher (merge).

## Pendências fora desta feature

- [ ] Filtro de input gating contra auto-replies de bots externos (escopo separado — `sofia-input-hygiene`, deferred)
- [ ] Implementar tools de verdade no chat completion (escopo separado — `sofia-tools-v1`, deferred até v3 estabilizar)
- [ ] Reprocessamento das 346 unanswered para alimentar a `knowledge_base` (escopo separado)
