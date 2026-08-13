-- HEARD (`integration`) — the anonymous-session retention window.
--
-- INTEGRATION_SPRINT.md §6.1, the open ⚠️ item under I5.1. Window is **14 days
-- since last activity** (founder call, 2026-08-13).
--
-- 🔑 The number is stated to the user in `src/lib/heard/retention.ts`, which the
-- /heard box and the "Keep this conversation" strip both render. A TS constant
-- cannot reach SQL and no gate can see across that boundary, so the two are held
-- together by this comment and its twin over there. CHANGE BOTH OR NEITHER.
--
-- ─── WHY THIS EXISTS ─────────────────────────────────────────────────────────
--
-- I5.1 answers somebody before asking them for anything: the pre-account box
-- mints a Supabase ANONYMOUS user on submit, and the first thing that user
-- writes is usually the strangest hour of their life. Supabase never cleans
-- those up. Without this, an abandoned session leaves that account attached to a
-- uuid nobody can ever claim, log into, or ask us to delete — they gave no
-- email, so they cannot be found, warned, or answered. Holding that indefinitely
-- is the one shape of data this vertical must not sit on, which is why the
-- window is deliberately the shortest in the product.
--
-- The exit the person controls is `KeepThis`: an email and a password link a
-- real identity to the SAME auth.users row and flip `is_anonymous` to false, so
-- a claimed conversation leaves this sweep's scope permanently and keeps
-- everything — the thread, the consent record, the memory.
--
-- Scope is `is_anonymous`, not a brand: HEARD's box is the only thing in the
-- product that mints an anonymous session today. A vertical that later mints
-- them inherits THIS window until somebody gives it its own, so that decision
-- belongs here rather than in whichever surface adds the second one.
--
-- ─── WHAT COUNTS AS ACTIVITY ─────────────────────────────────────────────────
--
-- The clock runs from the LATEST of four things rather than from signup, so a
-- conversation in use is never swept out from under somebody:
--   * created_at            — the floor, for a session that never sent a turn
--   * last_sign_in_at       — a returning visitor on the same device
--   * email_change_sent_at  — 🔑 the mid-claim guard. Somebody who has typed an
--     email into `KeepThis` but not yet clicked the confirmation link is STILL
--     anonymous, and sweeping them there would destroy the account on the exact
--     turn they asked to keep it.
--   * their last message    — the real signal
--
-- ─── WHY NOT A PLAIN DELETE ──────────────────────────────────────────────────
--
-- Nearly every child table cascades from auth.users → public.users, but six FKs
-- are NO ACTION and BLOCK the delete instead (verified live against
-- pg_constraint, 2026-08-13). Two provably carry rows for anyone who has spoken
-- to the coach — `cost_tracking` (6 rows for the first live anonymous session)
-- and `error_log` — so both are nulled first, exactly as delete-user-data does
-- for a real account.
--
-- The other four (contacts.converted_user_id, engagement.created_by,
-- participant.user_id, decoded_invites.upgrade_requested_by) are deliberately
-- NOT handled. An anonymous HEARD user cannot have a CRM row (the signup trigger
-- skips contacts for anonymous), an engagement, or an invite (INVITE_BRANDS.heard
-- is null). If one ever does, this raises and the whole sweep rolls back rather
-- than half-deleting a person. That is the safe direction and a loud one.
--
-- Everything else goes by cascade, which is also why this is SQL and not another
-- edge function: delete-user-data is 348 lines of dyad handling (partners,
-- shared engagements, notification emails) and every line of it is about a
-- relationship an anonymous user does not have.

CREATE OR REPLACE FUNCTION public.sweep_stale_anonymous_users(retention_days integer DEFAULT 14)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ids uuid[];
  _count integer;
BEGIN
  -- A zero or negative window would delete every anonymous session including
  -- the one being typed into right now. There is no legitimate caller for that.
  IF retention_days IS NULL OR retention_days < 1 THEN
    RAISE EXCEPTION 'sweep_stale_anonymous_users: retention_days must be >= 1 (got %)', retention_days;
  END IF;

  SELECT array_agg(u.id)
    INTO _ids
  FROM auth.users u
  WHERE u.is_anonymous
    AND GREATEST(
          u.created_at,
          COALESCE(u.last_sign_in_at, u.created_at),
          COALESCE(u.email_change_sent_at, u.created_at),
          COALESCE(
            (SELECT max(m.created_at) FROM public.messages m WHERE m.user_id = u.id),
            u.created_at
          )
        ) < now() - make_interval(days => retention_days);

  _count := COALESCE(array_length(_ids, 1), 0);
  IF _count = 0 THEN
    RETURN 0;
  END IF;

  -- The two NO ACTION references that would otherwise block the delete. Both
  -- keep their row and lose the person, which is the point: cost and error
  -- telemetry survives as an anonymous aggregate.
  UPDATE public.cost_tracking SET user_id = NULL WHERE user_id = ANY(_ids);
  UPDATE public.error_log     SET user_id = NULL WHERE user_id = ANY(_ids);

  -- public.users cascades from this, and everything else cascades from that.
  DELETE FROM auth.users WHERE id = ANY(_ids);

  RAISE NOTICE '[heard] swept % abandoned anonymous session(s) idle over % days', _count, retention_days;
  RETURN _count;
END;
$function$;

-- The PUBLIC-grant class (ORIENT §7; 20260709000000_lock_internal_rpcs). Postgres
-- grants EXECUTE to PUBLIC by default and anon/authenticated inherit it, so
-- without this an unauthenticated caller could POST /rest/v1/rpc/
-- sweep_stale_anonymous_users with retention_days = 1 and delete every anonymous
-- session in the product. NOT granted to service_role either: pg_cron runs it as
-- the owner, and nothing else should ever call it.
REVOKE ALL ON FUNCTION public.sweep_stale_anonymous_users(integer) FROM PUBLIC, anon, authenticated;

-- Daily at 04:20 UTC. `cron.schedule` upserts by job name, so re-running this
-- migration re-points the existing job rather than creating a second one.
SELECT cron.schedule(
  'sweep-stale-anonymous-users',
  '20 4 * * *',
  $$SELECT public.sweep_stale_anonymous_users(14)$$
);
