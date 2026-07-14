-- PC4.3 — pack-owned memory taxonomy (COACH_ARCHITECTURE_AUDIT Phase 2).
--
-- The relationship pack extracts relationship-shaped memory: recurring themes
-- ('theme'), attachment cues ('attachment_cue'), plus the shared categories
-- (personal/preference/goal/challenge/win/pattern). Extend the live
-- memory_facts_category_check to admit the two new values; the executive set
-- is unchanged. (The constraint exists in the cloud but not in the committed
-- baseline — same 44-vs-7 history gap as commitments_status_check.)

ALTER TABLE public.memory_facts
  DROP CONSTRAINT IF EXISTS memory_facts_category_check;
ALTER TABLE public.memory_facts
  ADD CONSTRAINT memory_facts_category_check CHECK (
    category = ANY (ARRAY[
      'business'::text, 'personal'::text, 'goal'::text, 'person'::text,
      'challenge'::text, 'win'::text, 'pattern'::text, 'preference'::text,
      'org_sop'::text, 'theme'::text, 'attachment_cue'::text
    ])
  );
