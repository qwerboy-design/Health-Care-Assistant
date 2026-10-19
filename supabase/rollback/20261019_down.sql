-- Rollback for 20261019_add_keepalive_rpc.
-- Removes the server-time-only GitHub Actions keepalive function.

DROP FUNCTION IF EXISTS public.keepalive();
