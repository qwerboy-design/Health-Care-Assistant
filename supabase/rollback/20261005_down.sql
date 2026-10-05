-- HCA security rollback: this deliberately re-opens the credits RPC
-- vulnerability by restoring PUBLIC/anon/authenticated EXECUTE.

GRANT EXECUTE ON FUNCTION public.add_customer_credits(uuid, integer), public.deduct_customer_credits(uuid, integer, character varying, uuid) TO PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can view all models" ON public.model_pricing;

CREATE POLICY "Users can view all models"
  ON public.model_pricing
  FOR SELECT
  TO authenticated
  USING (true);
