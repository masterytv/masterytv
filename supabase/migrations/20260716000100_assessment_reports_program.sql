-- PC2.1a (part 2) — denormalize `program` onto assessment_reports.
-- Spec: directives/ASSESSMENT_PROGRAM_SCOPING.md §5.1 left this decision open:
-- "take it only if a read needs report-by-program without the join."
--
-- It does — NINE of them. These all ask "this user's report" with no assessment
-- in hand, and each would otherwise need a PostgREST embedded join just to read
-- one column:
--   _shared/prompt-assembler.ts:388   (the partner's report, for the dyad coach)
--   api/decoded/invite/route.ts:50,93 · invite-consent:173 · invite-notify:73
--   invite/[code]/page.tsx:98 · claim-invites.ts:62,133 · onboarding:649
--
-- The alternative — `assessment_reports!inner(assessments(program))` at nine
-- call sites, two of them in edge functions that can't share code with src/ —
-- buys nothing over one denormalized column and is far easier to get subtly
-- wrong. A report belongs to exactly one assessment (idx_profiles/scores unique
-- on assessment_id), and reports are created in exactly ONE place
-- (src/lib/decoded/report/generate.ts), so the column has a single writer and
-- cannot drift.

ALTER TABLE assessment_reports ADD COLUMN IF NOT EXISTS program text;

-- Backfill from the parent assessment — the source of truth for program.
UPDATE assessment_reports r
SET program = a.program
FROM assessments a
WHERE r.assessment_id = a.id
  AND r.program IS NULL;

-- Orphans (a report whose assessment is gone) can't be classified; default to
-- the incumbent so MasteryTV is never surprised.
UPDATE assessment_reports SET program = 'general' WHERE program IS NULL;

ALTER TABLE assessment_reports ALTER COLUMN program SET NOT NULL;
ALTER TABLE assessment_reports ALTER COLUMN program SET DEFAULT 'general';

-- "This user's current report in this program", the shape all nine reads want.
CREATE INDEX IF NOT EXISTS idx_reports_user_program
  ON assessment_reports (user_id, program, created_at DESC);
