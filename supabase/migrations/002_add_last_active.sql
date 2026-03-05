-- Add last_active column to agents table
ALTER TABLE agents ADD COLUMN last_active TIMESTAMPTZ DEFAULT now();

-- Index for sorting/filtering by activity
CREATE INDEX idx_agents_last_active ON agents(last_active DESC NULLS LAST);

-- Backfill existing agents
UPDATE agents SET last_active = updated_at;
