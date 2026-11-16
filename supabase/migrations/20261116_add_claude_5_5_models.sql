-- HCA: add Claude Sonnet 5.5 and Claude Haiku 5.5 to model_pricing.
--
-- claude-sonnet-4-5-20250929 retires on 2026-11-30. The chat route's default model becomes
-- claude-sonnet-5-5, and getModelPricing() returns "Model is not available" for a model that
-- has no active row, so this migration must be applied BEFORE the new code is deployed.
--
-- Each new row copies credits_cost and supports_vision from the row it replaces, so any value
-- an admin changed is kept. The literals (5 / 3 credits) are only used when the old row is
-- missing; they are the values seeded by 003_add_credits_system.sql.
--
-- The old rows stay active here so the currently deployed code keeps working. Deactivate them
-- with supabase/migrations/deactivate_claude_4_5_models.sql after the new code is live.
--
-- Rerunnable: ON CONFLICT DO NOTHING leaves existing rows untouched.
-- Expected result: INSERT 0 2 on the first run, INSERT 0 0 afterwards.
-- Rollback: supabase/rollback/20261116_down.sql

INSERT INTO public.model_pricing (model_name, display_name, credits_cost, is_active, supports_vision)
SELECT
  v.model_name,
  v.display_name,
  COALESCE(old.credits_cost, v.default_credits_cost),
  true,
  COALESCE(old.supports_vision, v.default_supports_vision)
FROM (
  VALUES
    ('claude-sonnet-5-5', 'Claude Sonnet 5.5', 'claude-sonnet-4-5-20250929', 5, true),
    ('claude-haiku-5-5', 'Claude Haiku 5.5', 'claude-haiku-4-5-20251001', 3, false)
) AS v(model_name, display_name, replaces, default_credits_cost, default_supports_vision)
LEFT JOIN public.model_pricing AS old
  ON old.model_name = v.replaces
ON CONFLICT (model_name) DO NOTHING;

-- Verify after applying (expect 4 rows; the two new ones active):
-- SELECT model_name, display_name, credits_cost, is_active, supports_vision
-- FROM public.model_pricing
-- WHERE model_name IN (
--   'claude-sonnet-5-5', 'claude-haiku-5-5',
--   'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001'
-- )
-- ORDER BY model_name;
