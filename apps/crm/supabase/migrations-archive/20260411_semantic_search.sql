-- ============================================================
-- Revolis.AI – Semantic Search via pgvector
-- Migration: 20260411_semantic_search.sql
-- ============================================================

-- 1. Aktivuj pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Pridaj embedding stĺpce
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Indexy pre rýchle ANN (approximate nearest neighbor) hľadanie
--    Poznámka: ivfflat vyžaduje aspoň ~1000 riadkov pre dobrú kvalitu.
--    Pre menšie datasety HNSW je spoľahlivejší.
CREATE INDEX IF NOT EXISTS leads_embedding_idx
  ON public.leads
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS properties_embedding_idx
  ON public.properties
  USING hnsw (embedding vector_cosine_ops);

-- 4. RPC: match_leads – vráti leady zoradené podľa cosine similarity
CREATE OR REPLACE FUNCTION match_leads(
  query_embedding  vector(1536),
  match_threshold  float    DEFAULT 0.3,
  match_count      int      DEFAULT 10
)
RETURNS TABLE (
  id          uuid,
  similarity  float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    leads.id,
    1 - (leads.embedding <=> query_embedding) AS similarity
  FROM public.leads
  WHERE leads.embedding IS NOT NULL
    AND 1 - (leads.embedding <=> query_embedding) > match_threshold
  ORDER BY leads.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. RPC: match_properties – vráti nehnuteľnosti zoradené podľa cosine similarity
CREATE OR REPLACE FUNCTION match_properties(
  query_embedding  vector(1536),
  match_threshold  float    DEFAULT 0.3,
  match_count      int      DEFAULT 10
)
RETURNS TABLE (
  id          uuid,
  similarity  float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    properties.id,
    1 - (properties.embedding <=> query_embedding) AS similarity
  FROM public.properties
  WHERE properties.embedding IS NOT NULL
    AND 1 - (properties.embedding <=> query_embedding) > match_threshold
  ORDER BY properties.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. RLS: embedding stĺpce dedia RLS z nadradenej tabuľky –
--    žiadne extra policies nie sú potrebné. Embedding je len stĺpec,
--    nie samostatná tabuľka.
--    RPC funkcie majú SECURITY DEFINER – volateľ musí byť autentifikovaný.

COMMENT ON COLUMN public.leads.embedding      IS 'OpenAI text-embedding-3-small (1536-dim) pre semantic search';
COMMENT ON COLUMN public.properties.embedding IS 'OpenAI text-embedding-3-small (1536-dim) pre semantic search';
