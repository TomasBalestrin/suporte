-- Observabilidade do pre-fetch do Fluxon (feature sofia-anti-escalonamento, fix C).
-- Logar, junto da resposta do assistant, o que o pre-fetch determinístico encontrou —
-- pra parar de adivinhar se a Sofia TINHA o link (e ignorou) ou se o pre-fetch nao achou.
-- - fluxon_identificacao: valor cru de `identificacao` do /api/support/lead
--   (ex.: match_cpf | match_email | nao_encontrado | null se pre-fetch nao rodou)
-- - fluxon_tem_link: havia link_acesso em alguma compra? (a Sofia tinha o que entregar)
-- Aditivas/idempotentes (post-deploy data only).

ALTER TABLE public.ai_conversation_messages ADD COLUMN IF NOT EXISTS fluxon_identificacao text;
ALTER TABLE public.ai_conversation_messages ADD COLUMN IF NOT EXISTS fluxon_tem_link boolean;
