-- =====================================================================
-- E8b — Daily Connection Ritual (retention spine)
-- =====================================================================
-- Source of truth : directives/RELATTI_EXPERIENCE.md §5.9 (founder-approved
--                   full MVP, 2026-06-26).
-- Sits on         : the Relatti spine (E1) + shared streak (E8 engagement_activity).
-- Status          : tracked file; APPLY TO CLOUD (lwmadssysqcwbsoiaokc) only on
--                   founder confirm. Additive + idempotent + reversible.
--
-- Shape:
--   • ritual_prompts   — curated question bank (light↔deep), readable by all.
--   • ritual_responses — one answer per user per prompt; engagement_id nullable
--                        (solo users have no dyad). RLS: a user reads ONLY their
--                        own rows — a partner's answer is never directly readable.
--   • ritual_settings  — per-user cadence (default 3×/week, toggle daily).
--
-- Blind-reveal gate (the key design call): pure RLS can't express "reveal the
-- partner's answer ONLY once I've also answered." So all cross-partner reads go
-- through ritual_dyad_reveal() (SECURITY DEFINER), which returns the partner's
-- answer only when BOTH have answered. partner_answered (a bare boolean — the
-- curiosity hook) is always safe to surface. Writes go through
-- ritual_submit_response() (SECURITY DEFINER) so the response + the shared
-- engagement_activity streak row land together, guarded by participation.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ritual_prompts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug  text NOT NULL DEFAULT 'relationship',
  text          text NOT NULL,
  depth         text NOT NULL DEFAULT 'light' CHECK (depth IN ('light','medium','deep')),
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ritual_prompts_active
  ON public.ritual_prompts(program_slug, is_active, sort_order);
-- Stable natural key so the seed below is idempotent on replay.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ritual_prompts_slot
  ON public.ritual_prompts(program_slug, sort_order);

CREATE TABLE IF NOT EXISTS public.ritual_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                  REFERENCES public.workspace(id),
  engagement_id uuid REFERENCES public.engagement(id) ON DELETE CASCADE,  -- null for solo
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prompt_id     uuid NOT NULL REFERENCES public.ritual_prompts(id),
  answer        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, prompt_id)
);
CREATE INDEX IF NOT EXISTS idx_ritual_responses_user
  ON public.ritual_responses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ritual_responses_engagement_prompt
  ON public.ritual_responses(engagement_id, prompt_id);

