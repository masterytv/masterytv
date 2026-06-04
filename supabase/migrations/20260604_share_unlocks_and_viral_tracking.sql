-- Migration: share_unlocks table for S0.5.3i
-- Records when a user unlocks a report section via sharing (social or invite)

CREATE TABLE IF NOT EXISTS share_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  method text NOT NULL,  -- 'x', 'facebook', 'linkedin', 'whatsapp', 'reddit', 'threads', 'invite_completion', 'email_invite'
  section_unlocked text NOT NULL DEFAULT 'S5',
  invite_id uuid,  -- Optional: link to decoded_invites for tracking
  created_at timestamptz DEFAULT now()
);

-- RLS: users can only see and create their own unlock records
ALTER TABLE share_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own unlocks"
  ON share_unlocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unlocks"
  ON share_unlocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_share_unlocks_user ON share_unlocks(user_id);

-- Viral tracking table for S0.5.3k
-- Logs invite funnel events: sent → opened → assessment_started → completed → section_unlocked
CREATE TABLE IF NOT EXISTS viral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid,  -- Optional FK to decoded_invites
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,  -- 'invite_sent', 'invite_opened', 'assessment_started', 'assessment_completed', 'section_unlocked', 'social_share'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS: admin-only reads, authenticated inserts
ALTER TABLE viral_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own events
CREATE POLICY "Authenticated users can insert events"
  ON viral_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admin reads via service role (no select policy = service role only)

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_viral_events_invite ON viral_events(invite_id);
CREATE INDEX IF NOT EXISTS idx_viral_events_type ON viral_events(event_type);
CREATE INDEX IF NOT EXISTS idx_viral_events_created ON viral_events(created_at);

-- Ensure decoded_tier column exists on users (may already exist from Stripe webhook work)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'decoded_tier'
  ) THEN
    ALTER TABLE users ADD COLUMN decoded_tier text NOT NULL DEFAULT 'free';
  END IF;
END $$;
