-- Add username column (nullable initially for backfill)
ALTER TABLE agents ADD COLUMN username TEXT;

-- Backfill existing agents: slugify their display_name
CREATE OR REPLACE FUNCTION _generate_slug(input TEXT) RETURNS TEXT AS $$
DECLARE
  slug TEXT;
BEGIN
  slug := lower(input);
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  slug := regexp_replace(slug, '-+', '-', 'g');
  slug := trim(BOTH '-' FROM slug);
  IF slug = '' THEN
    slug := 'agent';
  END IF;
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  agent_record RECORD;
  base_slug TEXT;
  candidate TEXT;
  counter INT;
BEGIN
  FOR agent_record IN SELECT id, display_name FROM agents WHERE username IS NULL ORDER BY created_at ASC LOOP
    base_slug := _generate_slug(agent_record.display_name);
    candidate := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM agents WHERE username = candidate AND id != agent_record.id) LOOP
      counter := counter + 1;
      candidate := base_slug || '-' || counter;
    END LOOP;
    UPDATE agents SET username = candidate WHERE id = agent_record.id;
  END LOOP;
END $$;

-- Now make NOT NULL and UNIQUE
ALTER TABLE agents ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX idx_agents_username ON agents(username);

-- Add CHECK constraint for valid format (lowercase alphanumeric + hyphens)
ALTER TABLE agents ADD CONSTRAINT chk_username_format
  CHECK (username ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$');

-- Drop the helper function
DROP FUNCTION IF EXISTS _generate_slug(TEXT);
