# feat: Sofia v2 — tools, memória de conversa, KB expandida

## Objetivo
Tornar a Sofia capaz de resolver mais tickets autonomamente (sem humanos), aproveitando o Fluxon como fonte de dados operacional.

## O que muda

### 1. KB expandida (10 artigos novos)
Arquivo `respostasprontas` importado para `knowledge_base` com embeddings. Artigos cobrem:
- Confirmação de reembolso (quando já foi processado)
- Acesso Implementação Cleiton / Implementação Julia / 50 Scripts (links + senhas)
- Pedido de dados (quando não encontra cliente)
- Reembolso via Hotmart / via PagTrust (com links corretos)
- Reembolso fora do prazo (>7 dias)
- Política geral de reembolso
- Suporte Nextrack IA (encaminha pro WhatsApp específico)

Script: `scripts/seed-respostas-prontas.ts` (já executado em produção no Supabase do suporte).

### 2. Tools (function calling)
`src/app/api/ai/chat/route.ts` agora suporta 3 tools:
- **`reenviar_whatsapp_entrega`** → chama `POST https://fluxon-e.vercel.app/api/support/reenviar-entrega`. Refaz o disparo do template de entrega com link trackeado.
- **`orientar_reembolso(plataforma, dias_desde_compra)`** → retorna instrução + link da plataforma. Se >7 dias, avisa fora do prazo.
- **`solicitar_mais_dados(motivo)`** → retorna mensagem padrão pedindo nome/email/CPF.

Loop de até 3 iterações (Sofia pode chamar múltiplas tools antes de responder).

### 3. Memória de conversa
Nova migração `005_ai_conversations.sql` cria:
- `ai_conversations` — 1 conversa por cliente
- `ai_conversation_messages` — histórico (user/assistant/tool)

Sofia retoma conversa do mesmo cliente se houver atividade nas últimas 2h. Até 20 mensagens anteriores viram contexto.

### 4. Tom de voz formal
System prompt atualizado: "Português brasileiro formal, cumprimento cordial, assinatura Time Bethel Educação".

### 5. Cron de follow-up (desativado por default)
`src/app/api/cron/follow-up/route.ts` + entrada em `vercel.json` (`0 * * * *`).

Detecta clientes que a Sofia atendeu com `reenviar_whatsapp_entrega` há >4h (configurável via `FLUXON_FOLLOWUP_DELAY_HOURS`) e dispara segundo WhatsApp preventivo.

**DESATIVADO POR DEFAULT** — só liga setando env `FLUXON_FOLLOWUP_ENABLED=true` na Vercel.

## Passos de deploy

1. **Rodar migração no Supabase do suporte** (SQL Editor):
   ```sql
   -- Conteúdo de supabase/migrations/005_ai_conversations.sql
   ```

2. **Merge do PR** → deploy automático Vercel.

3. **Testar em produção** com dados reais do Fluxon (Jonathan, Flavia, etc — casos já validados na v1).

4. **Opcional:** ativar follow-up automático depois de validar a Sofia em alguns tickets:
   ```
   vercel env add FLUXON_FOLLOWUP_ENABLED production
   # valor: true
   ```

## Lado Fluxon (já em produção)
- `POST /api/support/reenviar-entrega` deployado e testável com `X-API-Key: $SUPPORT_API_KEY`.

## Não quebra nada do v1
- Se `customer` não vier no body do chat, fluxo antigo (RAG puro) continua funcionando.
- Se tabelas `ai_conversations` não existirem (migração não rodada), código silencia o erro e segue sem memória.
- Tools só aparecem pro gpt-4o-mini quando fazem sentido (`tool_choice: auto`).

## Taxa de auto-resolução esperada
- v1 (deploy anterior): ~37% dos tickets
- v2 (esta PR): estimativa 60-75% — sobram só bugs técnicos de produto (Nextrack IA) que a KB já encaminha pro suporte especializado.
