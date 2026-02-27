-- ============================================
-- Migration 006: Fixes, missing columns, functions and storage
-- ============================================

-- ============================================
-- 1. FIX: automation_rules trigger_type values
-- O codigo usa valores diferentes do CHECK constraint original.
-- Original: 'ticket_created', 'ticket_updated', 'sla_breach', 'inactivity', 'cron'
-- Codigo:   'ticket_created', 'ticket_updated', 'status_changed', 'sla_approaching', 'sla_breached', 'no_response'
-- ============================================

ALTER TABLE public.automation_rules
  DROP CONSTRAINT IF EXISTS automation_rules_trigger_type_check;

ALTER TABLE public.automation_rules
  ADD CONSTRAINT automation_rules_trigger_type_check
  CHECK (trigger_type IN (
    'ticket_created', 'ticket_updated', 'status_changed',
    'sla_approaching', 'sla_breached', 'no_response'
  ));

-- ============================================
-- 2. FUNCTION: increment_usage_count (atomic)
-- Evita race condition no contador de uso de artigos da KB
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
-- 3. STORAGE: bucket 'attachments' para uploads
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  TRUE,
  5242880, -- 5MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Anyone can read attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');

-- ============================================
-- 4. REALTIME: habilitar publicacoes para messages e tickets
-- Necessario para os hooks useRealtimeMessages e useRealtimeTicket
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

-- ============================================
-- 5. TRIGGER: atualizar updated_at em tabelas que faltam
-- quick_replies e automation_rules tem updated_at mas nao tem trigger
-- ============================================

CREATE TRIGGER update_quick_replies_updated_at
  BEFORE UPDATE ON public.quick_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_config_updated_at
  BEFORE UPDATE ON public.ai_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sla_configs_updated_at
  BEFORE UPDATE ON public.sla_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. INDEX: indexes adicionais para queries do painel admin
-- ============================================

-- Busca de tickets por status + created_at (listagem admin)
CREATE INDEX IF NOT EXISTS idx_tickets_status_created
  ON public.tickets(status, created_at DESC);

-- Activity log por ticket (timeline do ticket)
CREATE INDEX IF NOT EXISTS idx_activity_log_ticket_created
  ON public.activity_log(ticket_id, created_at DESC);

-- Notification log por ticket
CREATE INDEX IF NOT EXISTS idx_notification_log_ticket
  ON public.notification_log(ticket_id);

-- Knowledge base por is_active (busca de artigos ativos)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active
  ON public.knowledge_base(is_active) WHERE is_active = TRUE;

-- AI unanswered questions nao resolvidas
CREATE INDEX IF NOT EXISTS idx_ai_unanswered_unresolved
  ON public.ai_unanswered_questions(resolved, created_at DESC)
  WHERE resolved = FALSE;

-- Automation rules ativas por trigger_type (executado no CRON)
CREATE INDEX IF NOT EXISTS idx_automation_rules_active_trigger
  ON public.automation_rules(trigger_type)
  WHERE is_active = TRUE;
