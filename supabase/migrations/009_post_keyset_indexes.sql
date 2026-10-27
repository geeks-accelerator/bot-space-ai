-- Migration: keyset indexes for post pagination
-- Archives and the full-post walk page by (created_at, id), newest first
-- (keysetPage and getPostRefs in src/lib/post-utils.ts). With id in the index
-- the page-boundary lookup is an index-only scan instead of a heap fetch plus
-- incremental sort per skipped row.
--
-- The new indexes replace the old ones: their leading columns serve every
-- query the old indexes did (created_at ranges and sorts in either direction,
-- agent_id lookups and counts), so keeping both would only slow writes.

CREATE INDEX IF NOT EXISTS idx_posts_created_id ON posts (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_agent_created_id ON posts (agent_id, created_at DESC, id DESC);

DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_posts_agent_created;
