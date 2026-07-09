-- Security hardening — lock internal / server-only SECURITY DEFINER RPCs.
--
-- Same class as the 2026-07-02 P0 leak (match_memory_facts / match_messages,
-- 20260702000000_p0_lock_semantic_search_rpcs.sql): Postgres grants EXECUTE on
-- every function to PUBLIC by default, and anon/authenticated INHERIT that PUBLIC
-- grant. Earlier migrations for relatti_sync_invite and get_auth_provider_for_email
-- did `REVOKE ... FROM anon, authenticated` but NOT `FROM PUBLIC`, so both stayed
-- callable via PostgREST (/rest/v1/rpc/*). The Supabase security advisor flags these
-- as anon_/authenticated_security_definer_function_executable (lints 0028 / 0029).
--
-- Triage (verified against src/ + supabase/functions/ call sites):
--   * relatti_sync_invite   — MUTATES spine state (promotes participant/engagement
--                             status from facts). Only server-side callers, all on the
--                             service-role admin client: src/lib/decoded/sync-engagement.ts,
--                             src/lib/relatti/sync-my-report.ts, and the
--                             decoded-compatibility-report edge function. An anon caller
--                             could otherwise invoke it on arbitrary invite_ids.
--   * get_auth_provider_for_email — reveals a signup's OAuth provider. Only called by
--                             src/app/api/auth/check-provider/route.ts under the service
--                             role; the login UI (LoginPanel.tsx, DecodedLanding.tsx) hits
--                             that route via fetch(), never the RPC directly.
--   * handle_new_user       — auth.users AFTER INSERT trigger. Triggers fire regardless
--                             of EXECUTE grants on the trigger function, so no
--                             client/anon grant is needed for signup to work.
--   * sync_is_admin_from_role — public.users BEFORE trigger; same trigger reasoning. Also
--                             had a mutable search_path (advisor lint 0011) — pinned here.
--
-- Intentionally LEFT callable (NOT touched by this migration):
--   * get_auth_user_role(), is_engagement_participant(uuid) — evaluated inside RLS policy
--     expressions as the querying role, so anon/authenticated MUST retain EXECUTE or every
--     policied query breaks. Both key on auth.uid(), so they only reveal the caller's own
--     role / own engagement membership.
--   * ritual_dyad_reveal(), ritual_submit_response() — called from the browser during the
--     daily ritual; already correctly scoped to `authenticated` only (no PUBLIC/anon grant).

-- ── relatti_sync_invite: spine mutation, service-role only ──────────────────
REVOKE ALL ON FUNCTION public.relatti_sync_invite(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.relatti_sync_invite(uuid) TO service_role;

-- ── get_auth_provider_for_email: auth-provider lookup, service-role only ────
REVOKE ALL ON FUNCTION public.get_auth_provider_for_email(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_auth_provider_for_email(text) TO service_role;

-- ── handle_new_user: auth trigger, no client / RPC execution ────────────────
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ── sync_is_admin_from_role: users trigger — lock + pin search_path ─────────
REVOKE ALL ON FUNCTION public.sync_is_admin_from_role() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.sync_is_admin_from_role() SET search_path = public;
