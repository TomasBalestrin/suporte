-- Add metrics columns to ai_conversation_messages
-- - confidence: quality score 0-100 from similarity (post-deploy data only)
-- - was_helpful: user feedback on assistant reply (post-deploy data only)

ALTER TABLE public.ai_conversation_messages ADD COLUMN IF NOT EXISTS confidence integer;
ALTER TABLE public.ai_conversation_messages ADD COLUMN IF NOT EXISTS was_helpful boolean;
