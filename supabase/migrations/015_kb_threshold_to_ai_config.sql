-- Migration 015 — Move threshold de similaridade RAG do código pra ai_config.
-- Origem: red-team A Lenda seção 6 (recomendação bônus, não-bloqueante mas trivial).
-- Permite ajustar threshold em runtime sem deploy.
-- Discuss DA-6: começa em 0.7 (mesmo valor hardcoded atual no route.ts), revisar com dados após 2 semanas.

BEGIN;

INSERT INTO public.ai_config (config_key, config_value)
VALUES ('knowledge_base_threshold', '0.7')
ON CONFLICT (config_key) DO NOTHING;

COMMIT;

-- Após esta migration, em src/app/api/ai/chat/route.ts substituir:
--   const THRESHOLD = 0.7
-- por leitura via:
--   const THRESHOLD = await getAiConfigValue('knowledge_base_threshold') ?? 0.7
-- (fallback 0.7 mantém comportamento atual se ai_config sumir.)
