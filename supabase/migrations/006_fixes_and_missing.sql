-- ============================================
-- Migration 006: Fixes, missing columns, functions and storage
-- IDEMPOTENTE: pode ser executado multiplas vezes sem erro
-- ============================================

-- ============================================
-- 1. FIX: automation_rules trigger_type values
-- ============================================

DO $$ BEGIN
  -- Tenta dropar o constraint antigo (pode ter nome diferente)
  ALTER TABLE public.automation_rules DROP CONSTRAINT IF EXISTS automation_rules_trigger_type_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Busca e remove qualquer CHECK constraint na coluna trigger_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'automation_rules'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%trigger_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.automation_rules DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.automation_rules
  ADD CONSTRAINT automation_rules_trigger_type_check
  CHECK (trigger_type IN (
    'ticket_created', 'ticket_updated', 'status_changed',
    'sla_approaching', 'sla_breached', 'no_response'
  ));

-- ============================================
-- 2. FUNCTION: increment_usage_count (atomic)
-- ============================================

CREATE OR REPLACE FUNCTION increment_usage_count(
  article_id UUID,
  used_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.knowledge_base
  SET usage_count = usage_count + 1,
      last_used_at = used_at
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. STORAGE: bucket 'attachments'
-- ============================================

DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'attachments',
    'attachments',
    TRUE,
    5242880,
    ARRAY[
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4'
    ]
  );
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

-- Storage policies (drop e recria para evitar conflito)
DROP POLICY IF EXISTS "Anyone can upload attachments" ON storage.objects;
CREATE POLICY "Anyone can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Anyone can read attachments" ON storage.objects;
CREATE POLICY "Anyone can read attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');

-- ============================================
-- 4. REALTIME
-- ============================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 5. TRIGGERS: updated_at nas tabelas que faltam
-- ============================================

DO $$ BEGIN
  CREATE TRIGGER update_quick_replies_updated_at
    BEFORE UPDATE ON public.quick_replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_automation_rules_updated_at
    BEFORE UPDATE ON public.automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON public.knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_ai_config_updated_at
    BEFORE UPDATE ON public.ai_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_sla_configs_updated_at
    BEFORE UPDATE ON public.sla_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 6. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tickets_status_created
  ON public.tickets(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_ticket_created
  ON public.activity_log(ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_ticket
  ON public.notification_log(ticket_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_active
  ON public.knowledge_base(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ai_unanswered_unresolved
  ON public.ai_unanswered_questions(resolved, created_at DESC)
  WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_automation_rules_active_trigger
  ON public.automation_rules(trigger_type)
  WHERE is_active = TRUE;
