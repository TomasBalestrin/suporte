# Bethel Suporte — Projeto

> Sistema de suporte ao cliente da Bethel Educação. Atende compradores dos infoprodutos da Julia Ottoni e do Cleiton Querobin.

## Visão

Reduzir tempo de resposta no atendimento pós-venda, automatizando dúvidas frequentes (acesso, login, link, reembolso, status de entrega) com IA baseada em RAG, e escalando para humanos apenas quando necessário.

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage), Vercel
- **IA**: OpenAI GPT-4o Mini + `text-embedding-3-small` (RAG sobre `knowledge_base`)
- **Email**: Resend
- **Observability**: Sentry
- **Integração externa**: Fluxon (`/api/support/lead`) para perfil 360 do cliente (compras, entregas WhatsApp, links de acesso)

## Estrutura de alto nível

- `/suporte` — portal público do cliente (chat IA + abertura de ticket)
- `/admin` — painel do agente (fila, ticket, settings, analytics)
- `/api/ai/chat` — endpoint da Sofia (RAG + GPT-4o Mini)
- `/api/admin/ai-config` — CRUD de config da IA (system_prompt, temperature, threshold)
- `/api/cron/sla` — escalação por SLA breach (a cada 5min)
- `/api/cron/automations` — automações (a cada 10min)

## Tabelas-chave da Sofia

- `ai_config` — config_key/config_value (system_prompt, temperature, confidence_threshold, ai_name, ai_enabled, max_tokens, fallback_message, tone)
- `knowledge_base` — artigos com `embedding` (RAG, ivfflat vector_cosine_ops)
- `ai_usage_stats` — log de cada Q/A (query, response, articles_found, confidence_score, was_helpful)
- `ai_unanswered_questions` — perguntas que a IA não soube responder
- `ai_feedback` — feedback estruturado (👍/👎)

## Convenções

- **Idioma**: PT-BR
- **Atendimento humano**: seg-sex, 8h30 às 20h
- **Produtos com plataforma própria**: Julia Ottoni → `juliaacademy.com.br` (senha `ottoni123`); Cleiton Querobin → `cleitonquerobin1.com.br` (senha `performance123`); 50 Scripts → `50scripts.cleitonquerobin.com.br` (senha `performance123`)
- **Outros produtos**: link específico vem do Fluxon (formato `quillforms`)

## Deploy

- **Produção**: `https://suporte.bethelsystems.com.br`
- **Repo**: `github.com/TomasBalestrin/suporte` (branch `main`)
- **Supabase project ref**: `zeocxcfiyhzsztwjllvl` (nome: "Suporte")
- Cron jobs configurados em `vercel.json`
