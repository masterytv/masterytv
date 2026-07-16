-- PC2.1a — Program-scoping the assessment spine.
-- Spec: directives/ASSESSMENT_PROGRAM_SCOPING.md
--
-- The twin of 20260715120000_conversations_program. That migration fixed
-- cross-brand bleed for conversations; assessments have the same hole one layer
-- down. Found 2026-07-16: tom@masterytv.com has 5 assessments, ALL full Decoded
-- batteries, and NO Relatti one — 11 days after relatti.com went live. He can't
-- get one: /assess's completed-check has no program filter, so any completed
-- assessment in ANY program redirects him to /dashboard. Worse, if he forced
-- past it, AssessmentEngine's supersede (filtered only by user_id) would mark
-- his MasteryTV assessment superseded — silently destroying the profile the
-- executive coach reads.
--
-- Only `assessments` needs the column: progress/scores/profiles/reports all key
-- off assessment_id (unique indexes enforce it), so program cascades by join.
--
-- Mirrors conversations.program deliberately: bare text, no CHECK constraint. A
-- CHECK would need editing for every new vertical — the opposite of
-- verticals-as-config. Values: 'general' (MasteryTV/Decoded) | 'relationship'
-- (Relatti), sourced from brand.programSlug.

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS program text;

-- Backfill from the ADMINISTERED INSTRUMENTS, not users.signup_brand.
--
-- Why not signup_brand: it describes the PERSON, not the assessment. Tom is
-- stamped 'masterytv' and all 5 of his assessments are indeed general — but the
-- rule must key off what was actually administered, or the first dual-brand user
-- mislabels every row they own.
--
-- Why instruments: riasec/weims (the career measures) are in the Core battery
-- and absent from the relationship battery. This is the exact signal
-- isRelationshipReport already uses to decide rendering (ReportViewer.tsx:666,
-- decoded-generate-report:827), so the backfill reproduces today's behaviour
-- row-for-row — nothing changes appearance the moment this lands.
--
-- NOTE: the superseded PC2.1 plan (2026-06-24) said "backfill existing rows to
-- the general program". That would mislabel tester1/tester2 and the three beta
-- testers — real relationship assessments — and break the live dyad + compat
-- report. Verified against prod before writing: 5 general (Tom), 5 relationship.
-- Three cases, in order. The middle one is the point: "no career instruments"
-- only means "relationship" if the assessment was actually SCORED. An
-- in-progress or abandoned assessment has no scores at all and would sail
-- through a naive `ELSE 'relationship'` — misfiled regardless of the brand it
-- was started on. Those can't be classified from instruments, so they take the
-- incumbent ('general'): a MasteryTV user is never surprised, and a Relatti user
-- simply starts a fresh one (their abandoned row is invisible to /assess, which
-- now scopes the in-progress lookup by program).
--
-- Verified against prod before applying: every row had scores (3 / 12 / 13), so
-- no row depended on this branch — but the file has to be right for any fresh
-- environment or a re-run, where in-progress rows are the normal case.
UPDATE assessments a
SET program = CASE
  WHEN EXISTS (
    SELECT 1 FROM assessment_scores s
    WHERE s.assessment_id = a.id
      AND s.instrument_id IN ('riasec', 'weims')
  ) THEN 'general'
  WHEN EXISTS (
    SELECT 1 FROM assessment_scores s WHERE s.assessment_id = a.id
  ) THEN 'relationship'
  ELSE 'general'
END
WHERE a.program IS NULL;

ALTER TABLE assessments ALTER COLUMN program SET NOT NULL;
ALTER TABLE assessments ALTER COLUMN program SET DEFAULT 'general';

-- Every scoped read is "this user's assessment in this program, latest first":
-- the /assess completed-check, the in-progress resume, dashboard resolution,
-- and the coach's assessment load.
CREATE INDEX IF NOT EXISTS idx_assessments_user_program
  ON assessments (user_id, program, completed_at DESC);
