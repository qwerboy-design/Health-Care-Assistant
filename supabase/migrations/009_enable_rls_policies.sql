-- HCA P4: enable RLS for public tables that were created without it.
--
-- This application uses custom JWT/session authentication (jose + the
-- customers/sessions tables), not Supabase Auth. The session's customerId is
-- therefore not available through auth.uid(). Server-side data access uses the
-- service_role client, and service_role bypasses RLS by design.
--
-- For that reason this migration intentionally adds no owner policy based on
-- auth.uid(): tables without a policy remain deny-by-default for anon and
-- authenticated, while the existing server-side service_role access keeps
-- working. Existing policies from migrations 003 and 005 are not weakened or
-- rewritten here.
--
-- model_pricing is an explicit, pre-existing exception. ModelSelector and
-- /test-realtime use the browser anon client for SELECT and Realtime. The
-- policies created by 003/005 (including the authenticated USING (true)
-- Realtime policy) are left unchanged so this migration does not silently
-- break that feature. This remains a staging review risk: the browser path is
-- not protected by the application's custom session/customerId model.

-- These tables had no RLS in the migration source reviewed before 009.
-- Each existence check keeps the migration safe when an optional schema file
-- has not been applied to a local throwaway database.
DO $$
BEGIN
  IF to_regclass('public.otp_tokens') IS NOT NULL THEN
    ALTER TABLE public.otp_tokens ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.sessions') IS NOT NULL THEN
    ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.chat_conversations') IS NOT NULL THEN
    ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.llm_runtime_settings') IS NOT NULL THEN
    ALTER TABLE public.llm_runtime_settings ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.llm_runtime_audit_logs') IS NOT NULL THEN
    ALTER TABLE public.llm_runtime_audit_logs ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.customer_settings') IS NOT NULL THEN
    ALTER TABLE public.customer_settings ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.rate_limits') IS NOT NULL THEN
    ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- No CREATE POLICY statements are intentional in 009. Adding an
-- auth.uid()-based policy here would not enforce the application's custom
-- customer ownership and could expose or strand rows. A future Supabase Auth
-- migration must first define the identity binding and then add explicit,
-- table-specific SELECT/INSERT/UPDATE/DELETE policies.
