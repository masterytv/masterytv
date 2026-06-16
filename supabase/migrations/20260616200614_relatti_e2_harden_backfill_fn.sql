-- =====================================================================
-- Relatti Spine — E2 hardening of the backfill helper
-- =====================================================================
-- APPLIED TO PRODUCTION 2026-06-16. Matches remote migration version 20260616200614.
-- Clears Supabase advisor 0011 (mutable search_path) and locks the data-mutating
-- backfill helper to service_role/postgres so it is not callable via the public API.
ALTER FUNCTION public.relatti_promote_invites() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.relatti_promote_invites() FROM anon, authenticated;
