-- ============================================================
-- Migration: Adaptive Narrative Voice — Version Storage + Feedback
-- Sprint: S11 — Narrative Voices
-- Date: 2026-06-01
--
-- Changes:
--   1. Add voice_profile JSONB column to assessment_reports
--   2. Create assessment_report_versions table for voice rewrites
--   3. Create voice_feedback table for A/B preference data
--   4. Enable RLS on all new objects
-- ============================================================

-- ── 1. Voice Profile on assessment_reports ───────────────────
-- Stores the auto-classified voice profile for the original report.
-- Written once at generation time. Small JSONB (~200 bytes).

ALTER TABLE assessment_reports
ADD COLUMN IF NOT EXISTS voice_profile jsonb DEFAULT NULL;

COMMENT ON COLUMN assessment_reports.voice_profile IS
  'StoredVoiceProfile JSONB — voiceId, active modifiers, classification input. Written at report generation.';

-- ── 2. Assessment Report Versions ────────────────────────────
-- Each voice rewrite creates a new row here (ADR-06).
-- Avoids bloating assessment_reports with ~20-25KB per version.

CREATE TABLE IF NOT EXISTS assessment_report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES assessment_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Which voice this version uses
  voice_id text NOT NULL,

  -- Full section content (same schema as assessment_reports.sections)
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Generation progress tracking (for polling during async generation)
  status text NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'complete', 'failed')),
  sections_completed int NOT NULL DEFAULT 0,
  total_sections int NOT NULL DEFAULT 12,

  created_at timestamptz DEFAULT now(),
  completed_at timestamptz DEFAULT NULL
);

-- One version per voice per report (prevents duplicate rewrites)
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_versions_unique
  ON assessment_report_versions(report_id, voice_id);

-- Fast lookup: "get all versions for this report"
CREATE INDEX IF NOT EXISTS idx_report_versions_report
  ON assessment_report_versions(report_id, created_at DESC);

-- Fast lookup: "get all versions for this user" (for account page)
CREATE INDEX IF NOT EXISTS idx_report_versions_user
  ON assessment_report_versions(user_id, created_at DESC);

-- ── 3. Voice Feedback ────────────────────────────────────────
-- Collects A/B preference data when users try different voices.
-- Used to improve voice classification over time.

CREATE TABLE IF NOT EXISTS voice_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- What they started with and what they tried
  original_voice_id text NOT NULL,
  rewrite_voice_id text,

  -- Which voice they preferred (null = no preference expressed)
  preferred_voice_id text,

  -- Optional free-text feedback
  free_text text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_feedback_user
  ON voice_feedback(user_id, created_at DESC);

-- ── 4. RLS ────────────────────────────────────────────────────

ALTER TABLE assessment_report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_feedback ENABLE ROW LEVEL SECURITY;

-- Users can read their own versions
CREATE POLICY "Users can read own report versions"
  ON assessment_report_versions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "Users can read own voice feedback"
  ON voice_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own voice feedback"
  ON voice_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role (Edge Functions) handles insert/update on versions
-- via service_role key, which bypasses RLS

-- ── 5. Comments ───────────────────────────────────────────────

COMMENT ON TABLE assessment_report_versions IS
  'Stores full section content for each voice rewrite of a Decoded report. One row per voice per report (ADR-06).';
COMMENT ON COLUMN assessment_report_versions.voice_id IS
  'VoiceId string (intellectual, adventurer, connector, steward, challenger, sensitive).';
COMMENT ON COLUMN assessment_report_versions.status IS
  'Generation progress: generating → complete/failed. Polled by the client for progress UI.';

COMMENT ON TABLE voice_feedback IS
  'A/B preference data collected when users try different narrative voices. Used to improve classification accuracy.';
