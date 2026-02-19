# Bethel Suporte

Sistema de suporte ao cliente com atendimento por IA, tickets com chat em tempo real, painel administrativo e dashboard analitico.

## Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **IA:** OpenAI GPT-4o Mini + Embeddings (RAG)
- **Email:** Resend
- **Deploy:** Vercel

## Setup

1. Clone o repositorio
2. Copie `.env.example` para `.env.local` e preencha as variaveis
3. Execute a migration SQL no Supabase (`supabase/migrations/001_initial_schema.sql`)
4. Instale dependencias e rode o projeto:

```bash
npm install
npm run dev
```

## Estrutura

- `/suporte` - Portal do cliente (publico)
- `/suporte/ajuda` - Fluxo IA + abertura de ticket
- `/suporte/ticket/[token]` - Acompanhamento de ticket
- `/admin/login` - Login do painel
- `/admin/dashboard` - Dashboard do agente
- `/admin/tickets` - Fila de tickets
- `/admin/tickets/[id]` - Detalhes + chat do ticket
- `/admin/settings/*` - Configuracoes (admin)
- `/admin/analytics` - Dashboard analitico
