-- I5.1 — let `handle_new_user` survive an ANONYMOUS signup.
--
-- ⚠️ NOT YET APPLIED. This rewrites the trigger that every brand's signup runs
-- through, so it wants a founder read before it goes to prod. Until it is
-- applied, `supabase.auth.signInAnonymously()` fails at the trigger and the
-- pre-account box falls back to the signup card with the person's text held.
--
-- ─── WHY THE TRIGGER BREAKS TODAY ────────────────────────────────────────
--
-- An anonymous auth user has `email IS NULL`. The current function
-- unconditionally inserts a `contacts` row keyed on that email, and
-- `contacts.email`, `users.email` and `users.name` are all NOT NULL — so the
-- INSERT raises and the signup fails outright. Verified against prod
-- 2026-08-13 (`auth.users` had 0 anonymous rows, so this path has never run).
--
-- ─── THE TWO DECISIONS IN HERE ───────────────────────────────────────────
--
-- 1. **No CRM row for an anonymous user.** `contacts` is the marketing spine:
--    a row there is a lead, it carries `status = 'free_member'`, and it emits a
--    `trial_started` event. Somebody who has typed one thing into a box and
--    given no email is not a lead, and for THIS vertical the point is sharper
--    than tidiness — a contact record is the beginning of an audience, and the
--    people this serves have usually been handled by every system they tried
--    to tell. `users.contact_id` is already nullable, so the row simply has
--    none until they choose to be reachable. The claim flow creates the
--    contact at the moment they hand over an email, which is the honest place
--    for it.
--
-- 2. **Synthetic values instead of relaxing NOT NULL.** Dropping NOT NULL on
--    `users.email` would make a column that ~18 months of code treats as
--    always-present suddenly nullable, and the failures would be scattered and
--    quiet. Instead:
--      * `email` = `<uuid>@anonymous.invalid`. `.invalid` is reserved by
--        RFC 2606 and can never resolve, so if some code path ever does try to
--        mail an anonymous user it hard-bounces at our own sender instead of
--        reaching a stranger. Unique per user, so the unique index is happy.
--      * `name`  = the empty string, NOT a placeholder like 'Guest'. This is
--        load-bearing: `_shared/prompt-layers.ts` renders
--        `- Name: ${user.name || "Not set"}`, so '' renders "Not set" and the
--        coach is never told this person is called Guest. A placeholder name
--        would end up spoken back to somebody in the middle of describing the
--        strangest hour of their life.
--
-- Everything else about the non-anonymous path is byte-identical to the
-- function this replaces.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _contact_id uuid;
  _user_name text;
  _user_email text;
  _signup_brand text;
BEGIN
  -- PC5.2: brand the signup happened on (client metadata; OAuth signups have
  -- none here — /auth/callback stamps those from the request host instead).
  -- Read before the branch: an anonymous signup carries it too, because
  -- signInAnonymously() can pass options.data and the box does.
  _signup_brand := lower(NEW.raw_user_meta_data ->> 'signup_brand');
  IF _signup_brand IS NULL OR _signup_brand !~ '^[a-z0-9_-]{1,32}$' THEN
    _signup_brand := NULL;
  END IF;

  -- ── Anonymous (I5.1 pre-account box): account rows only, no CRM ──
  IF COALESCE(NEW.is_anonymous, false) THEN
    INSERT INTO public.users (id, email, name, contact_id, signup_brand)
    VALUES (NEW.id, NEW.id::text || '@anonymous.invalid', '', NULL, _signup_brand);

    INSERT INTO public.coach_profiles (user_id) VALUES (NEW.id);

    INSERT INTO public.onboarding_state (user_id, current_step)
    VALUES (NEW.id, 'signup');

    RETURN NEW;
  END IF;

  -- ── Ordinary signup (unchanged) ──
  _user_email := NEW.email;
  _user_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(_user_email, '@', 1)
  );

  -- 1. Upsert contact: if they were a newsletter lead, promote them
  INSERT INTO public.contacts (email, name, source, status)
  VALUES (_user_email, _user_name, 'coachapp', 'free_member')
  ON CONFLICT (email) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, contacts.name),
    status = 'free_member',
    updated_at = now()
  RETURNING id INTO _contact_id;

  -- 2. Create users row
  INSERT INTO public.users (id, email, name, contact_id, signup_brand)
  VALUES (NEW.id, _user_email, _user_name, _contact_id, _signup_brand);

  -- 3. Update contacts with converted_user_id backlink
  UPDATE public.contacts
  SET converted_user_id = NEW.id
  WHERE id = _contact_id;

  -- 4. Create coach_profiles row with defaults
  INSERT INTO public.coach_profiles (user_id)
  VALUES (NEW.id);

  -- 5. Create onboarding_state row
  INSERT INTO public.onboarding_state (user_id, current_step)
  VALUES (NEW.id, 'signup');

  -- 6. Log the trial_started event
  INSERT INTO public.contact_events (contact_id, event_type, metadata)
  VALUES (_contact_id, 'trial_started', jsonb_build_object(
    'user_id', NEW.id,
    'source', COALESCE(NEW.raw_user_meta_data ->> 'provider', 'magic_link')
  ));

  RETURN NEW;
END;
$function$;
