-- Migration 016 — F5: trigger pg_net pra regenerar embedding ao inserir/atualizar artigo manualmente.
-- Origem: spec.md R-F5.1/R-F5.2/R-F5.3 + recomendação A Lenda (opção A: pg_net.http_post).
-- Caso de uso: insert/update direto no banco (não via pipeline). Pipeline já gera embedding antes
-- do upsert, então quando o pipeline escreve, esse trigger não tem nada pra regenerar
-- (NEW.embedding != NULL → skip).
--
-- Modo de falha gracioso: se o webhook falhar, o INSERT/UPDATE volta com sucesso e o artigo
-- fica com embedding = NULL. Operador vê via /api/admin/kb/health (PR-2). Não-bloqueante.

BEGIN;

-- Pré-requisito: extensão pg_net habilitada.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_regenerate_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url TEXT;
  service_key TEXT;
BEGIN
  -- Skip se conteúdo não mudou (UPDATE de outras colunas) OU embedding já preenchido nesta op.
  IF TG_OP = 'UPDATE' AND OLD.content = NEW.content AND OLD.title = NEW.title THEN
    RETURN NEW;
  END IF;

  -- Se embedding veio preenchido (pipeline já gerou), não chamar webhook novamente.
  IF NEW.embedding IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- URL do endpoint Vercel + service role key vêm de ai_config (configurar antes de habilitar trigger).
  SELECT config_value INTO webhook_url FROM public.ai_config WHERE config_key = 'kb_embedding_webhook_url';
  SELECT config_value INTO service_key FROM public.ai_config WHERE config_key = 'kb_embedding_webhook_token';

  IF webhook_url IS NULL OR service_key IS NULL THEN
    -- Não configurado ainda — sai gracioso, embedding fica NULL e PR-2 alerta.
    RAISE NOTICE 'kb_embedding_webhook_url/_token não configurado em ai_config — pulando regeneração';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := webhook_url,
    body := jsonb_build_object('article_id', NEW.id, 'slug', NEW.slug),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_knowledge_base_regenerate_embedding ON public.knowledge_base;

CREATE TRIGGER trg_knowledge_base_regenerate_embedding
  AFTER INSERT OR UPDATE OF content, title
  ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_regenerate_embedding();

COMMENT ON FUNCTION public.trigger_regenerate_embedding IS
  'F5 — dispara webhook assíncrono pra regenerar embedding quando content/title mudam manualmente. Pipeline (vault Obsidian) escreve embedding direto e este trigger faz no-op nesse caso. Configurar ai_config kb_embedding_webhook_url + kb_embedding_webhook_token antes de confiar.';

COMMIT;

-- Pós-migration: registrar URL do endpoint Vercel que processa a regeneração assíncrona.
-- Ex (executar manualmente depois que /api/admin/kb/regenerate-embedding existir):
-- INSERT INTO ai_config (config_key, config_value) VALUES
--   ('kb_embedding_webhook_url', 'https://[SUPORTE_DOMAIN]/api/admin/kb/regenerate-embedding'),
--   ('kb_embedding_webhook_token', '[INTERNAL_TOKEN]')
-- ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
