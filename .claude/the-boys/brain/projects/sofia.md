---
type: project
name: Sofia (IA de suporte)
aliases:
  - Sofia
  - sofia
folder: cross-project
stack: [openai, supabase]
deploy: embutida nos projetos que a hospedam
status: active
mapped_by: "[[Francês]]"
mapped_at: 2026-05-14
related: ["[[Fluxon]]", "[[Suporte]]"]
---

# Projeto: Sofia (IA de suporte)

> Nota cruzada — Sofia não é um repo; é a camada de IA que roda dentro de dois produtos distintos. Esta ficha mapeia as DUAS implementações lado a lado.

## O que é

- IA de suporte da Bethel Educação, chamada "Sofia". Responde dúvidas de clientes (acesso a produtos, reembolso, login), usa function tools pra consultar dados reais e escala pra ticket humano quando não resolve.
- Roda em dois sistemas com implementações separadas: **Fluxon** (via WhatsApp) e **SUPORTE** (portal web + WhatsApp widget). Compartilham apenas a API bridge HTTP — bancos Supabase são projetos distintos.

---

## Onde a Sofia roda

| Sistema | Pasta | Stack IA key | Modelo OpenAI | RAG | Tabelas Supabase tocadas (IA) | Banco Supabase ref |
|---|---|---|---|---|---|---|
| **Fluxon** | `C:/Users/lluys/Desktop/PROJETOS/Disparotey/src/utils/sofia/` | openai@latest, function tools inline | `gpt-4o-mini` (hardcoded) | Nenhum — sem embeddings | `ai_prompts`, `sofia_logs`, `conversas`, `mensagens`, `system_flags`, `sofia_conversa_tags` | `citwaazfegjixoaupzxj` |
| **SUPORTE** | `C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte/src/app/api/ai/chat/route.ts` | openai@^6.22.0, tools + RAG via pgvector | `gpt-4o-mini` (env `OPENAI_MODEL`, default `gpt-4o-mini`) | Sim — `text-embedding-3-small` + RPC `search_knowledge_base` (cosine, threshold 0.7, top-5) | `ai_conversations`, `ai_conversation_messages`, `ai_config`, `knowledge_base`, `ai_unanswered_questions`, `ai_feedback`, `tickets`, `messages`, `customers`, `products` | `zeocxcfiyhzsztwjllvl` |

---

## Arquitetura de cada implementação

### Sofia no Fluxon
- Vive em `src/utils/sofia/` — módulo dedicado com múltiplos arquivos (handler, tools, prompts).
- Prompt base carregado da tabela `ai_prompts` (configurável por admin sem deploy).
- **7 function tools** (mapeadas em brownfield anterior — TODO: recriar lista exata).
- Kill switch: `UPDATE system_flags SET value='true'::jsonb WHERE key='sofia_kill_switch'`. Sintoma de quota esgotada: 86% das conversas caem em `ia_indisponivel`.
- Entrada: mensagem WhatsApp inbound via webhook Meta Cloud API → `api/chat/*`.
- Sem memória de embedding — histórico por `conversas`/`mensagens` (relacional, mesma sessão).
- Tags de conversa em `sofia_conversa_tags` — infra pra categorização, sem RAG.

### Sofia no SUPORTE
- Vive em `src/app/api/ai/chat/route.ts` (arquivo único, ~400 linhas).
- Prompt configurável em runtime via tabela `ai_config` (key `system_prompt`) — admin pode mudar sem deploy via `/admin/settings`.
- **5 function tools** (definidas inline no `route.ts`):
  1. `consultar_fluxon` — busca perfil 360 do cliente no Fluxon via API bridge (`FLUXON_BASE_URL/api/support/lead`)
  2. `consultar_wordpress` — verifica acesso em áreas de membros (Tutor LMS) e gera senha temp via `FLUXON_BASE_URL/api/support/wordpress/consultar-acesso`
  3. `reenviar_whatsapp_entrega` — reenvia link de acesso da última compra via `FLUXON_BASE_URL/api/support/reenviar-entrega`
  4. `orientar_reembolso` — retorna instruções de reembolso por plataforma/prazo (lógica inline, sem chamada externa)
  5. `solicitar_mais_dados` — instrui a Sofia a pedir CPF/email/nome ao cliente
