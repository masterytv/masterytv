-- =====================================================================
-- Relatti — split sharing into two independent axes
-- =====================================================================
-- APPLIED TO PRODUCTION 2026-07-01.
--
-- Before: one value (decoded_invites.share_with_coach, mirrored to
-- participant.share_level) drove BOTH what the coach could use AND the
-- compatibility report level — so the single "What your coach can see" control
-- secretly changed both, for the whole couple at once.
--
-- After — two axes:
--   (a) COACH visibility — PER-PERSON, unilateral. participant.coach_share_level,
--       default 'full'. How much of YOUR OWN profile YOUR coach uses. Changing it
--       is immediate and never involves your partner.
--   (b) PARTNER visibility — NEGOTIATED for the couple. decoded_invites
--       .share_with_human (agreed level, mirrored to participant.share_level),
--       with upgrade_requested_level/by as the pending handshake. Default
--       'type_compatibility' (Archetype & Blueprint) so the compatibility report
--       works out of the box. Raising needs both to agree; lowering is immediate.
--
-- share_with_coach is left in place but is now vestigial (kept == share_with_human
-- by the consent API); the coach reads the two axes above.

-- 1. Per-person coach axis. NOT NULL + DEFAULT auto-backfills existing rows to 'full'.
ALTER TABLE participant
  ADD COLUMN IF NOT EXISTS coach_share_level text NOT NULL DEFAULT 'full';
ALTER TABLE participant
  DROP CONSTRAINT IF EXISTS participant_coach_share_level_check;
ALTER TABLE participant
  ADD CONSTRAINT participant_coach_share_level_check
  CHECK (coach_share_level IN ('none','type_compatibility','full'));

-- 2. Establish the partner-axis default for existing CONNECTED dyads that never
--    set a human-share level, so their compatibility report works.
UPDATE decoded_invites
  SET share_with_human = 'type_compatibility'
  WHERE recipient_id IS NOT NULL
    AND recipient_report_id IS NOT NULL
    AND COALESCE(share_with_human,'none') = 'none'
    AND recipient_email <> 'broadcast';

-- Mirror that onto the partner-axis participant field for the same dyads.
UPDATE participant p
  SET share_level = 'type_compatibility'
  FROM engagement e
  JOIN decoded_invites di ON di.id = e.source_invite_id
  WHERE p.engagement_id = e.id
    AND di.share_with_human = 'type_compatibility'
    AND COALESCE(p.share_level,'none') = 'none';

