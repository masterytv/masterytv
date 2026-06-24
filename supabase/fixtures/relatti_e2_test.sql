-- =====================================================================
-- LOCAL TEST FIXTURE — Relatti E1/E2 verification  (⚠️ DO NOT run on prod)
-- =====================================================================
-- Lives OUTSIDE supabase/migrations/ on purpose: it is never replayed by
-- `db reset` or pushed to a remote. It seeds synthetic dyads so you can prove
-- the spine (E1) + backfill (E2) end-to-end on the FREE local stack.
--
-- USAGE (local only):
--   supabase start
--   supabase db reset                                   # baseline + E1 + E2 (0 invites)
--   psql "$(supabase status -o json | jq -r .DB_URL)" -f supabase/fixtures/relatti_e2_test.sql
--   -- or: supabase db reset && cat this file | supabase db query
--
-- It inserts 5 auth users (the on_auth_user_created trigger auto-creates the
-- matching public.users / coach_profiles / onboarding_state rows), their
-- assessment reports, and 3 invites spanning every status, then calls the
-- idempotent promoter and prints a PASS/FAIL summary.
--
-- Coverage:
--   • connected  + claimed partner + share 'full'              + full compat  → blueprint
--   • consented  + claimed partner + share 'type_compatibility'+ split compat → blueprint
--   • pending    + UNCLAIMED partner + share 'none'            + no compat     → no blueprint, partner 'invited'
-- Expected after promotion: 3 engagements, 6 participants, 3 partner-stakes, 2 blueprints.
-- =====================================================================

BEGIN;

-- ── 5 auth users (trigger fans out to public.users etc.) ──────────────
INSERT INTO auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-4111-8111-111111111111','authenticated','authenticated','alice@example.com', jsonb_build_object('name','Alice Example'), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-4222-8222-222222222222','authenticated','authenticated','bob@example.com',   jsonb_build_object('name','Bob Example'),   now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000','c3333333-3333-4333-8333-333333333333','authenticated','authenticated','carol@example.com', jsonb_build_object('name','Carol Example'), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000','d4444444-4444-4444-8444-444444444444','authenticated','authenticated','dave@example.com',  jsonb_build_object('name','Dave Example'),  now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000','e5555555-5555-4555-8555-555555555555','authenticated','authenticated','erin@example.com',  jsonb_build_object('name','Erin Example'),  now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Completed assessments (one per report-bearing user) ───────────────
INSERT INTO assessments (id, user_id, completed_at) VALUES
  ('a55e0001-0000-4000-8000-000000000001','a1111111-1111-4111-8111-111111111111', now()),
  ('a55e0002-0000-4000-8000-000000000002','b2222222-2222-4222-8222-222222222222', now()),
  ('a55e0003-0000-4000-8000-000000000003','c3333333-3333-4333-8333-333333333333', now()),
  ('a55e0004-0000-4000-8000-000000000004','d4444444-4444-4444-8444-444444444444', now()),
  ('a55e0005-0000-4000-8000-000000000005','e5555555-5555-4555-8555-555555555555', now())
ON CONFLICT (id) DO NOTHING;

-- ── Assessment reports (referenced by the invites) ────────────────────
INSERT INTO assessment_reports (id, assessment_id, user_id, archetype_base, archetype_sublabel) VALUES
  ('4e000001-0000-4000-8000-000000000001','a55e0001-0000-4000-8000-000000000001','a1111111-1111-4111-8111-111111111111','The Anchor','Secure-Connector'),
  ('4e000002-0000-4000-8000-000000000002','a55e0002-0000-4000-8000-000000000002','b2222222-2222-4222-8222-222222222222','The Seeker','Anxious-Preoccupied'),
  ('4e000003-0000-4000-8000-000000000003','a55e0003-0000-4000-8000-000000000003','c3333333-3333-4333-8333-333333333333','The Navigator','Dismissing'),
  ('4e000004-0000-4000-8000-000000000004','a55e0004-0000-4000-8000-000000000004','d4444444-4444-4444-8444-444444444444','The Harbor','Secure-Connector'),
  ('4e000005-0000-4000-8000-000000000005','a55e0005-0000-4000-8000-000000000005','e5555555-5555-4555-8555-555555555555','The Spark','Fearful-Avoidant')
ON CONFLICT (id) DO NOTHING;

-- ── 3 invites across every status ─────────────────────────────────────
-- 1. connected, claimed partner, share 'full', full compatibility_report
INSERT INTO decoded_invites
  (id, inviter_id, inviter_name, inviter_email, recipient_email, recipient_id, status,
   inviter_report_id, recipient_report_id, share_with_coach, share_with_human,
   compatibility_report, consented_at, completed_at)
