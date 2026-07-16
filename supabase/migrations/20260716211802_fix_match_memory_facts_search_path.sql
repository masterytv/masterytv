-- match_memory_facts was recreated 2026-07-16 (PC2.2 match_program param) with
-- search_path=public, but pgvector's `vector` type lives in the extensions
-- schema — every call since failed at RETURN QUERY with 42704 "type vector
-- does not exist", silently killing semantic memory recall (the coach's
-- try/catch degrades to importance-ranked facts only).
-- ALTER (not DROP+CREATE) on purpose: it preserves the service-role-only ACL.
ALTER FUNCTION public.match_memory_facts(text, uuid, integer, double precision, text)
  SET search_path = public, extensions;
