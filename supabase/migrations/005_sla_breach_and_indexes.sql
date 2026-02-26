-- Add sla_breached_at column to tickets if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'sla_breached_at'
  ) THEN
    ALTER TABLE tickets ADD COLUMN sla_breached_at timestamptz;
  END IF;
END $$;

-- Add missing composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_status ON tickets(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_sla_resolution ON tickets(sla_resolution_at) WHERE sla_resolution_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_sla_breached ON tickets(sla_breached_at) WHERE sla_breached_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_resolved_at ON tickets(resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON tickets(updated_at);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_status ON tickets(assigned_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_created ON ai_usage_stats(created_at);
