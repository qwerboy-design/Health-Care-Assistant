-- HCA manual rollback for 010_restrict_model_pricing.sql.
-- Run only after reviewing the target local/staging database.
-- This restores the policies and Realtime membership created by 003/005.

DO $$
BEGIN
  IF to_regclass('public.model_pricing') IS NULL THEN
    RETURN;
  END IF;

  -- 003/005 did not issue explicit GRANT statements. SELECT was necessarily
  -- available for their client SELECT policies, so restore only that proven
  -- privilege; do not invent write grants for the custom-session app.
  GRANT SELECT ON TABLE public.model_pricing TO anon, authenticated;

  DROP POLICY IF EXISTS "Users can view active models" ON public.model_pricing;
  CREATE POLICY "Users can view active models"
    ON public.model_pricing FOR SELECT
    TO authenticated
    USING (is_active = true);

  DROP POLICY IF EXISTS "Admins can manage models" ON public.model_pricing;
  CREATE POLICY "Admins can manage models"
    ON public.model_pricing FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = auth.uid()::uuid
        AND customers.role = 'admin'
      )
    );

  DROP POLICY IF EXISTS "Authenticated users can read all models for Realtime sync" ON public.model_pricing;
  CREATE POLICY "Authenticated users can read all models for Realtime sync"
    ON public.model_pricing FOR SELECT
    TO authenticated
    USING (true);

  DROP POLICY IF EXISTS "Anonymous can view active models" ON public.model_pricing;
  CREATE POLICY "Anonymous can view active models"
    ON public.model_pricing FOR SELECT
    TO anon
    USING (is_active = true);
END
$$;

DO $$
BEGIN
  IF to_regclass('public.model_pricing') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'model_pricing'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.model_pricing;
  END IF;
END
$$;
