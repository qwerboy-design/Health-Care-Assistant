-- HCA: hide Claude Sonnet 4.5 and Claude Haiku 4.5 from the model selector.
--
-- MANUAL SCRIPT. The file name has no numeric prefix on purpose, so the Supabase CLI does not
-- apply it with the forward migrations. Run it by hand in the SQL editor or psql only AFTER:
--   1. 20261116_add_claude_5_5_models.sql has been applied, and
--   2. the code that defaults to claude-sonnet-5-5 is deployed.
-- Running it earlier makes the old deployment's default model return "Model is not available".
--
-- Step 1 - preview (expect 2 rows with is_active = true):
-- SELECT model_name, display_name, credits_cost, is_active
-- FROM public.model_pricing
-- WHERE model_name IN ('claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001');
--
-- Step 2 - run the block below. Expected: UPDATE 2 (UPDATE 0 on a rerun).
-- If the count is anything else, ROLLBACK instead of COMMIT.
-- The rows are deactivated, not deleted: credits_transactions and chat_conversations keep
-- the old model_name as history.
-- Rollback: supabase/rollback/20261116_down.sql

BEGIN;

UPDATE public.model_pricing AS old
SET is_active = false
WHERE old.is_active
  AND (
    (
      old.model_name = 'claude-sonnet-4-5-20250929'
      AND EXISTS (
        SELECT 1 FROM public.model_pricing AS replacement
        WHERE replacement.model_name = 'claude-sonnet-5-5' AND replacement.is_active
      )
    )
    OR (
      old.model_name = 'claude-haiku-4-5-20251001'
      AND EXISTS (
        SELECT 1 FROM public.model_pricing AS replacement
        WHERE replacement.model_name = 'claude-haiku-5-5' AND replacement.is_active
      )
    )
  );

COMMIT;