- **RAG ativo**: pergunta → embedding (`text-embedding-3-small`) → RPC `search_knowledge_base` (pgvector cosine, threshold 0.7, top-5 artigos). Se `bestSimilarity < threshold` → `requires_ticket: true`.
- Memória persistente em `ai_conversations` + `ai_conversation_messages` (até 20 msgs de histórico). Chave de lookup: `ticket_id` > `whatsapp_conversa_id` > `customer`.email.
- Tool loop: até 4 iterações (enquanto houver `tool_calls` na resposta).
- Rate limit: 20 req/min por IP.
- Entrada dupla: (1) portal web `/suporte/ajuda` (form → etapa IA → cria ticket se não resolveu); (2) WhatsApp via `whatsapp_conversa_id` passado pelo Fluxon.

---

## Ponte SUPORTE ↔ Fluxon

A Sofia do SUPORTE **depende do Fluxon** para operar: todas as tools de negócio (`consultar_fluxon`, `consultar_wordpress`, `reenviar_whatsapp_entrega`) fazem chamadas HTTP para `FLUXON_BASE_URL` com header `X-API-Key: FLUXON_SUPPORT_API_KEY`. O Fluxon expõe `/api/support/*` exclusivamente para o SUPORTE.

```
[SUPORTE/Sofia] --HTTP--> [Fluxon /api/support/lead]
                       --> [Fluxon /api/support/wordpress/consultar-acesso]
                       --> [Fluxon /api/support/reenviar-entrega]
```

Adicionalmente, o Fluxon passa `whatsapp_conversa_id` pra chamadas ao `/api/ai/chat` do SUPORTE (migration `012`), mantendo contexto de conversa estável durante toda a vida da conversa WhatsApp.

---

## Knowledge Base (SUPORTE)

A `knowledge_base` do SUPORTE é a única KB estruturada. Conteúdo atual:
- Seeded via migration `011_seed_respostas_prontas_kb.sql` (8 artigos): reembolso Hotmart, reembolso PagTrust, acesso Cleiton Querobin, acesso Julia Academy, acesso 50 Scripts, suporte Nextrack, identificação de compra, confirmação de reembolso.
- Mais artigos via migration `013_seed_troubleshooting_kb.sql` (não lida — TODO).
- **Embeddings não são gerados na seed** — precisam ser gerados via `/api/admin/knowledge-base/generate-embeddings` depois. Se embeddings estiverem NULL, RAG retorna 0 artigos e Sofia cai sempre em `requires_ticket`.
- A pasta `respostasprontas/` na raiz do SUPORTE está **vazia** — foi a fonte original do conteúdo que foi importado via SQL seed. Não serve mais como fonte operacional.

No Fluxon não há KB estruturada — o "conhecimento" está no system prompt da `ai_prompts`.

---

## Cuidado pra não quebrar

- **API bridge crítica**: `FLUXON_BASE_URL` + `FLUXON_SUPPORT_API_KEY` em `.env` do SUPORTE. Se o Fluxon sofrer mudanças nos endpoints `/api/support/*`, a Sofia do SUPORTE para de funcionar silenciosamente (tools retornam string de erro, mas Sofia continua respondendo com base no RAG/prompt). Monitorar via Sentry do SUPORTE.
- **Kill switch separados**: Fluxon tem `system_flags.sofia_kill_switch`; SUPORTE tem `ai_config.ai_enabled = 'false'`. São independentes — desligar um não desliga o outro.
- **Embeddings NULL = RAG morto**: novo artigo na `knowledge_base` do SUPORTE sem rodar `generate-embeddings` → artigo nunca é encontrado. TODO: automatizar geração de embedding no insert (trigger Postgres ou hook de API).
- **Split de ferramentas**: Fluxon tem 7 tools, SUPORTE tem 5. As 5 do SUPORTE são um subconjunto redesenhado — não são as mesmas por baixo. Ex: Fluxon provavelmente tem tool de disparo/WhatsApp que o SUPORTE não precisa.
- **Prompt duplicado**: system prompt da Sofia está em dois lugares — `ai_prompts` (Fluxon, DB, runtime-editável) e `ai_config.system_prompt` (SUPORTE, DB, runtime-editável). Divergências silenciosas são possíveis se um for editado sem o outro.
- **Modelo hardcoded no Fluxon vs env no SUPORTE**: mudar de `gpt-4o-mini` pra `gpt-4o` exige env var no SUPORTE mas código no Fluxon.

