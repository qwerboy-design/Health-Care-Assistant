-- HCA P4 manual rollback for 008_add_analysis_metadata.sql.
--
-- Usage: run this file manually with psql or the SQL editor only after
-- reviewing the target local/staging database. Execute 009_down.sql before
-- 008_down.sql, then re-apply 008 and 009 only after the schema is reviewed.
-- Dropping analysis_metadata permanently deletes all stored analysis metadata
-- in this column. This is an intentional data-loss rollback; export or verify
-- the data first when it must be retained.

-- COMMENT ON has no IF EXISTS form, so clear the 008 comment only when the
-- column is present. Dropping the column below also removes its comment.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages'
      AND column_name = 'analysis_metadata'
  ) THEN
    COMMENT ON COLUMN public.chat_messages.analysis_metadata IS NULL;
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.chat_messages
  DROP COLUMN IF EXISTS analysis_metadata;
