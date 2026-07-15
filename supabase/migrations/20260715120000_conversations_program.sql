-- Brand isolation for conversations (founder report 2026-07-15: a MasteryTV
-- executive conversation rendered — and could be continued — on relatti.com).
--
-- Conversations were scoped only by dyad thread (engagement_id), so a user
-- with accounts on both brands shared one "general thread" across domains.
-- This adds the program (vertical) to the conversation itself so every read
-- can scope by brand: 'relationship' = Relatti, 'general'/NULL = executive.
-- The coach edge function stamps it at conversation creation from the
-- PC4.4-resolved program (never the raw client string).

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS program text;

-- Backfill from the conversation's own stamped coach messages where present
-- (coach/channel-router stamp metadata.program at write time since PC4.2).
UPDATE conversations c
SET program = sub.program
FROM (
  SELECT DISTINCT ON (m.conversation_id)
         m.conversation_id,
         m.metadata->>'program' AS program
  FROM messages m
  WHERE m.role = 'coach'
    AND COALESCE(m.metadata->>'program', '') <> ''
  ORDER BY m.conversation_id, m.created_at DESC
) sub
WHERE c.id = sub.conversation_id
  AND c.program IS NULL;

-- Everything unstamped predates program stamping and is the executive coach.
UPDATE conversations SET program = 'general' WHERE program IS NULL;

-- Listing scopes by (user, program, updated_at) on every dashboard load.
CREATE INDEX IF NOT EXISTS idx_conversations_user_program
  ON conversations (user_id, program, updated_at DESC);
