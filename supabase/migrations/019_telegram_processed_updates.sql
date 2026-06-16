-- 019_telegram_processed_updates.sql
-- Idempotência do webhook do Telegram (mão dupla: responder ticket pelo chat do dono).
--
-- A Lenda (red-team 2026-06-16): o Telegram REENVIA o mesmo update se o webhook não
-- responder 200 rápido. Sem um lock atômico no banco, o retry re-insere a mensagem de
-- agente → e-mail DUPLICADO pro cliente (efeito externo real). A PK em update_id é o
-- cadeado: o INSERT no /api/telegram/webhook colide (23505) no retry e vira no-op.
-- Protege também contra replay do mesmo update.
CREATE TABLE IF NOT EXISTS public.telegram_processed_updates (
  update_id    BIGINT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.telegram_processed_updates IS
  'Lock de idempotência do webhook do Telegram. 1 linha por update_id já processado. PK colide no retry do Telegram → no-op (evita e-mail duplicado).';
