-- PC2.2 phase A (TENANCY_AUDIT T7): long-term coach memory belongs to a
-- program. Without this, a dual-brand user's RELATIONSHIP coach reads their
-- EXECUTIVE coaching memory (and vice versa) — the confound the founder was
-- warned about before evaluating the Relatti coach.
--
-- ⚠️ Two-phase (same pattern as decoded_invites 20260716170010):
-- coach_profiles keeps UNIQUE(user_id) until the scoped app+edge code is live
-- (old code .single()s by user_id — a second per-program row would break it;
-- old profile-updater upserts onConflict user_id). Phase B drops it.

-- ── memory_facts ──
ALTER TABLE memory_facts ADD COLUMN program text;

-- Backfill from the fact's source conversation — every live fact has a
-- source_message_id, and conversations carry program (2026-07-15).
-- NULL conversation program = pre-stamp executive era = general.
UPDATE memory_facts mf SET program = COALESCE(
  (SELECT c.program
     FROM messages m JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = mf.source_message_id),
  'general'
) WHERE mf.program IS NULL;

ALTER TABLE memory_facts ALTER COLUMN program SET NOT NULL;
ALTER TABLE memory_facts ALTER COLUMN program SET DEFAULT 'general';
CREATE INDEX idx_memory_facts_user_program ON memory_facts (user_id, program);

-- ── coach_profiles: one profile per (user, program) ──
ALTER TABLE coach_profiles ADD COLUMN program text;

-- Backfill: a profile was learned from whichever coach the user actually
-- talked to — signup_brand is the only per-user signal (testers = relatti =
-- relationship; Tom = masterytv = general).
UPDATE coach_profiles cp SET program = COALESCE(
  (SELECT CASE WHEN u.signup_brand = 'relatti' THEN 'relationship'
               ELSE 'general' END
     FROM users u WHERE u.id = cp.user_id),
  'general'
) WHERE cp.program IS NULL;

ALTER TABLE coach_profiles ALTER COLUMN program SET NOT NULL;
ALTER TABLE coach_profiles ALTER COLUMN program SET DEFAULT 'general';
CREATE UNIQUE INDEX coach_profiles_user_program_key ON coach_profiles (user_id, program);
-- coach_profiles_user_id_key (UNIQUE user_id) deliberately KEPT — phase B drops it.

-- ── match_memory_facts gains an optional program filter ──
-- DROP+CREATE (not OR REPLACE): the arg list changes, and OR REPLACE would
-- create an ambiguous second overload for PostgREST. match_program defaults to
-- NULL (no filter) so already-deployed edge functions keep working through the
-- deploy window; the scoped prompt-assembler passes it explicitly.
DROP FUNCTION public.match_memory_facts(text, uuid, integer, double precision);

CREATE FUNCTION public.match_memory_facts(
  query_embedding text,
  match_user_id uuid,
  match_count integer DEFAULT 10,
  match_threshold double precision DEFAULT 0.3,
  match_program text DEFAULT NULL
)
 RETURNS TABLE(id uuid, category text, subject text, content text, importance double precision, similarity double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    mf.id,
    mf.category,
    mf.subject,
    mf.content,
    mf.importance::float,
    (1 - (mf.embedding <=> query_embedding::vector))::float AS similarity
  FROM memory_facts mf
  WHERE mf.user_id = match_user_id
    AND mf.embedding IS NOT NULL
    AND (match_program IS NULL OR mf.program = match_program)
    AND (1 - (mf.embedding <=> query_embedding::vector)) > match_threshold
  ORDER BY mf.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$function$;

-- Re-lock: CREATE resets ACLs and SECURITY DEFINER functions are
-- PostgREST-callable by PUBLIC by default (the 2026-07-02 P0 leak class).
-- This RPC is service-role-only, as it was before.
REVOKE ALL ON FUNCTION public.match_memory_facts(text, uuid, integer, double precision, text) FROM PUBLIC, anon, authenticated;
