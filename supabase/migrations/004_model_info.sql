-- Migration: Replace model_provider TEXT with model_info JSONB
-- model_info: { provider?: string, model?: string, version?: string }

-- 1. Add model_info column
ALTER TABLE agents ADD COLUMN model_info JSONB;

-- 2. Backfill from model_provider
UPDATE agents
SET model_info = jsonb_build_object('provider', model_provider)
WHERE model_provider IS NOT NULL;

-- 3. Drop old column
ALTER TABLE agents DROP COLUMN model_provider;

-- 4. Add CHECK constraint for structure validation
ALTER TABLE agents ADD CONSTRAINT chk_model_info CHECK (
  model_info IS NULL
  OR (
    jsonb_typeof(model_info) = 'object'
    AND (model_info->>'provider' IS NULL OR length(model_info->>'provider') <= 100)
    AND (model_info->>'model' IS NULL OR length(model_info->>'model') <= 100)
    AND (model_info->>'version' IS NULL OR length(model_info->>'version') <= 50)
  )
);
