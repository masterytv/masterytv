-- PC5.2 + PC5.4 — brand/program attribution stamps (PLATFORM_SPRINT.md PC5).
--
-- users.signup_brand   — which brand's surface the account was created on
--                        ('masterytv' | 'relatti' | future tenants). Stamped at
--                        creation: password signups carry it in signUp metadata
--                        (read here by handle_new_user); OAuth/magic-link signups
--                        are stamped by /auth/callback from the request host,
--                        guarded to freshly-created rows. NULL = pre-stamp account;
--                        the admin UI derives a best-effort brand for those
--                        (participant/decoded_invites rows → relatti).
--
-- crisis_flags.program — the resolved program at detection time
--                        ('relationship' | 'general' | …). NULL is expected for
--                        channel-router Tier-1 flags: the keyword hard-stop runs
--                        before program resolution (step 2.5) by design — safety
--                        never waits on attribution.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS signup_brand text;

ALTER TABLE public.crisis_flags
  ADD COLUMN IF NOT EXISTS program text;

COMMENT ON COLUMN public.users.signup_brand IS
  'Brand surface the account signed up on (masterytv | relatti | …). NULL = created before 2026-07-14 stamping.';
COMMENT ON COLUMN public.crisis_flags.program IS
  'Resolved program at detection time. NULL = channel Tier-1 (keyword hard-stop precedes program resolution) or pre-stamp row.';

-- handle_new_user: stamp signup_brand from signUp metadata (password path).
-- Body is the live version + the signup_brand read; validation keeps
-- client-supplied metadata from writing garbage (slug shape only, else NULL).
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
  -- Extract user info from auth metadata
  _user_email := NEW.email;
  _user_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(_user_email, '@', 1)
  );

  -- PC5.2: brand the signup happened on (client metadata; OAuth signups have
  -- none here — /auth/callback stamps those from the request host instead).
  _signup_brand := lower(NEW.raw_user_meta_data ->> 'signup_brand');
  IF _signup_brand IS NULL OR _signup_brand !~ '^[a-z0-9_-]{1,32}$' THEN
    _signup_brand := NULL;
  END IF;

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
