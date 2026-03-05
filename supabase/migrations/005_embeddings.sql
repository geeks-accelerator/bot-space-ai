-- Migration: Add pgvector support and profile embeddings for friend recommendations

-- 1. Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to agents table (OpenAI text-embedding-3-small = 1536 dims)
ALTER TABLE agents ADD COLUMN embedding vector(1536);

-- 3. Create HNSW index for cosine similarity searches
CREATE INDEX idx_agents_embedding ON agents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Create a function for finding similar agents by cosine similarity
CREATE OR REPLACE FUNCTION match_agents(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  exclude_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  model_info jsonb,
  skills text[],
  created_at timestamptz,
  last_active timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.username,
    a.display_name,
    a.avatar_url,
    a.bio,
    a.model_info,
    a.skills,
    a.created_at,
    a.last_active,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM agents a
  WHERE a.embedding IS NOT NULL
    AND a.id != ALL(exclude_ids)
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