-- 3. relatti_sync_invite v3: participant.share_level now tracks the PARTNER axis
--    (share_with_human), a connected dyad defaults the partner axis to
--    'type_compatibility', and coach_share_level is NEVER touched here (per-person).
CREATE OR REPLACE FUNCTION public.relatti_sync_invite(p_invite_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  inv          decoded_invites%ROWTYPE;
  eng_id       uuid;
  self_pid     uuid;
  partner_pid  uuid;
  eng_status   text;
  partner_status text;
  share_lvl    text;
  connected    boolean;
BEGIN
  SELECT * INTO inv FROM decoded_invites WHERE id = p_invite_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- "Connected" = the recipient has claimed an account AND completed a profile.
  connected := inv.recipient_id IS NOT NULL AND inv.recipient_report_id IS NOT NULL;

  -- Partner-axis default: once connected, give the couple 'type_compatibility'
  -- (Archetype & Blueprint) if they've never chosen a human-share level, so the
  -- compatibility report generates. revoked_at IS NULL guards a DELIBERATE
  -- "Private" (share none) from being silently re-defaulted back up.
  IF connected AND COALESCE(inv.share_with_human,'none') = 'none' AND inv.revoked_at IS NULL THEN
    UPDATE decoded_invites
      SET share_with_human = 'type_compatibility',
          share_with_coach = CASE WHEN COALESCE(share_with_coach,'none') = 'none'
                                  THEN 'type_compatibility' ELSE share_with_coach END
      WHERE id = inv.id;
    inv.share_with_human := 'type_compatibility';
  END IF;

  -- participant.share_level = the PARTNER-visibility axis (share_with_human).
  share_lvl := CASE inv.share_with_human
                 WHEN 'compatibility' THEN 'type_compatibility'
                 WHEN 'type_compatibility' THEN 'type_compatibility'
                 WHEN 'full' THEN 'full'
                 ELSE 'none' END;

  eng_status     := CASE WHEN connected THEN 'active' ELSE 'forming' END;
  partner_status := CASE WHEN connected THEN 'active' ELSE 'invited' END;

  -- 1. Engagement (find or create)
  SELECT id INTO eng_id FROM engagement WHERE source_invite_id = inv.id;
  IF eng_id IS NULL THEN
    INSERT INTO engagement (workspace_id, program_id, kind, status, created_by, source_invite_id, title)
    VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
            'relationship_dyad', eng_status, inv.inviter_id, inv.id,
            COALESCE(NULLIF(inv.inviter_name,''), split_part(COALESCE(inv.inviter_email,''),'@',1), 'Partner')
              || ' + ' || split_part(inv.recipient_email,'@',1))
    RETURNING id INTO eng_id;
    UPDATE decoded_invites SET engagement_id = eng_id WHERE id = inv.id;
  ELSE
    UPDATE engagement SET status = eng_status, updated_at = now() WHERE id = eng_id;
  END IF;

  -- 2. Self participant (upsert by role). coach_share_level left to the column
  --    default on INSERT and untouched on UPDATE (it is user-controlled).
  SELECT id INTO self_pid FROM participant WHERE engagement_id = eng_id AND role = 'self';
  IF self_pid IS NULL THEN
    INSERT INTO participant (engagement_id, user_id, role, report_id, share_level, status, consented_at, revoked_at, joined_at)
    VALUES (eng_id, inv.inviter_id, 'self', inv.inviter_report_id, share_lvl, 'active', inv.consented_at, inv.revoked_at, inv.created_at)
    RETURNING id INTO self_pid;
  ELSE
    UPDATE participant SET user_id = inv.inviter_id, report_id = inv.inviter_report_id,
           share_level = share_lvl, consented_at = inv.consented_at, revoked_at = inv.revoked_at
    WHERE id = self_pid;
  END IF;

  -- 3. Partner participant (upsert by role)
  SELECT id INTO partner_pid FROM participant WHERE engagement_id = eng_id AND role = 'partner';
  IF partner_pid IS NULL THEN
    INSERT INTO participant (engagement_id, user_id, invited_email, role, report_id, share_level, status, consented_at, revoked_at, joined_at)
    VALUES (eng_id, inv.recipient_id, inv.recipient_email, 'partner', inv.recipient_report_id, share_lvl, partner_status,
            inv.consented_at, inv.revoked_at, CASE WHEN inv.recipient_id IS NOT NULL THEN inv.completed_at END)
    RETURNING id INTO partner_pid;
  ELSE
    UPDATE participant SET user_id = inv.recipient_id, invited_email = inv.recipient_email,
           report_id = inv.recipient_report_id, share_level = share_lvl, status = partner_status,
           consented_at = inv.consented_at, revoked_at = inv.revoked_at,
           joined_at = COALESCE(joined_at, CASE WHEN inv.recipient_id IS NOT NULL THEN inv.completed_at END)
    WHERE id = partner_pid;
  END IF;

  -- 4. Partner stake (ensure exactly one)
  IF NOT EXISTS (SELECT 1 FROM accountability_link WHERE engagement_id = eng_id AND stake_type = 'partner') THEN
    INSERT INTO accountability_link (engagement_id, stake_type, from_participant_id, to_participant_id, status)
    VALUES (eng_id, 'partner', self_pid, partner_pid, 'active');
  END IF;

  -- 5. Blueprint artifact (upsert when any compat payload exists)
  IF inv.compatibility_report IS NOT NULL OR inv.compatibility_report_inviter IS NOT NULL OR inv.compatibility_report_recipient IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM engagement_artifact WHERE engagement_id = eng_id AND kind = 'relationship_blueprint') THEN
      UPDATE engagement_artifact SET content = jsonb_strip_nulls(jsonb_build_object(
               'compatibility_report', inv.compatibility_report,
               'compatibility_report_inviter', inv.compatibility_report_inviter,
               'compatibility_report_recipient', inv.compatibility_report_recipient,
               'promoted_from_invite', inv.id)), updated_at = now()
      WHERE engagement_id = eng_id AND kind = 'relationship_blueprint';
    ELSE
      INSERT INTO engagement_artifact (engagement_id, kind, content)
      VALUES (eng_id, 'relationship_blueprint', jsonb_strip_nulls(jsonb_build_object(
               'compatibility_report', inv.compatibility_report,
               'compatibility_report_inviter', inv.compatibility_report_inviter,
               'compatibility_report_recipient', inv.compatibility_report_recipient,
               'promoted_from_invite', inv.id)));
    END IF;
  END IF;

  RETURN eng_id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.relatti_sync_invite(uuid) FROM anon, authenticated;
