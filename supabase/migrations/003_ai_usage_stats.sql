-- AI Usage Statistics
CREATE TABLE IF NOT EXISTS public.ai_usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  response TEXT,
  articles_found INTEGER DEFAULT 0,
  confidence_score FLOAT,
  was_helpful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_usage_stats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert usage stats (from AI chat)
CREATE POLICY "Anyone can insert ai usage stats" ON public.ai_usage_stats
  FOR INSERT WITH CHECK (true);

-- Only agents/admins can read stats
CREATE POLICY "Agents can read ai usage stats" ON public.ai_usage_stats
  FOR SELECT TO authenticated USING (true);

-- Admins can update stats (for feedback)
CREATE POLICY "Anyone can update ai usage stats" ON public.ai_usage_stats
  FOR UPDATE USING (true) WITH CHECK (true);
