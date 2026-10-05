-- HCA: make model_pricing server/admin-only.
-- The application uses custom JWT sessions; service_role is the server-side
-- data path and bypasses RLS. Browser clients must use /api/models instead.

-- 003 already enabled RLS; keep the table fail-closed if this migration is
-- replayed after an interrupted deployment.
ALTER TABLE IF EXISTS public.model_pricing ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.model_pricing') IS NULL THEN
    RETURN;
  END IF;

  -- Policies created by 003 and 005 which exposed the table to client roles.
  DROP POLICY IF EXISTS "Users can view active models" ON public.model_pricing;
  DROP POLICY IF EXISTS "Admins can manage models" ON public.model_pricing;
  DROP POLICY IF EXISTS "Authenticated users can read all models for Realtime sync" ON public.model_pricing;
  DROP POLICY IF EXISTS "Anonymous can view active models" ON public.model_pricing;

  -- Remove PostgREST table privileges as a second protection layer. The
  -- service_role grant is intentionally untouched.
  REVOKE ALL ON TABLE public.model_pricing FROM anon, authenticated;
END
$$;

-- Realtime publication membership is client-facing for this table and is no
-- longer needed once the browser subscription is removed.
DO $$
BEGIN
  IF to_regclass('public.model_pricing') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    )
    AND EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'model_pricing'
    ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.model_pricing;
  END IF;
END
$$;
