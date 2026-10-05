-- HCA P4 local-only RLS verification.
--
-- Prerequisite: a LOCAL throwaway Supabase/Postgres database with every
-- forward migration applied (e.g. `supabase db reset --local`), including
-- 010_restrict_model_pricing.sql and
-- 20261002_enable_rls_customer_settings_rate_limits.sql. This script is intentionally not safe for production and
-- has not been executed by Codex in this task.
--
-- The application uses custom JWT sessions, so the request.jwt.claims checks
-- below demonstrate database behavior only; they do not convert the app's
-- custom JWT into a Supabase Auth identity. The server-side service_role
-- client remains the supported application data path.

\set ON_ERROR_STOP on

\echo 'Insert two synthetic customers and owner-linked rows as service_role.'
SET ROLE service_role;
INSERT INTO public.customers (id, email, name, auth_provider)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'rls-user-a@local.invalid', 'RLS User A', 'password'),
  ('00000000-0000-0000-0000-000000000002', 'rls-user-b@local.invalid', 'RLS User B', 'password')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.chat_conversations (id, customer_id, title, workload_level)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'RLS fixture A', 'basic'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'RLS fixture B', 'basic')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.chat_messages (id, conversation_id, role, content)
VALUES
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', 'user', 'synthetic fixture A'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000012', 'user', 'synthetic fixture B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credits_transactions (
  id, customer_id, model_name, credits_cost, credits_before, credits_after
)
VALUES
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'rls-test', 1, 100, 99),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000002', 'rls-test', 1, 100, 99)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customer_settings (id, customer_id)
VALUES ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO public.rate_limits (key, count, reset_at)
VALUES ('rls-local-verification', 1, now() + interval '1 hour')
ON CONFLICT (key) DO NOTHING;
RESET ROLE;

\echo 'Anon must not read owner-linked tables protected by deny-by-default RLS.'
BEGIN;
SET LOCAL ROLE anon;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"anon"}',
  true
);
DO $$
DECLARE
  visible_count INTEGER;
BEGIN
  SELECT count(*) INTO visible_count FROM public.customers;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'anon can read customers: % rows', visible_count; END IF;
  SELECT count(*) INTO visible_count FROM public.chat_conversations;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'anon can read conversations: % rows', visible_count; END IF;
  SELECT count(*) INTO visible_count FROM public.chat_messages;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'anon can read messages: % rows', visible_count; END IF;
END
$$;
ROLLBACK;

\echo 'Authenticated Supabase-JWT semantics: legacy credits policy exposes only user A transaction.'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
DO $$
DECLARE
  visible_count INTEGER;
BEGIN
  SELECT count(*) INTO visible_count FROM public.credits_transactions;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'authenticated user A sees % credit rows; expected exactly 1', visible_count;
  END IF;
END
$$;
ROLLBACK;

\echo 'model_pricing must not be readable by anon after 010_restrict_model_pricing.sql.'
BEGIN;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT has_table_privilege(current_user, 'public.model_pricing', 'SELECT')
  AS anon_has_model_pricing_select_grant;
-- Expected result: false. RLS policy inspection should also show no anon or
-- authenticated policies for model_pricing after migration 010.
ROLLBACK;

\echo 'customer_settings and rate_limits must be closed to anon/authenticated after 20261002.'
DO $$
DECLARE
  table_name TEXT;
  role_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['customer_settings', 'rate_limits'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I', table_name)::regclass) THEN
      RAISE EXCEPTION 'RLS is disabled on public.%', table_name;
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
        AND roles && ARRAY['anon', 'authenticated', 'public']::name[]
    ) THEN
      RAISE EXCEPTION 'public.% has a client-facing policy', table_name;
    END IF;
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_table_privilege(role_name, format('public.%I', table_name), 'SELECT')
        OR has_table_privilege(role_name, format('public.%I', table_name), 'INSERT')
        OR has_table_privilege(role_name, format('public.%I', table_name), 'UPDATE')
        OR has_table_privilege(role_name, format('public.%I', table_name), 'DELETE') THEN
        RAISE EXCEPTION '% still has table privileges on public.%', role_name, table_name;
      END IF;
    END LOOP;
  END LOOP;
END
$$;

BEGIN;
SET LOCAL ROLE anon;
DO $$
DECLARE
  visible_count INTEGER;
BEGIN
  BEGIN
    SELECT count(*) INTO visible_count FROM public.customer_settings;
    IF visible_count <> 0 THEN RAISE EXCEPTION 'anon can read customer_settings: % rows', visible_count; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    SELECT count(*) INTO visible_count FROM public.rate_limits;
    IF visible_count <> 0 THEN RAISE EXCEPTION 'anon can read rate_limits: % rows', visible_count; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rate_limits (key, reset_at) VALUES ('rls-anon-write', now());
    RAISE EXCEPTION 'anon can insert into rate_limits';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
DO $$
DECLARE
  visible_count INTEGER;
BEGIN
  BEGIN
    SELECT count(*) INTO visible_count FROM public.customer_settings;
    IF visible_count <> 0 THEN RAISE EXCEPTION 'authenticated can read customer_settings: % rows', visible_count; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    SELECT count(*) INTO visible_count FROM public.rate_limits;
    IF visible_count <> 0 THEN RAISE EXCEPTION 'authenticated can read rate_limits: % rows', visible_count; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.customer_settings (customer_id)
    VALUES ('00000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'authenticated can insert into customer_settings';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$$;
ROLLBACK;

\echo 'service_role must still read customer_settings and rate_limits.'
BEGIN;
SET LOCAL ROLE service_role;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.customer_settings WHERE id = '00000000-0000-0000-0000-000000000041') THEN
    RAISE EXCEPTION 'service_role cannot read customer_settings fixture';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rate_limits WHERE key = 'rls-local-verification') THEN
    RAISE EXCEPTION 'service_role cannot read rate_limits fixture';
  END IF;
END
$$;
ROLLBACK;

\echo 'Cleanup fixture rows as service_role in the throwaway database.'
SET ROLE service_role;
DELETE FROM public.rate_limits WHERE key = 'rls-local-verification';
DELETE FROM public.customer_settings WHERE id = '00000000-0000-0000-0000-000000000041';
DELETE FROM public.chat_messages
WHERE id IN (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);
DELETE FROM public.chat_conversations
WHERE id IN (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012'
);
DELETE FROM public.credits_transactions
WHERE id IN (
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000032'
);
DELETE FROM public.customers
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);
RESET ROLE;

-- Manual rollback/re-apply sequence after this verification:
--   1. Run supabase/rollback/20261002_down.sql.
--   2. Run supabase/rollback/010_down.sql.
--   3. Run supabase/rollback/009_down.sql.
--   4. Run supabase/rollback/008_down.sql (analysis_metadata data is lost).
--   5. Re-apply supabase/migrations/008_add_analysis_metadata.sql.
--   6. Re-apply supabase/migrations/009_enable_rls_policies.sql.
--   7. Re-apply supabase/migrations/010_restrict_model_pricing.sql.
--   8. Re-apply supabase/migrations/20261002_enable_rls_customer_settings_rate_limits.sql.
--   9. Re-run this script and repeat the app-flow checks.
