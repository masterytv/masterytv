-- I4.3 — integration-pack memory taxonomy (INTEGRATION_SPRINT.md §3 / I4.3;
-- integration-pack.ts `extraction`).
--
-- Three new categories, and each one is a thing this coach must remember for
-- months without re-asking:
--   'account'    — what they say happened, in their own words. Stored ONCE, their
--                  language, no tidying. The founder's August 11 decision: the
--                  account is theirs and a product that makes them tell it twice
--                  has failed at the thing it exists for. What may NOT be stored
--                  is anything derived from it, which _shared/memory-filter.ts
--                  enforces deterministically on every integration write.
--   'cost'       — where this is costing them in ordinary life: sleep, the body,
--                  work, money, the people around them. This is the coachable
--                  material, and it is available whether or not the question of
--                  what the experience was is ever answered.
--   'disclosure' — who they have told and what happened when they did, including
--                  the times it went badly. The Telling Ladder (I13) is built on
--                  this, and the disbelief is the first-order injury.
--
-- Cosmology is deliberately absent, and that is the design: there is no category
-- for what the experience WAS or what it proves, because a stored conclusion
-- becomes a premise the coach inherits forever. The pack's factsRule says not to
-- extract it; the filter drops what does come through.
--
-- ⚠️ THE ARRAY BELOW = the LIVE constraint's category set, queried from
-- pg_constraint on lwmadssysqcwbsoiaokc on 2026-08-12 (17 values: the 11 shared
-- + the 6 money categories added by 20260718120000), UNION the three above. It is
-- NOT derived from the committed baseline — the live CHECK leads the committed
-- files (the 44-vs-7 migration-history gap), so re-query pg_constraint before
-- ever editing this list again.
--
-- ORDERING (HARD): apply this BEFORE any edge function carrying
-- integration-pack.ts deploys. `extraction.factCategories` now NAMES the three;
-- post-processor.ts clamps to the pack's set and then BATCH-inserts into
-- memory_facts, so one category the CHECK rejects fails the WHOLE batch and drops
-- every fact in it, silently, for the vertical whose whole promise is that it
-- remembers what you told it. (Learned on money, 2026-07-18.)
--
-- No SECURITY DEFINER RPC here → no REVOKE/GRANT needed. Widening only: every
-- existing value stays admitted, so the ADD validates against live rows with no
-- rewrite. Apply to the live engine DB is a founder decision; run the security
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
      'decision'::text, 'trigger'::text, 'guardrail'::text,
      -- I4.3 integration taxonomy
      'account'::text, 'cost'::text, 'disclosure'::text
    ])
  );
