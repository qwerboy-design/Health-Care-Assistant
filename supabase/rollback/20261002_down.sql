-- HCA manual rollback for 20261002_enable_rls_customer_settings_rate_limits.sql.
--
-- Usage: run manually with psql or the SQL editor only after reviewing the
-- target local/staging database. Run this BEFORE 010_down.sql, 009_down.sql
-- and 008_down.sql. No data is lost.
--
-- WARNING: this restores the pre-migration exposure. Before the forward
-- migration, both tables had RLS disabled and the Supabase default table
-- privileges for anon/authenticated (ALL), so the anon key could read and
-- write them through PostgREST. Do not use this as a production shortcut.
--
-- The forward migration created no policies, so there are none to drop.

DO $$
BEGIN
  IF to_regclass('public.customer_settings') IS NOT NULL THEN
    ALTER TABLE public.customer_settings DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON TABLE public.customer_settings TO anon, authenticated;
  END IF;

  IF to_regclass('public.rate_limits') IS NOT NULL THEN
    ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON TABLE public.rate_limits TO anon, authenticated;
  END IF;
END
$$;
