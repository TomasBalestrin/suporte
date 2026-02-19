-- Bethel Suporte - Database Schema
-- Version 1.0

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLES
-- ============================================

-- Users (Agents and Admins)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'agent')) DEFAULT 'agent',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers (no auth required)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON public.customers(email);

-- Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_code TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  product_id UUID REFERENCES public.products(id),
  category_id UUID REFERENCES public.categories(id),
  assigned_agent_id UUID REFERENCES public.users(id),
  access_token TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'open', 'awaiting_customer', 'in_progress', 'resolved', 'resolved_ia', 'closed'
  )) DEFAULT 'open',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  source TEXT DEFAULT 'portal',
  sla_first_response_at TIMESTAMPTZ,
  sla_resolution_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_comment TEXT,
  satisfaction_rated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_customer ON public.tickets(customer_id);
CREATE INDEX idx_tickets_agent ON public.tickets(assigned_agent_id);
CREATE INDEX idx_tickets_code ON public.tickets(ticket_code);
CREATE INDEX idx_tickets_access_token ON public.tickets(access_token);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX idx_tickets_product ON public.tickets(product_id);
CREATE INDEX idx_tickets_category ON public.tickets(category_id);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);

-- Ticket Tags (N:N)
CREATE TABLE public.ticket_tags (
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

-- Messages (Chat)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'ai', 'system')),
  sender_id UUID,
  content TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_ticket ON public.messages(ticket_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Quick Replies
CREATE TABLE public.quick_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shortcut TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_by UUID REFERENCES public.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Base
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  product_id UUID REFERENCES public.products(id),
  embedding VECTOR(1536),
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_embedding ON public.knowledge_base
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- AI Config
CREATE TABLE public.ai_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Unanswered Questions
CREATE TABLE public.ai_unanswered_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  ticket_id UUID REFERENCES public.tickets(id),
  context TEXT,
  similarity_score FLOAT,
  closest_article_id UUID REFERENCES public.knowledge_base(id),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Feedback
CREATE TABLE public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id),
  ticket_id UUID REFERENCES public.tickets(id),
  rating TEXT CHECK (rating IN ('helpful', 'not_helpful')),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLA Configs
CREATE TABLE public.sla_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  priority TEXT NOT NULL UNIQUE CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  first_response_minutes INTEGER NOT NULL,
  resolution_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation Rules
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'ticket_created', 'ticket_updated', 'sla_breach', 'inactivity', 'cron'
  )),
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Log
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES public.tickets(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  resend_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES public.tickets(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer', 'agent', 'admin', 'system', 'ai')),
  actor_id UUID,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_ticket ON public.activity_log(ticket_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Generate sequential ticket code
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(ticket_code, '-', 3) AS INTEGER)
  ), 0) + 1 INTO next_num
  FROM public.tickets
  WHERE ticket_code LIKE 'SUP-' || year_str || '-%';

  NEW.ticket_code := 'SUP-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_code
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_code();

-- Generate access token
CREATE OR REPLACE FUNCTION generate_access_token()
RETURNS TRIGGER AS $$
BEGIN
  NEW.access_token := encode(gen_random_bytes(32), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_access_token
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION generate_access_token();

-- Calculate SLA on ticket creation
CREATE OR REPLACE FUNCTION calculate_sla()
RETURNS TRIGGER AS $$
DECLARE
  sla RECORD;
BEGIN
  SELECT * INTO sla FROM public.sla_configs WHERE priority = NEW.priority AND is_active = TRUE;
  IF FOUND THEN
    NEW.sla_first_response_at := NOW() + (sla.first_response_minutes || ' minutes')::INTERVAL;
    NEW.sla_resolution_at := NOW() + (sla.resolution_minutes || ' minutes')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sla
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION calculate_sla();

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Semantic search in knowledge base
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base kb
  WHERE kb.is_active = TRUE
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.users WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if agent or admin
CREATE OR REPLACE FUNCTION is_agent_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'agent');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_unanswered_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR is_agent_or_admin());

CREATE POLICY "Admins can manage users" ON public.users
  FOR ALL USING (is_admin());

-- Products policies (public read for portal)
CREATE POLICY "Anyone can read active products" ON public.products
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (is_admin());

-- Categories policies (public read for portal)
CREATE POLICY "Anyone can read active categories" ON public.categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (is_admin());

-- Tags policies
CREATE POLICY "Agents can read tags" ON public.tags
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "Admins can manage tags" ON public.tags
  FOR ALL USING (is_admin());