---

## Dívida técnica

| # | Item | Sistema | Impacto |
|---|---|---|---|
| D1 | Prompt duplicado — `ai_prompts` (Fluxon) vs `ai_config.system_prompt` (SUPORTE) | Ambos | Divergência de comportamento sem aviso |
| D2 | Tools duplicadas com lógica diferente — 7 no Fluxon, 5 no SUPORTE (subset + redesign) | Ambos | Manutenção dobrada ao adicionar nova tool |
| D3 | Embeddings não são gerados automaticamente ao inserir artigo na KB | SUPORTE | RAG quebra silenciosamente em novos artigos |
| D4 | `respostasprontas/` vazia na raiz — não é mais fonte operacional, mas gera confusão | SUPORTE | Confusão de onboarding |
| D5 | Sem tests cobrindo fluxo Sofia (Playwright só cobre páginas públicas + admin login) | SUPORTE | Mudança de prompt não tem regression suite |
| D6 | 7 tools do Fluxon não foram relidas neste mapping — lista exata é TODO | Fluxon | Brain incompleto |
| D7 | `ai_config` não tem config de model no Fluxon — hardcoded `gpt-4o-mini` | Fluxon | Upgrade de modelo exige deploy |

---

## Oportunidades (lens "Sofia em 2 sistemas")

1. **KB unificada entre Fluxon e SUPORTE**: os artigos de `knowledge_base` do SUPORTE (acesso a produtos, reembolso, etc.) seriam igualmente úteis pra Sofia no Fluxon — hoje o Fluxon não tem RAG. Opção A: adicionar RAG ao Fluxon com a mesma KB. Opção B: Fluxon chama endpoint `/api/ai/chat` do SUPORTE como proxy (unifica implementação).

2. **Playwright como regression suite de prompt**: os e2e existentes no SUPORTE cobrem apenas páginas públicas. Estender pra cobrir o fluxo IA (`/suporte/ajuda` → digitar pergunta → verificar se Sofia responde sem abrir ticket) criaria uma regression suite automática para mudanças de prompt e de artigos da KB — hoje não há nenhuma.

3. **Tool registry unificado**: criar um módulo compartilhado (monorepo ou pacote privado) com as tools em comum (`consultar_fluxon`, `reenviar_whatsapp_entrega`, `orientar_reembolso`) eliminaria a duplicação D2 e garantiria paridade entre os dois sistemas.

---

## Fontes usadas neste mapping

- `C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte/src/app/api/ai/chat/route.ts` (implementação completa Sofia SUPORTE)
- `C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte/supabase/migrations/001_initial_schema.sql` (schema base + RAG RPC)
- `C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte/supabase/migrations/005_ai_conversations.sql`
- `C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte/supabase/migrations/011_seed_respostas_prontas_kb.sql`
- `C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte/supabase/migrations/012_ai_conversations_whatsapp.sql`
- `C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte/.env.local` (Supabase ref `zeocxcfiyhzsztwjllvl`, FLUXON_BASE_URL)
- `C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte/vercel.json`, `package.json`, `README.md`
- `C:/Users/lluys/Desktop/Cursor/SUPORTE/suporte/e2e/public-pages.spec.ts`
- `brain/projects/fluxon.md` (Sofia no Fluxon — mapeamento anterior do Francês)
