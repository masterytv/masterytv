-- PC2.1h phase A (directives/INVITE_PROGRAM_DESIGN.md §6.1–6.3):
-- an invite belongs to a program, stamped at creation from the brand the
-- inviter was on — never derived from the spine (7 of 8 invites are broadcast
-- and have no engagement).
--
-- ⚠️ Two-phase index swap: the old (inviter_id, recipient_email) UNIQUE
-- constraint MUST survive this migration. Prod app code still upserts
-- onConflict "inviter_id,recipient_email", and an ON CONFLICT target with no
-- matching constraint makes every broadcast-invite upsert error (the dashboard
-- degrades to a /login share link). The constraint is dropped in phase B
-- (20260716120100) only after the app code stamping program is live.

ALTER TABLE decoded_invites ADD COLUMN program text;

-- Backfill, most authoritative signal first:
-- 1. the report the invite actually carries; 2. the inviter's signup brand;
-- 3. the incumbent. The two no-signal rows land on 'general' DELIBERATELY —
-- they are inert (broadcast + pending + no report) and self-heal: once
-- broadcasts are per-program, the user's next relatti.com dashboard load
-- creates their correct relationship row and the stale one is never surfaced.
UPDATE decoded_invites i SET program = COALESCE(
  (SELECT r.program FROM assessment_reports r WHERE r.id = i.inviter_report_id),
  (SELECT r.program FROM assessment_reports r WHERE r.id = i.recipient_report_id),
  (SELECT CASE WHEN u.signup_brand = 'relatti' THEN 'relationship'
               WHEN u.signup_brand IS NOT NULL THEN 'general' END
     FROM users u WHERE u.id = i.inviter_id),
  'general'
)
WHERE i.program IS NULL;

ALTER TABLE decoded_invites ALTER COLUMN program SET NOT NULL;
ALTER TABLE decoded_invites ALTER COLUMN program SET DEFAULT 'general';

-- Invariant 4 (§6.5): where an invite is on the spine, the stamped program
-- must agree with engagement → program.slug.
DO $$
DECLARE bad integer;
BEGIN
  SELECT count(*) INTO bad
  FROM decoded_invites i
  JOIN engagement e ON e.id = i.engagement_id
  JOIN program p ON p.id = e.program_id
  WHERE i.program IS DISTINCT FROM p.slug;
  IF bad > 0 THEN
    RAISE EXCEPTION 'decoded_invites.program disagrees with the spine on % row(s)', bad;
  END IF;
END $$;

-- §6.2: one broadcast link per user PER PROGRAM. Creating the index also
-- proves no (inviter, recipient, program) duplicate exists.
CREATE UNIQUE INDEX decoded_invites_inviter_recipient_program_key
  ON decoded_invites (inviter_id, recipient_email, program);
