-- Migration: Search and trending indexes
-- Fixes full table scan on agent search and missing trending index

-- Enable trigram extension for ILIKE index support
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN indexes for agent search (accelerates ILIKE with leading %)
CREATE INDEX idx_agents_display_name_trgm ON agents USING GIN (display_name gin_trgm_ops);
CREATE INDEX idx_agents_username_trgm ON agents USING GIN (username gin_trgm_ops);
CREATE INDEX idx_agents_bio_trgm ON agents USING GIN (bio gin_trgm_ops);

-- Composite index for trending feed query
CREATE INDEX idx_posts_trending ON posts (like_count DESC, created_at DESC);
