-- HCA security fix: the app calls these RPCs only through the server-side
-- service_role client in lib/supabase/credits.ts. SECURITY DEFINER combined
-- with PostgreSQL's default PUBLIC EXECUTE allowed anyone holding the public
-- anon key to call /rest/v1/rpc and change customer credits.

REVOKE EXECUTE ON FUNCTION public.add_customer_credits(uuid, integer), public.deduct_customer_credits(uuid, integer, character varying, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.add_customer_credits(uuid, integer), public.deduct_customer_credits(uuid, integer, character varying, uuid) TO service_role;

DROP POLICY IF EXISTS "Users can view all models" ON public.model_pricing;