CREATE TABLE IF NOT EXISTS public.ritual_settings (
  user_id       uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id  uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                  REFERENCES public.workspace(id),
  cadence       text NOT NULL DEFAULT '3x_week' CHECK (cadence IN ('daily','3x_week')),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.ritual_prompts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_settings  ENABLE ROW LEVEL SECURITY;

-- Bank is reference data: readable by any authenticated user; writes via service role only.
DROP POLICY IF EXISTS "ritual_prompts readable by authenticated" ON public.ritual_prompts;
CREATE POLICY "ritual_prompts readable by authenticated" ON public.ritual_prompts
  FOR SELECT TO public USING (auth.role() = 'authenticated');

-- Responses: a user reads ONLY their own answers. Partner answers are reached
-- exclusively via ritual_dyad_reveal() (blind-reveal gate). Writes via
-- ritual_submit_response() (SECURITY DEFINER) — no direct user write policy.
DROP POLICY IF EXISTS "ritual_responses readable by self" ON public.ritual_responses;
CREATE POLICY "ritual_responses readable by self" ON public.ritual_responses
  FOR SELECT TO public USING (
    user_id = auth.uid()
    OR get_auth_user_role() = ANY (ARRAY['admin','superadmin'])
  );

-- Settings: each user manages their own cadence.
DROP POLICY IF EXISTS "ritual_settings self read"   ON public.ritual_settings;
DROP POLICY IF EXISTS "ritual_settings self write"  ON public.ritual_settings;
DROP POLICY IF EXISTS "ritual_settings self update" ON public.ritual_settings;
CREATE POLICY "ritual_settings self read" ON public.ritual_settings
  FOR SELECT TO public USING (user_id = auth.uid());
CREATE POLICY "ritual_settings self write" ON public.ritual_settings
  FOR INSERT TO public WITH CHECK (user_id = auth.uid());
CREATE POLICY "ritual_settings self update" ON public.ritual_settings
  FOR UPDATE TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- RPC: submit a response (+ shared streak row for dyads)
-- ─────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so the response and the engagement_activity streak row land
-- together without a user-facing write policy on either table. Guarded: when an
-- engagement is supplied, the caller must be a participant. Idempotent — a
-- second submit for the same (user, prompt) is a no-op (the first answer stands,
-- so a partner can't be shown a moving target after reveal).
CREATE OR REPLACE FUNCTION public.ritual_submit_response(
  p_prompt_id     uuid,
  p_answer        text,
  p_engagement_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_answer IS NULL OR length(btrim(p_answer)) = 0 THEN
    RAISE EXCEPTION 'empty answer';
  END IF;
  IF p_engagement_id IS NOT NULL AND NOT public.is_engagement_participant(p_engagement_id) THEN
    RAISE EXCEPTION 'not a participant of this engagement';
  END IF;

  INSERT INTO ritual_responses (engagement_id, user_id, prompt_id, answer)
  VALUES (p_engagement_id, v_me, p_prompt_id, btrim(p_answer))
  ON CONFLICT (user_id, prompt_id) DO NOTHING;

  -- Feed the shared forgiving streak (E8) for dyads.
  IF p_engagement_id IS NOT NULL THEN
    INSERT INTO engagement_activity (engagement_id, user_id)
    VALUES (p_engagement_id, v_me)
    ON CONFLICT (engagement_id, user_id, activity_date) DO NOTHING;
  END IF;
END;
$fn$;

-- ─────────────────────────────────────────────────────────────────────
-- RPC: blind-reveal gate
-- ─────────────────────────────────────────────────────────────────────
-- Returns, for the caller, the reveal state of one prompt within their dyad:
--   • partner_answered : boolean — safe to show always (the curiosity hook).
--   • both_answered    : boolean.
--   • my_answer        : the caller's own answer (or null).
--   • partner_answer   : the partner's answer ONLY when BOTH have answered;
--                        null otherwise (the blind-reveal rule).
-- The caller must be a participant of p_engagement_id, else null.
CREATE OR REPLACE FUNCTION public.ritual_dyad_reveal(
  p_engagement_id uuid,
  p_prompt_id     uuid
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_me             uuid := auth.uid();
  v_partner_id     uuid;
  v_my_answer      text;
  v_partner_answer text;
  v_both           boolean;
BEGIN
  IF v_me IS NULL OR NOT public.is_engagement_participant(p_engagement_id) THEN
    RETURN NULL;
  END IF;

  SELECT user_id INTO v_partner_id
    FROM participant
   WHERE engagement_id = p_engagement_id
     AND user_id IS NOT NULL
     AND user_id <> v_me
   LIMIT 1;

  SELECT answer INTO v_my_answer
    FROM ritual_responses
   WHERE prompt_id = p_prompt_id AND user_id = v_me;

  IF v_partner_id IS NOT NULL THEN
    SELECT answer INTO v_partner_answer
      FROM ritual_responses
     WHERE prompt_id = p_prompt_id AND user_id = v_partner_id;
  END IF;

  v_both := (v_my_answer IS NOT NULL) AND (v_partner_answer IS NOT NULL);

  RETURN jsonb_build_object(
    'partner_answered', v_partner_answer IS NOT NULL,
    'both_answered',    v_both,
    'my_answer',        v_my_answer,
    -- Blind reveal: only surface the partner's words once the caller has answered too.
    'partner_answer',   CASE WHEN v_both THEN v_partner_answer ELSE NULL END
  );
END;
$fn$;

-- Signed-in users only; both RPCs additionally self-guard via auth.uid()/
-- participation. REVOKE FROM PUBLIC (not just anon) so the implicit PUBLIC grant
-- doesn't leave them anon-callable (Supabase linter 0028/0029).
REVOKE EXECUTE ON FUNCTION public.ritual_submit_response(uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ritual_dyad_reveal(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.ritual_submit_response(uuid, text, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.ritual_dyad_reveal(uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Seed — curated bank (~24), light↔deep mix, neutral-third-voice framing.
-- Ordered to open light (build the habit, Fogg) and deepen gradually; the daily
-- mechanic walks sort_order. Idempotent via a stable natural key (text).
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.ritual_prompts (text, depth, sort_order) VALUES
  ('What''s one small thing I did this week that made you feel loved?', 'light', 10),
  ('If we had a completely free Saturday together, what would your ideal version of it look like?', 'light', 20),
  ('What''s a tiny everyday moment with me that you secretly look forward to?', 'light', 30),
  ('What''s something you''re grateful for about us right now?', 'medium', 40),
  ('When do you feel closest to me — and what''s happening in those moments?', 'medium', 50),
  ('What''s a way I could show up for you this week that would actually help?', 'medium', 60),
  ('What''s something you wish we did more of together?', 'light', 70),
  ('When you''re stressed, what do you most need from me — space, reassurance, or a hand to hold?', 'deep', 80),
  ('What''s a moment from early in our relationship that you still think about?', 'medium', 90),
  ('What''s one thing you''d love me to understand about you that I might not fully get yet?', 'deep', 100),
  ('What does feeling safe with me look like for you?', 'deep', 110),
  ('What''s a small ritual or habit you''d like us to start together?', 'light', 120),
  ('When we disagree, what helps you feel heard — even before anything''s resolved?', 'deep', 130),
  ('What''s something you''re proud of us for getting through?', 'medium', 140),
  ('What''s a way I sometimes accidentally make you feel unseen, so I can watch for it?', 'deep', 150),
  ('What''s a dream you have that you''d like me to be part of?', 'medium', 160),
  ('What''s the most reassuring thing I could say to you on a hard day?', 'deep', 170),
  ('What''s something fun or a little silly you''d like to try with me?', 'light', 180),
  ('When you picture us a year from now, what''s one thing you hope is true?', 'medium', 190),
  ('What''s a fear about us that you''ve never quite said out loud?', 'deep', 200),
  ('What''s a way your family showed (or didn''t show) love that still shapes what you need from me?', 'deep', 210),
  ('What''s one thing I do that you''d genuinely miss if it stopped?', 'light', 220),
  ('What''s a topic we tend to avoid that you wish we could talk about more easily?', 'deep', 230),
  ('What would "us at our best" look like, in your words?', 'medium', 240)
ON CONFLICT (program_slug, sort_order) DO NOTHING;

-- =====================================================================
-- END E8b RITUAL
-- =====================================================================
