-- P0 security fix (Fable review 2026-07-02, docs/FABLE_REVIEW_2026-07-02.md §1):
-- match_memory_facts / match_messages are SECURITY DEFINER, filter only by the
-- caller-supplied match_user_id, and were executable by anon + authenticated via
-- PostgREST RPC (/rest/v1/rpc/...). Any logged-in user who knew another user's
-- UUID (partners see each other's on decoded_invites) could vector-search that
-- user's PRIVATE memory_facts and coaching messages — the catastrophic partner
-- leak PRIVACY_TERMS_LIABILITY_PLAN §3.3 warns about.
--
-- The only legitimate caller is the edge functions' service-role client
-- (supabase/functions/_shared/embeddings.ts), so client roles lose EXECUTE.

REVOKE ALL ON FUNCTION public.match_memory_facts(text, uuid, integer, double precision) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_messages(text, uuid, integer, double precision) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.match_memory_facts(text, uuid, integer, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_messages(text, uuid, integer, double precision) TO service_role;
