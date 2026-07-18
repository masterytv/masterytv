-- T3 — money-pack memory taxonomy (MONEY_BUILD_HANDOFF §2; money-pack.ts `extraction`).
--
-- The money Coach Pack extracts money-psychology-shaped memory: a stated belief
-- about money ('money_belief'), a trait acting as an edge-with-a-governor
-- ('overclock'), the origin story under it ('money_story'), a specific money
-- decision it coaches ('decision' — the Decision Room's durable object), what
-- fires a money pattern ('trigger'), and a rule the user sets for themselves
-- ('guardrail'). Extend the live memory_facts_category_check to admit the six new
-- values on top of the existing set; the executive and relationship taxonomies
-- are unchanged.
--
-- ⚠️ THE ARRAY BELOW = the LIVE constraint's category set, queried from
-- pg_constraint on lwmadssysqcwbsoiaokc 2026-07-18
--   (business/personal/goal/person/challenge/win/pattern/preference/org_sop/
--    theme/attachment_cue — 11 values, all in-use rows within it),
-- UNION the six money categories. It is NOT derived from the committed baseline:
-- the live CHECK can lead the committed files (the 44-vs-7 migration-history gap),
-- so re-query pg_constraint before ever editing this list again.
--
-- ORDERING (HARD): apply this migration BEFORE the money coach edge deploys.
-- moneyPack.extraction.factCategories now NAMES these six; post-processor.ts
-- clamps extracted facts to the pack's set and then BATCH-inserts into
-- memory_facts — one category the CHECK rejects fails the WHOLE batch and drops
-- every fact in it. So the constraint must admit the six before any money coach
-- turn runs. (Same DROP/ADD shape as 20260714220000_pc43_memory_taxonomy.sql.)
--
-- No SECURITY DEFINER RPC here → no REVOKE/GRANT needed. STAGED + committed;
-- apply_migration to the live engine DB is a founder HARD STOP — run the security
-- advisors after the DDL.

ALTER TABLE public.memory_facts
  DROP CONSTRAINT IF EXISTS memory_facts_category_check;
ALTER TABLE public.memory_facts
  ADD CONSTRAINT memory_facts_category_check CHECK (
    category = ANY (ARRAY[
      -- existing (live) set — unchanged
      'business'::text, 'personal'::text, 'goal'::text, 'person'::text,
      'challenge'::text, 'win'::text, 'pattern'::text, 'preference'::text,
      'org_sop'::text, 'theme'::text, 'attachment_cue'::text,
      -- T3 money taxonomy
      'money_belief'::text, 'overclock'::text, 'money_story'::text,
      'decision'::text, 'trigger'::text, 'guardrail'::text
    ])
  );
