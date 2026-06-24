-- =====================================================================
-- E8 — Shared ritual / streak: per-participant daily activity
-- =====================================================================
-- Applied to cloud (masterytv-website) 2026-06-24 via MCP. Readable by BOTH
-- partners (engagement-shared RLS via is_engagement_participant) so the streak
-- is genuinely shared; written by the coach (service role) on each message.
-- Privacy-safe: records only "user X active on date D", never content.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.engagement_activity (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                  REFERENCES public.workspace(id),
  engagement_id uuid NOT NULL REFERENCES public.engagement(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc'))::date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, user_id, activity_date)
);
CREATE INDEX IF NOT EXISTS idx_engagement_activity_engagement
  ON public.engagement_activity(engagement_id, activity_date DESC);

ALTER TABLE public.engagement_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity readable by participants" ON public.engagement_activity
  FOR SELECT TO public USING (
    public.is_engagement_participant(engagement_id)
    OR get_auth_user_role() = ANY (ARRAY['admin','superadmin'])
  );
