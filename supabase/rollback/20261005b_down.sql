-- Rollback for 20261005b_fix_function_search_path.
-- Each function had proconfig = NULL before the forward migration; RESET
-- restores that original function-level configuration.

ALTER FUNCTION public.update_updated_at_column()
  RESET search_path;

ALTER FUNCTION public.update_customer_settings_updated_at()
  RESET search_path;

ALTER FUNCTION public.update_llm_runtime_settings_updated_at()
  RESET search_path;

ALTER FUNCTION public.consume_rate_limit(text, integer, integer)
  RESET search_path;

ALTER FUNCTION public.add_customer_credits(uuid, integer)
  RESET search_path;

ALTER FUNCTION public.deduct_customer_credits(uuid, integer, character varying, uuid)
  RESET search_path;
