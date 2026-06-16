-- Fix B (sofia-auto-ticket): idempotência conversa→ticket no BANCO, não no app.
-- A Lenda (red-team 2026-06-16): check-then-act no app é TOCTOU — a corrida entre o
-- auto-create (tool escalar_para_humano) e o clique "Falar com humano" nasce dois
-- tickets / dois e-mails / dois access_tokens. A trava mora no Postgres.
--
-- Índice ÚNICO PARCIAL: garante no máx. 1 ticket por conversa, sem colidir nas N
-- conversas com ticket_id nulo (a maioria). Habilita o CAS no createTicket:
--   UPDATE ai_conversations SET ticket_id=$novo WHERE id=$conv AND ticket_id IS NULL
-- (rowCount=0 => perdeu a corrida => compensa e retorna o ticket já linkado).
--
-- Aditiva/idempotente. Rollback: DROP INDEX uq_ai_conv_ticket;
-- Pré-condição (verificar antes de aplicar): nenhum ticket_id duplicado já existente.
--   SELECT ticket_id, COUNT(*) FROM public.ai_conversations
--   WHERE ticket_id IS NOT NULL GROUP BY ticket_id HAVING COUNT(*) > 1;
--   (deve retornar 0 linhas; senão o CREATE UNIQUE INDEX falha e precisa dedup antes)

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_conv_ticket
  ON public.ai_conversations (ticket_id)
  WHERE ticket_id IS NOT NULL;
