-- PC2.1h phase B (directives/INVITE_PROGRAM_DESIGN.md §6.2 / §6.5 invariant 4).
--
-- ⚠️ APPLY ONLY AFTER the phase-A app code (program-stamping upserts,
-- onConflict "inviter_id,recipient_email,program") is LIVE on prod. Before
-- that, old code still targets ON CONFLICT (inviter_id, recipient_email) —
-- dropping the constraint early breaks every broadcast-invite upsert — and old
-- code creates Relatti invites with DEFAULT 'general', which the sync guard
-- below would then silently refuse to mirror into the spine.

-- 1. Repair any rows created in the migration-A → code-deploy window: old code
--    didn't stamp program, so everything defaulted to 'general'. Re-derive from
--    the same signals as the phase-A backfill. Idempotent: a true general row
--    re-derives to 'general'.
UPDATE decoded_invites i SET program = COALESCE(
  (SELECT r.program FROM assessment_reports r WHERE r.id = i.inviter_report_id),
  (SELECT r.program FROM assessment_reports r WHERE r.id = i.recipient_report_id),
  (SELECT CASE WHEN u.signup_brand = 'relatti' THEN 'relationship'
               WHEN u.signup_brand IS NOT NULL THEN 'general' END
     FROM users u WHERE u.id = i.inviter_id),
  'general'
)
WHERE i.program = 'general'
  AND i.created_at > '2026-07-16 17:00:00+00';  -- phase A applied 17:00 UTC

-- 2. The phase-A deferred drop: one broadcast invite per user PER PROGRAM.
--    The per-program unique index (decoded_invites_inviter_recipient_program_key)
--    already exists and takes over as the upsert's conflict target.
ALTER TABLE decoded_invites
  DROP CONSTRAINT decoded_invites_inviter_id_recipient_email_key;

-- 3. Invariant 4 in relatti_sync_invite: the spine models RELATIONSHIP dyads.
--    Without this guard, syncing a general/Decoded invite would create a
--    relationship engagement (the fn hardcodes the relationship program id).
--    Only change vs the live definition: the early-return on inv.program.
CREATE OR REPLACE FUNCTION public.relatti_sync_invite(p_invite_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- PC2.1h invariant 4: a non-relationship invite never touches the spine.
  IF inv.program IS DISTINCT FROM 'relationship' THEN
    RETURN NULL;
  END IF;

  connected := inv.recipient_id IS NOT NULL AND inv.recipient_report_id IS NOT NULL;

  -- revoked_at IS NULL guards a DELIBERATE "Private" from being re-defaulted up.
  IF connected AND COALESCE(inv.share_with_human,'none') = 'none' AND inv.revoked_at IS NULL THEN
    UPDATE decoded_invites
      SET share_with_human = 'type_compatibility',
          share_with_coach = CASE WHEN COALESCE(share_with_coach,'none') = 'none'
                                  THEN 'type_compatibility' ELSE share_with_coach END
      WHERE id = inv.id;
    inv.share_with_human := 'type_compatibility';
  END IF;

  share_lvl := CASE inv.share_with_human
                 WHEN 'compatibility' THEN 'type_compatibility'
                 WHEN 'type_compatibility' THEN 'type_compatibility'
                 WHEN 'full' THEN 'full'
                 ELSE 'none' END;

  eng_status     := CASE WHEN connected THEN 'active' ELSE 'forming' END;
  partner_status := CASE WHEN connected THEN 'active' ELSE 'invited' END;

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

  IF NOT EXISTS (SELECT 1 FROM accountability_link WHERE engagement_id = eng_id AND stake_type = 'partner') THEN
    INSERT INTO accountability_link (engagement_id, stake_type, from_participant_id, to_participant_id, status)
    VALUES (eng_id, 'partner', self_pid, partner_pid, 'active');
  END IF;

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
$function$;
