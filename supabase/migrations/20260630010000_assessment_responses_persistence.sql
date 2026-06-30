-- Fix: assessment_responses was always empty because the client upsert targeted
-- ON CONFLICT (assessment_id, instrument_id, item_index) but NO unique constraint
-- on those columns existed (only PK on id). PostgREST rejected every write with
-- 42P10 ("no unique or exclusion constraint matching the ON CONFLICT spec"), and
-- the call was fire-and-forget so the error was swallowed.
--
-- Raw item answers were NOT actually lost — they persist as a JSONB blob in
-- assessment_progress.responses (which is what scoreAssessment reads). This
-- migration (1) adds the missing constraint so writes land going forward, and
-- (2) backfills the normalized table from the surviving progress blobs so the
-- per-item store is complete for existing assessments.

-- 1. The constraint the upsert always assumed existed.
ALTER TABLE public.assessment_responses
  ADD CONSTRAINT assessment_responses_assessment_instrument_item_unique
  UNIQUE (assessment_id, instrument_id, item_index);

-- 2. Backfill normalized rows from the JSONB blob in assessment_progress.
--    Blob shape: { "<instrument_id>": { "<item_index>": <response_value>, ... }, ... }
INSERT INTO public.assessment_responses
  (assessment_id, user_id, instrument_id, item_index, item_key, response_value)
SELECT
  p.assessment_id,
  p.user_id,
  inst.key                              AS instrument_id,
  (item.key)::int                       AS item_index,
  inst.key || '_q' || item.key          AS item_key,
  (item.value)::int                     AS response_value
FROM public.assessment_progress p
CROSS JOIN LATERAL jsonb_each(p.responses)       AS inst(key, value)
CROSS JOIN LATERAL jsonb_each_text(inst.value)   AS item(key, value)
WHERE p.responses IS NOT NULL
  AND p.responses <> '{}'::jsonb
  AND item.key ~ '^[0-9]+$'   -- only numeric item indices (defensive)
ON CONFLICT (assessment_id, instrument_id, item_index) DO NOTHING;
