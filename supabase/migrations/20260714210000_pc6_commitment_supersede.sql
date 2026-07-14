-- PC6.1 — commitment supersede (PLATFORM_SPRINT.md PC6).
--
-- When a plan evolves turn-by-turn inside one conversation, the extractor used
-- to create parallel commitments (3 overlapping ones on 2026-07-13). Now the
-- extractor decides supersession: the replaced row gets status='superseded'
-- and superseded_by points at the replacement — audit trail preserved, and
-- every status='active' reader (accountability/briefing/session-planner crons,
-- dashboard groups) excludes superseded rows with zero changes.
--
-- NOTE: the baseline CREATE TABLE shows status as unconstrained text, but the
-- live DB has commitments_status_check (active|completed|missed|rescheduled|
-- cancelled) — one of the 44-vs-7 migration-history gaps. Extend it.

ALTER TABLE public.commitments
  DROP CONSTRAINT IF EXISTS commitments_status_check;
ALTER TABLE public.commitments
  ADD CONSTRAINT commitments_status_check CHECK (
    status = ANY (ARRAY['active'::text, 'completed'::text, 'missed'::text, 'rescheduled'::text, 'cancelled'::text, 'superseded'::text])
  );

ALTER TABLE public.commitments
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.commitments(id);

COMMENT ON COLUMN public.commitments.superseded_by IS
  'Set when status=superseded: the commitment that replaced this one (extractor judgment, or the <30-min embedding-similarity backstop).';
