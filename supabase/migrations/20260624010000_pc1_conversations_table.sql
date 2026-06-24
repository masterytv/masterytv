-- =====================================================================
-- PC1 — Multiple named conversations per thread (platform-wide)
-- =====================================================================
-- Applied to cloud (masterytv-website) 2026-06-24 via MCP. conversations.id
-- MATCHES existing messages.conversation_id values (PK is not auto-generated),
-- so messages link by their existing conversation_id with no FK migration.
-- Backfill creates a row per distinct conversation_id (title = first user
-- message). workspace_id per the platform mandate; engagement_id = thread scope.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id            uuid PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id  uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                  REFERENCES public.workspace(id),
  engagement_id uuid REFERENCES public.engagement(id),  -- thread scope; NULL = general
  channel       text NOT NULL DEFAULT 'web',
  title         text,
  archived      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user
  ON public.conversations(user_id, channel, archived, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_engagement
  ON public.conversations(engagement_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations owner all" ON public.conversations
  FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "conversations admin read" ON public.conversations
  FOR SELECT TO public USING (get_auth_user_role() = ANY (ARRAY['admin','superadmin']));

INSERT INTO public.conversations (id, user_id, engagement_id, channel, title, created_at, updated_at)
SELECT DISTINCT ON (m.conversation_id)
  m.conversation_id, m.user_id, m.engagement_id, COALESCE(m.channel, 'web'),
  left(trim((
    SELECT m2.content FROM public.messages m2
    WHERE m2.conversation_id = m.conversation_id AND m2.role = 'user'
    ORDER BY m2.created_at ASC LIMIT 1
  )), 60),
  (SELECT min(created_at) FROM public.messages m3 WHERE m3.conversation_id = m.conversation_id),
  (SELECT max(created_at) FROM public.messages m4 WHERE m4.conversation_id = m.conversation_id)
FROM public.messages m
WHERE m.conversation_id IS NOT NULL AND m.user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