VALUES
  ('17771001-0000-4000-8000-000000000001',
   'a1111111-1111-4111-8111-111111111111','Alice Example','alice@example.com','bob@example.com',
   'b2222222-2222-4222-8222-222222222222','connected',
   '4e000001-0000-4000-8000-000000000001','4e000002-0000-4000-8000-000000000002','full','full',
   jsonb_build_object('headline','Anchor × Seeker','chemistry','high','friction','pursue-withdraw',
                      'superpower','repair speed','watch_out','reassurance loops'),
   now(), now())
ON CONFLICT (inviter_id, recipient_email) DO NOTHING;

-- 2. consented, claimed partner, share 'type_compatibility', split compat
INSERT INTO decoded_invites
  (id, inviter_id, inviter_name, inviter_email, recipient_email, recipient_id, status,
   inviter_report_id, recipient_report_id, share_with_coach, share_with_human,
   compatibility_report_inviter, compatibility_report_recipient, consented_at)
VALUES
  ('17771002-0000-4000-8000-000000000002',
   'c3333333-3333-4333-8333-333333333333','Carol Example','carol@example.com','dave@example.com',
   'd4444444-4444-4444-8444-444444444444','consented',
   '4e000003-0000-4000-8000-000000000003','4e000004-0000-4000-8000-000000000004','type_compatibility','type_compatibility',
   jsonb_build_object('for','carol','note','values independence'),
   jsonb_build_object('for','dave','note','values closeness'),
   now())
ON CONFLICT (inviter_id, recipient_email) DO NOTHING;

-- 3. pending, UNCLAIMED partner, share 'none', no compat
INSERT INTO decoded_invites
  (id, inviter_id, inviter_name, inviter_email, recipient_email, recipient_id, status,
   inviter_report_id, share_with_coach, share_with_human)
VALUES
  ('17771003-0000-4000-8000-000000000003',
   'e5555555-5555-4555-8555-555555555555','Erin Example','erin@example.com','frank@example.com',
   NULL,'pending',
   '4e000005-0000-4000-8000-000000000005','none','none')
ON CONFLICT (inviter_id, recipient_email) DO NOTHING;

-- ── Promote (idempotent; defined in migration E2) ─────────────────────
SELECT public.relatti_promote_invites();

-- ── Assertions ────────────────────────────────────────────────────────
DO $$
DECLARE
  n_eng int; n_part int; n_partner_invited int; n_links int; n_bp int;
  self_share text; partner_status text; pending_partner text;
BEGIN
  SELECT count(*) INTO n_eng  FROM engagement WHERE kind='relationship_dyad';
  SELECT count(*) INTO n_part FROM participant;
  SELECT count(*) INTO n_links FROM accountability_link WHERE stake_type='partner';
  SELECT count(*) INTO n_bp   FROM engagement_artifact WHERE kind='relationship_blueprint';

  -- connected invite: self share_level copied as 'full'
  SELECT p.share_level INTO self_share
  FROM participant p JOIN engagement e ON e.id=p.engagement_id
  WHERE e.source_invite_id='17771001-0000-4000-8000-000000000001' AND p.role='self';

  -- pending invite: partner must be 'invited' with NULL user_id
  SELECT p.status INTO pending_partner
  FROM participant p JOIN engagement e ON e.id=p.engagement_id
  WHERE e.source_invite_id='17771003-0000-4000-8000-000000000003' AND p.role='partner';

  RAISE NOTICE '--- Relatti E2 fixture results ---';
  RAISE NOTICE 'engagements=% (exp 3)  participants=% (exp 6)  partner-stakes=% (exp 3)  blueprints=% (exp 2)', n_eng, n_part, n_links, n_bp;
  RAISE NOTICE 'connected.self.share_level=% (exp full)   pending.partner.status=% (exp invited)', self_share, pending_partner;

  IF n_eng=3 AND n_part=6 AND n_links=3 AND n_bp=2
     AND self_share='full' AND pending_partner='invited' THEN
    RAISE NOTICE 'PASS ✅  spine + backfill behave as designed.';
  ELSE
    RAISE EXCEPTION 'FAIL ❌  one or more invariants are wrong (see counts above).';
  END IF;

  -- Idempotency check: re-running the promoter must not change counts.
  PERFORM public.relatti_promote_invites();
  IF (SELECT count(*) FROM engagement WHERE kind='relationship_dyad') <> 3 THEN
    RAISE EXCEPTION 'FAIL ❌  promoter is not idempotent — re-run created duplicates.';
  END IF;
  RAISE NOTICE 'PASS ✅  promoter is idempotent on re-run.';
END $$;

COMMIT;
-- =====================================================================
-- END FIXTURE.  Roll back by re-running `supabase db reset`.
-- =====================================================================
