-- =====================================================================
-- Relatti Spine — Epic E2: backfill function (promotes decoded_invites)
-- =====================================================================
-- APPLIED TO PRODUCTION 2026-06-16 (project masterytv-website / lwmadssysqcwbsoiaokc).
-- This file matches remote migration version 20260616200439.
--
-- Defines an idempotent promoter (keyed on engagement.source_invite_id) and
-- leaves it in the schema. The actual one-time backfill of the 12 existing
-- invites was executed immediately after via:  SELECT public.relatti_promote_invites();
-- Result (verified): 12 invites → 12 engagements (3 active, 9 forming),
-- 24 participants (9 partners invited / 3 active), 12 partner-stakes, 3 blueprints.
--
-- Hardening (search_path + EXECUTE revoke) is in the follow-up migration
-- 20260616200614_relatti_e2_harden_backfill_fn.sql.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.relatti_promote_invites()
RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE
  inv             decoded_invites%ROWTYPE;
  eng_id          uuid;
  self_pid        uuid;
  partner_pid     uuid;
  eng_status      text;
  partner_status  text;
BEGIN
  FOR inv IN
    SELECT di.* FROM decoded_invites di
    WHERE di.engagement_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM engagement e WHERE e.source_invite_id = di.id)
  LOOP
    eng_status := CASE WHEN inv.status = 'pending' THEN 'forming' ELSE 'active' END;

    INSERT INTO engagement (workspace_id, program_id, kind, status, created_by, source_invite_id, title)
    VALUES (
      '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
      'relationship_dyad', eng_status, inv.inviter_id, inv.id,
      COALESCE(NULLIF(inv.inviter_name,''), split_part(COALESCE(inv.inviter_email,''),'@',1), 'Partner')
        || ' + ' || split_part(inv.recipient_email,'@',1)
    )
    RETURNING id INTO eng_id;

    INSERT INTO participant (engagement_id, user_id, role, report_id, share_level, status, consented_at, joined_at)
    VALUES (eng_id, inv.inviter_id, 'self', inv.inviter_report_id, inv.share_with_coach, 'active', inv.consented_at, inv.created_at)
    RETURNING id INTO self_pid;

    partner_status := CASE
      WHEN inv.recipient_id IS NULL THEN 'invited'
      WHEN inv.status = 'pending'   THEN 'invited'
      ELSE 'active' END;
    INSERT INTO participant (engagement_id, user_id, invited_email, role, report_id, share_level, status, consented_at, joined_at)
    VALUES (eng_id, inv.recipient_id, inv.recipient_email, 'partner', inv.recipient_report_id, inv.share_with_coach,
            partner_status, inv.consented_at, CASE WHEN inv.recipient_id IS NOT NULL THEN inv.completed_at END)
    RETURNING id INTO partner_pid;

    INSERT INTO accountability_link (engagement_id, stake_type, from_participant_id, to_participant_id, status)
    VALUES (eng_id, 'partner', self_pid, partner_pid, 'active');

    IF inv.compatibility_report IS NOT NULL OR inv.compatibility_report_inviter IS NOT NULL OR inv.compatibility_report_recipient IS NOT NULL THEN
      INSERT INTO engagement_artifact (engagement_id, kind, content)
      VALUES (eng_id, 'relationship_blueprint', jsonb_strip_nulls(jsonb_build_object(
        'compatibility_report', inv.compatibility_report,
        'compatibility_report_inviter', inv.compatibility_report_inviter,
        'compatibility_report_recipient', inv.compatibility_report_recipient,
        'promoted_from_invite', inv.id)));
    END IF;

    UPDATE decoded_invites SET engagement_id = eng_id WHERE id = inv.id;
  END LOOP;
END;
$fn$;

-- One-time backfill (no-op if already promoted; safe to re-run):
SELECT public.relatti_promote_invites();
