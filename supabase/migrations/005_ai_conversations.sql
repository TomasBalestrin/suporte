-- Tabelas para memória de conversa da Sofia
-- Permite manter contexto entre mensagens do mesmo chat (pre-ticket)

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_email TEXT,
  customer_cpf TEXT,
  customer_telefone TEXT,
  product_id UUID REFERENCES public.products(id),
  category_id UUID REFERENCES public.categories(id),
  ticket_id UUID REFERENCES public.tickets(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_customer_email ON public.ai_conversations(customer_email);
CREATE INDEX IF NOT EXISTS idx_ai_conv_customer_cpf ON public.ai_conversations(customer_cpf);
CREATE INDEX IF NOT EXISTS idx_ai_conv_updated_at ON public.ai_conversations(updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  tool_name TEXT,
  tool_args JSONB,
  tool_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_msg_conv_id ON public.ai_conversation_messages(conversation_id, created_at);
