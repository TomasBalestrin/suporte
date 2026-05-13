-- Memoria de conversa por WhatsApp: chave estavel usando conversa_id do Fluxon.
-- Antes: lookup por customer_telefone com janela de 2h (perde contexto rapido).
-- Agora: whatsapp_conversa_id estavel durante toda a vida da conversa no Fluxon.

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS whatsapp_conversa_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_conv_whatsapp
  ON public.ai_conversations(whatsapp_conversa_id)
  WHERE whatsapp_conversa_id IS NOT NULL;
