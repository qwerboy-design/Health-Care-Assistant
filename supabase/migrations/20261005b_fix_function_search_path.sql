-- HCA security fix: pin the search_path for all functions reported by the
-- Supabase function_search_path_mutable security advisor.
-- pg_catalog remains implicitly available; public contains the referenced
-- application tables, and pg_temp is retained for PostgreSQL temp objects.

-- Timestamp trigger: only NEW and built-in now()/NOW() are referenced.
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_temp;

-- Timestamp trigger: only NEW and built-in now() are referenced.
ALTER FUNCTION public.update_customer_settings_updated_at()
  SET search_path = public, pg_temp;

-- Timestamp trigger: only NEW and built-in NOW() are referenced.
ALTER FUNCTION public.update_llm_runtime_settings_updated_at()
  SET search_path = public, pg_temp;

-- Rate-limit table references resolve in public; make_interval()/NOW() are
-- built-ins and pg_catalog remains implicitly available.
ALTER FUNCTION public.consume_rate_limit(text, integer, integer)
  SET search_path = public, pg_temp;

-- Credit balance reads and writes resolve in public; JSON constructors are
-- built-ins and no extensions or auth schema objects are referenced.
ALTER FUNCTION public.add_customer_credits(uuid, integer)
  SET search_path = public, pg_temp;

-- Credit balance and transaction table references resolve in public; JSON
-- constructors are built-ins and no extensions or auth schema objects are
-- referenced.
ALTER FUNCTION public.deduct_customer_credits(uuid, integer, character varying, uuid)
  SET search_path = public, pg_temp;
