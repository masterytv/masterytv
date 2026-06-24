-- =====================================================================
-- Relatti Spine — Epic E3: per-invite idempotent sync (dual-write target)
-- =====================================================================
-- APPLIED TO PRODUCTION 2026-06-16. Matches remote migration version 20260616201208.
--
-- relatti_sync_invite(invite_id) is the SINGLE source of truth for mapping a
-- decoded_invites row → the engagement spine (engagement + both participants +
-- partner stake + Blueprint). Idempotent create-or-update. Called by:
--   • the app dual-write flows via service-role RPC (invite create / claim /
--     consent / revoke) — see src/lib/decoded/sync-engagement.ts
--   • the decoded-compatibility-report edge function on 'connected'
--   • the bulk backfill relatti_promote_invites() (now a loop over this)
-- SECURITY DEFINER + search_path pinned + EXECUTE revoked from anon/authenticated.

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
BEGIN
  SELECT * INTO inv FROM decoded_invites WHERE id = p_invite_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  share_lvl := CASE inv.share_with_coach
                 WHEN 'compatibility' THEN 'type_compatibility'
                 WHEN 'type_compatibility' THEN 'type_compatibility'
                 WHEN 'full' THEN 'full'
                 ELSE 'none' END;
  eng_status := CASE WHEN inv.status = 'pending' THEN 'forming' ELSE 'active' END;
  partner_status := CASE WHEN inv.recipient_id IS NULL OR inv.status = 'pending' THEN 'invited' ELSE 'active' END;

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

  -- 2. Self participant (upsert by role)
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

-- Bulk backfill now reuses the per-invite syncer (DRY).
CREATE OR REPLACE FUNCTION public.relatti_promote_invites()
RETURNS void
LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE r uuid;
BEGIN
  FOR r IN SELECT id FROM decoded_invites WHERE engagement_id IS NULL LOOP
    PERFORM public.relatti_sync_invite(r);
  END LOOP;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.relatti_sync_invite(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.relatti_promote_invites() FROM anon, authenticated;
