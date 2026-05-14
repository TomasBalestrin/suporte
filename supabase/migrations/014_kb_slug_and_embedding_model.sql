-- Migration 014 — Sofia KB pipeline: slug estável + embedding_model audit.
-- Pré-requisito do pipeline sync-kb (repo bethel-educacao/sofia-knowledge-base
-- vault Obsidian → GitHub Action → upsert via REST com on_conflict=slug).
-- Origem: the-boys-harness/.specs/features/sofia-obsidian/ (C1 + PR-4 da A Lenda).
-- Não-destrutivo: artigos antigos sem slug seguem em prod, buscáveis por similarity.

BEGIN;

-- 1. Coluna slug (nullable; pipeline preenche pros artigos do vault).
ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. PR-4 — registra modelo que gerou cada embedding.
--    Default = text-embedding-3-small (pre-flight Edgar, vector dim 1536 = schema atual).
--    Permite migração futura sem perder auditoria.
ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

-- 3. Setar slug nos 11 artigos seedados (011 + 013) — vault é source of truth daqui pra frente.
--    Sem WHERE adicional pq title é único nesses seeds.
UPDATE public.knowledge_base SET slug = 'confirmacao-reembolso-processado'
  WHERE title = 'Confirmacao de reembolso processado';
UPDATE public.knowledge_base SET slug = 'acesso-cleiton-querobin'
  WHERE title = 'Acesso ao produto Cleiton Querobin (area de membros principal)';
UPDATE public.knowledge_base SET slug = 'acesso-julia-academy'
  WHERE title = 'Acesso ao produto Julia Ottoni (Julia Academy)';
UPDATE public.knowledge_base SET slug = 'acesso-50-scripts'
  WHERE title = 'Acesso ao produto 50 Scripts Prontos para WhatsApp';
UPDATE public.knowledge_base SET slug = 'identificacao-compra'
  WHERE title = 'Pedido de dados para identificar compra';
UPDATE public.knowledge_base SET slug = 'reembolso-hotmart'
  WHERE title = 'Como solicitar reembolso de compra via Hotmart';
UPDATE public.knowledge_base SET slug = 'reembolso-pagtrust'
  WHERE title = 'Como solicitar reembolso de compra via PagTrust';
UPDATE public.knowledge_base SET slug = 'suporte-nextrack'
  WHERE title = 'Suporte da IA Nextrack (IA nao envia mensagens / problemas tecnicos da IA)';
UPDATE public.knowledge_base SET slug = 'troubleshooting-whatsapp-nao-recebido'
  WHERE title = 'Troubleshooting: cliente diz que nao recebeu WhatsApp com link de acesso';
UPDATE public.knowledge_base SET slug = 'troubleshooting-area-membros-fora-do-ar'
  WHERE title = 'Troubleshooting: area de membros nao carrega / pagina em branco / erro 502/503';
UPDATE public.knowledge_base SET slug = 'troubleshooting-mismatch-produto'
  WHERE title = 'Troubleshooting: cliente confunde produto comprado vs. produto que quer acessar';

-- 4. Unique constraint em slug (NULLs múltiplos são permitidos por default em PG).
--    Constraint > partial index aqui pq PostgREST on_conflict=slug requer uma constraint nomeada
--    pra usar como conflict target via Prefer: resolution=merge-duplicates.
ALTER TABLE public.knowledge_base
  ADD CONSTRAINT knowledge_base_slug_unique UNIQUE (slug);

COMMENT ON COLUMN public.knowledge_base.slug IS
  'Slug estável para upsert idempotente do pipeline sync-kb (vault Obsidian). NULL = artigo antigo, pré-pipeline.';
COMMENT ON COLUMN public.knowledge_base.embedding_model IS
  'Modelo OpenAI que gerou o embedding. Habilita reprocessamento seletivo em migração de modelo.';

COMMIT;
