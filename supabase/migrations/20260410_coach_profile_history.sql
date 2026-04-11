-- ============================================================
-- Migration: Coach Profile History + Debug Trace Support
-- Sprint: S7 — Coach Debugger
-- Date: 2026-04-10
--
-- Changes:
--   1. Create coach_profile_history table for profile evolution tracking
--   2. Enable RLS on coach_profile_history
--   3. No changes to messages table — debug_trace stored in existing
--      metadata JSONB column
-- ============================================================

-- ── 1. Coach Profile History ──────────────────────────────────
-- Snapshots coach_profiles dimensions after each auto-update.
-- Used by the Profile Evolution chart (debug panel Phase 2).

CREATE TABLE IF NOT EXISTS coach_profile_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Dimensional snapshot (same schema as coach_profiles)
  directness float NOT NULL,
  framing float NOT NULL,
  warmth float NOT NULL,
  autonomy float NOT NULL,
  pacing float NOT NULL,
  evidence_style float NOT NULL,
  accountability float NOT NULL,
  challenge_level float NOT NULL,
  trust_level int NOT NULL,
  confidence float NOT NULL,
  source text NOT NULL,
  
  -- What triggered this snapshot
  message_count int,                    -- total messages at time of update
  signals_applied jsonb DEFAULT '{}'::jsonb,  -- the ProfileSignals that caused the change
  dimensions_changed text[],            -- which dimensions were modified
  
  created_at timestamptz DEFAULT now()
);

-- Index for querying a user's profile evolution over time
CREATE INDEX idx_profile_history_user 
  ON coach_profile_history(user_id, created_at DESC);

-- ── 2. RLS ────────────────────────────────────────────────────
ALTER TABLE coach_profile_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile history
CREATE POLICY "Users can read own profile history"
  ON coach_profile_history FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (Edge Functions) can insert snapshots
-- (Edge Functions use service_role key, which bypasses RLS)

-- ── 3. Comments ───────────────────────────────────────────────
COMMENT ON TABLE coach_profile_history IS 
  'Snapshots of coach_profiles dimensions after each behavioral auto-update. Used for profile evolution visualization.';
COMMENT ON COLUMN coach_profile_history.signals_applied IS 
  'The ProfileSignals from debug-types.ts that triggered this update.';
COMMENT ON COLUMN coach_profile_history.dimensions_changed IS 
  'Array of dimension names that were modified in this update (e.g., {directness, warmth}).';
