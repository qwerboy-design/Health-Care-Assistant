-- HCA P4 manual rollback for 009_enable_rls_policies.sql.
--
-- Usage: run this file manually with psql or the SQL editor only after
-- reviewing the target local/staging database. Execute 009_down.sql before
-- 008_down.sql. This rollback creates no data loss, but disabling RLS removes
-- the protection introduced by 009; do not use it as a production shortcut.
-- 009 created no policies and revoked no grants, so there are no policy or
-- grant statements to reverse. Existing policies from 003/005 are preserved.

DO $$
BEGIN
  -- These tables were not RLS-protected before 009. Keep each guard so the
  -- rollback is safe when an optional table is absent.
  IF to_regclass('public.otp_tokens') IS NOT NULL THEN
    ALTER TABLE public.otp_tokens DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.sessions') IS NOT NULL THEN
    ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.chat_conversations') IS NOT NULL THEN
    ALTER TABLE public.chat_conversations DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.llm_runtime_settings') IS NOT NULL THEN
    ALTER TABLE public.llm_runtime_settings DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.llm_runtime_audit_logs') IS NOT NULL THEN
    ALTER TABLE public.llm_runtime_audit_logs DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.customer_settings') IS NOT NULL THEN
    ALTER TABLE public.customer_settings DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.rate_limits') IS NOT NULL THEN
    ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