-- Customers policies
CREATE POLICY "Agents can read customers" ON public.customers
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "Anyone can insert customers" ON public.customers
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Agents can update customers" ON public.customers
  FOR UPDATE USING (is_agent_or_admin());

-- Tickets policies
CREATE POLICY "Agents can read all tickets" ON public.tickets
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "Anyone can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Agents can update tickets" ON public.tickets
  FOR UPDATE USING (is_agent_or_admin());

-- Public ticket access by token (via service role in API routes)

-- Messages policies
CREATE POLICY "Agents can read all messages" ON public.messages
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "Anyone can insert messages" ON public.messages
  FOR INSERT WITH CHECK (TRUE);

-- Ticket Tags policies
CREATE POLICY "Agents can read ticket tags" ON public.ticket_tags
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "Agents can manage ticket tags" ON public.ticket_tags
  FOR ALL USING (is_agent_or_admin());

-- Quick Replies policies
CREATE POLICY "Agents can read quick replies" ON public.quick_replies
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "Admins can manage quick replies" ON public.quick_replies
  FOR ALL USING (is_admin());

-- Knowledge Base policies
CREATE POLICY "Anyone can read active articles" ON public.knowledge_base
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage knowledge base" ON public.knowledge_base
  FOR ALL USING (is_admin());

-- AI Config policies
CREATE POLICY "Agents can read ai config" ON public.ai_config
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "Admins can manage ai config" ON public.ai_config
  FOR ALL USING (is_admin());

-- AI Unanswered Questions policies
CREATE POLICY "Agents can read unanswered" ON public.ai_unanswered_questions
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "Anyone can insert unanswered" ON public.ai_unanswered_questions
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins can update unanswered" ON public.ai_unanswered_questions
  FOR UPDATE USING (is_admin());

-- AI Feedback policies
CREATE POLICY "Agents can read feedback" ON public.ai_feedback
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "Anyone can insert feedback" ON public.ai_feedback
  FOR INSERT WITH CHECK (TRUE);

-- SLA Configs policies
CREATE POLICY "Agents can read sla" ON public.sla_configs
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "Admins can manage sla" ON public.sla_configs
  FOR ALL USING (is_admin());

-- Automation Rules policies
CREATE POLICY "Admins can manage automations" ON public.automation_rules
  FOR ALL USING (is_admin());

-- Notification Log policies
CREATE POLICY "Agents can read notifications" ON public.notification_log
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "System can insert notifications" ON public.notification_log
  FOR INSERT WITH CHECK (TRUE);

-- Activity Log policies
CREATE POLICY "Agents can read activity" ON public.activity_log
  FOR SELECT USING (is_agent_or_admin());

CREATE POLICY "System can insert activity" ON public.activity_log
  FOR INSERT WITH CHECK (TRUE);

-- ============================================
-- SEED DATA
-- ============================================

-- Default SLA configs
INSERT INTO public.sla_configs (priority, first_response_minutes, resolution_minutes) VALUES
  ('urgent', 60, 240),
  ('high', 240, 480),
  ('medium', 720, 1440),
  ('low', 1440, 2880);

-- Default AI config
INSERT INTO public.ai_config (config_key, config_value) VALUES
  ('system_prompt', E'Voce e a assistente de suporte da Bethel Systems. Seu nome e Sofia.\n\nREGRAS:\n1. Responda APENAS com base nas informacoes fornecidas no contexto.\n2. Se a informacao nao estiver no contexto, diga que nao encontrou a resposta e sugira que o cliente abra um ticket para atendimento humano.\n3. Seja educada, objetiva e empatica.\n4. Use linguagem simples e clara, em portugues do Brasil.\n5. Nao invente informacoes. Nao alucine.\n6. Se o cliente estiver com raiva ou frustrado, acolha primeiro e depois responda.\n7. Formate suas respostas de forma organizada quando necessario.\n8. NUNCA compartilhe informacoes tecnicas internas do sistema.'),
  ('temperature', '0.3'),
  ('max_tokens', '500'),
  ('tone', 'amigavel'),
  ('fallback_message', 'Nao encontrei uma resposta para sua duvida em nossa base de conhecimento. Vou abrir um ticket para que nossa equipe possa te ajudar pessoalmente!'),
  ('confidence_threshold', '0.7'),
  ('auto_assign_enabled', 'false'),
  ('ia_first_enabled', 'true');
