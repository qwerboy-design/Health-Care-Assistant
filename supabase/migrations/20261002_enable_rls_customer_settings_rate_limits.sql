-- HCA: close the RLS ordering gap for customer_settings and rate_limits.
--
-- The Supabase CLI applies migrations in filename order, so
-- 20260312_create_customer_settings.sql and 20260422_add_rate_limits.sql run
-- AFTER 009_enable_rls_policies.sql. 009 guards each table with to_regclass(),
-- so on a fresh `supabase db reset` it silently skipped these two tables and
-- left them readable/writable through PostgREST with the anon key.
--
-- This file sorts after 20260422_add_rate_limits.sql and applies the same
-- deny-by-default model as 009/010: RLS on, no anon/authenticated policies,
-- and anon/authenticated table privileges revoked. The application uses its
-- own JWT/session model and accesses both tables only through the server-side
-- service_role client, which bypasses RLS and keeps its grants.
--
-- Idempotent: safe to re-run, and safe when either table is absent.

DO $$
BEGIN
  IF to_regclass('public.customer_settings') IS NOT NULL THEN
    ALTER TABLE public.customer_settings ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.customer_settings FROM anon, authenticated;
  END IF;

  IF to_regclass('public.rate_limits') IS NOT NULL THEN
    ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.rate_limits FROM anon, authenticated;
  END IF;
END
$$;

-- No CREATE POLICY statements are intentional: without a policy, anon and
-- authenticated are denied by default even if a grant is later re-added.
