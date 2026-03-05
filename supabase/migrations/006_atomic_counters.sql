-- Migration: Atomic counter increment/decrement RPCs
-- Fixes race condition in like/comment/repost count updates

CREATE OR REPLACE FUNCTION increment_counter(
  table_name TEXT,
  column_name TEXT,
  row_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = %I + 1 WHERE id = $1',
    table_name, column_name, column_name
  ) USING row_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_counter(
  table_name TEXT,
  column_name TEXT,
  row_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = GREATEST(%I - 1, 0) WHERE id = $1',
    table_name, column_name, column_name
  ) USING row_id;
END;
$$;
