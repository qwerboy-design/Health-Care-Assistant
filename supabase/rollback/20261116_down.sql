-- Rollback for 20261116_add_claude_5_5_models and deactivate_claude_4_5_models.
-- Makes the Claude 4.5 rows selectable again and hides the Claude 5.5 rows. Nothing is deleted,
-- so rerunning the forward scripts restores the migrated state.
--
-- Roll the code back to the claude-sonnet-4-5-20250929 default first: the claude-sonnet-5-5
-- default returns "Model is not available" once its row is inactive.
-- claude-sonnet-4-5-20250929 retires on 2026-11-30; after that date this rollback only restores
-- the selector entry, the API no longer serves the model.
--
-- Preview (expect up to 4 rows):
-- SELECT model_name, is_active FROM public.model_pricing
-- WHERE model_name IN (
--   'claude-sonnet-5-5', 'claude-haiku-5-5',
--   'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001'
-- );

BEGIN;

UPDATE public.model_pricing
SET is_active = true
WHERE model_name IN ('claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001');

UPDATE public.model_pricing
SET is_active = false
WHERE model_name IN ('claude-sonnet-5-5', 'claude-haiku-5-5');

COMMIT;
