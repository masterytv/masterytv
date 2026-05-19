# Decoded — Database Schema

> **Version:** 1.0
> **Date:** May 19, 2026
> **Status:** 🟡 Specification — Not yet applied
> **Authority:** This document is the source of truth for all Decoded table definitions. See DECODED_INDEX.md for the document map.
> **References:** DECODED_PRD.md §4.1, §4.2, §4.4, §6.1, §7.2

---

## Design Principles

1. **Auth-first** — Every table links to `auth.users(id)`. No anonymous sessions.
2. **Per-question persistence** — `assessment_progress` stores JSONB state on every answer.
3. **RLS everywhere** — Users access only their own data. No exceptions.
4. **JSONB for flexibility** — Responses, scores, and report sections stored as JSONB for schema-free instrument evolution.
5. **Soft deletes** — No hard deletes on user data. Use `deleted_at` timestamps where needed.

---

## Tables

### 1. `assessments`

Primary record for each assessment attempt.

```sql
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  -- Adaptive branching state
  current_layer TEXT NOT NULL DEFAULT 'core', -- 'core', 'adaptive', 'depth'
  current_instrument TEXT,
  current_item_index INTEGER DEFAULT 0,
  -- Metadata
  total_items_presented INTEGER DEFAULT 0,
  total_time_seconds INTEGER,
  adaptive_triggers JSONB DEFAULT '{}', -- which adaptive instruments were triggered and why
  -- Abandonment tracking
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  abandonment_email_sent BOOLEAN DEFAULT FALSE,
  -- Versioning
  instrument_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assessments"
  ON public.assessments FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_assessments_user_id ON public.assessments(user_id);
CREATE INDEX idx_assessments_abandonment ON public.assessments(last_active_at, completed_at)
  WHERE completed_at IS NULL AND abandonment_email_sent = FALSE;
```

---

### 2. `assessment_progress`

Per-question state persistence. Updated on every answer. Enables resume-on-return.

```sql
CREATE TABLE public.assessment_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Current position
  current_layer TEXT NOT NULL DEFAULT 'core',
  current_instrument TEXT NOT NULL,
  current_item_index INTEGER NOT NULL DEFAULT 0,
  -- Accumulated responses (JSONB keyed by instrument_id.item_index)
  responses JSONB NOT NULL DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.assessment_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own progress"
  ON public.assessment_progress FOR ALL
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_progress_assessment ON public.assessment_progress(assessment_id);
CREATE INDEX idx_progress_user ON public.assessment_progress(user_id);

-- Unique: one progress record per assessment
CREATE UNIQUE INDEX idx_progress_unique ON public.assessment_progress(assessment_id);
```

**JSONB `responses` format:**
```json
{
  "ipip50.1": { "value": 4, "answered_at": "2026-06-01T12:00:00Z" },
  "ipip50.2": { "value": 2, "answered_at": "2026-06-01T12:00:05Z" },
  "ecr_r_short.1": { "value": 5, "answered_at": "2026-06-01T12:10:00Z" }
}
```

---

### 3. `assessment_responses`

Finalized raw responses. Written once on assessment completion from `assessment_progress`.

```sql
CREATE TABLE public.assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id TEXT NOT NULL, -- e.g., 'ipip50', 'ecr_r_short', 'gad7'
  item_index INTEGER NOT NULL, -- 0-based within instrument
  item_key TEXT NOT NULL, -- e.g., 'ipip50_q1', 'ecr_r_anxiety_1'
  response_value INTEGER NOT NULL, -- Likert value (1-5, 1-7, etc.)
  response_time_ms INTEGER, -- time to answer in milliseconds
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own responses"
  ON public.assessment_responses FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own responses"
  ON public.assessment_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_responses_assessment ON public.assessment_responses(assessment_id);
CREATE INDEX idx_responses_instrument ON public.assessment_responses(assessment_id, instrument_id);
CREATE UNIQUE INDEX idx_responses_unique ON public.assessment_responses(assessment_id, instrument_id, item_index);
```

---

### 4. `assessment_scores`

Computed scores per instrument. Written by scoring engine after assessment completion.

```sql
CREATE TABLE public.assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id TEXT NOT NULL,
  -- Scoring results
  total_score NUMERIC,
  subscale_scores JSONB DEFAULT '{}', -- e.g., {"anxiety": 3.2, "avoidance": 1.8}
  percentile_scores JSONB DEFAULT '{}', -- e.g., {"openness": 72, "conscientiousness": 45}
  interpretation JSONB DEFAULT '{}', -- e.g., {"attachment_style": "secure", "severity": "mild"}
  raw_score_details JSONB DEFAULT '{}', -- full scoring breakdown for audit
  -- Metadata
  scoring_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own scores"
  ON public.assessment_scores FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "System can insert scores"
  ON public.assessment_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_scores_assessment ON public.assessment_scores(assessment_id);
CREATE INDEX idx_scores_user_instrument ON public.assessment_scores(user_id, instrument_id);
CREATE UNIQUE INDEX idx_scores_unique ON public.assessment_scores(assessment_id, instrument_id);
```

---

### 5. `assessment_reports`

Cached AI-generated report sections. Keyed by RS-ID.

```sql
CREATE TABLE public.assessment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Report content (keyed by section ID)
  sections JSONB NOT NULL DEFAULT '{}', -- { "RS01": {...}, "RS02": {...}, ... }
  -- Archetype
  archetype_base TEXT, -- e.g., "Architect"
  archetype_sublabel TEXT, -- e.g., "Designer with Compassion"
  archetype_tagline TEXT, -- e.g., "You build worlds others can inhabit"
  decoded_score INTEGER, -- composite 0-100
  -- Generation metadata
  generation_model TEXT NOT NULL DEFAULT 'gpt-4o',
  generation_cost_usd NUMERIC,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.assessment_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports"
  ON public.assessment_reports FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "System can insert reports"
  ON public.assessment_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_reports_assessment ON public.assessment_reports(assessment_id);
CREATE INDEX idx_reports_user ON public.assessment_reports(user_id);
```

**JSONB `sections` format:**
```json
{
  "RS01": {
    "title": "You, Decoded",
    "content_html": "<h2>You, Decoded</h2><p>...</p>",
    "content_markdown": "## You, Decoded\n\n...",
    "coach_question": "What would change if you trusted your instincts as much as your analysis?",
    "data_viz": { "type": "summary_table", "data": {...} },
    "word_count": 850,
    "min_tier": "free"
  },
  "RS08": {
    "title": "Your Emotional Landscape",
    "content_html": "...",
    "min_tier": "insight"
  }
}
```

---

### 6. `assessment_profiles`

Structured coaching summary. Used by the coaching engine as context injection.

```sql
CREATE TABLE public.assessment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Structured coaching summary
  archetype TEXT, -- "Architect — Designer with Compassion"
  top_strengths TEXT[] DEFAULT '{}', -- ["Analytical depth", "Emotional awareness", ...]
  growth_edges TEXT[] DEFAULT '{}', -- ["Perfectionism under stress", ...]
  attachment_style TEXT, -- "secure", "anxious", "avoidant", "disorganized"
  big_five_summary JSONB DEFAULT '{}', -- { "O": 72, "C": 45, "E": 60, "A": 55, "N": 80 }
  coaching_priorities TEXT[] DEFAULT '{}', -- ordered list of recommended coaching topics
  key_insights TEXT[] DEFAULT '{}', -- cross-instrument synthesis bullets
  -- Coach handoff
  coach_opener TEXT, -- pre-generated personalized first message
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.assessment_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profiles"
  ON public.assessment_profiles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "System can insert profiles"
  ON public.assessment_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_profiles_user ON public.assessment_profiles(user_id);
CREATE UNIQUE INDEX idx_profiles_assessment ON public.assessment_profiles(assessment_id);
```

---

### 7. `coach_message_usage`

Tracks daily/weekly/monthly coach message counts for rate limiting.

```sql
CREATE TABLE public.coach_message_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.coach_message_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage"
  ON public.coach_message_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes
CREATE UNIQUE INDEX idx_usage_unique ON public.coach_message_usage(user_id, period_type, period_start);
```

**Rate limit rules (enforced in coaching Edge Function):**
| Tier | Limit | Period |
|:---|:---|:---|
| Free | 5 | daily |
| Insight | 50 | weekly |
| Growth | 300 | monthly |
| Mastery | unlimited | — |

---

## pg_cron Jobs

```sql
-- Abandonment recovery check (every hour)
SELECT cron.schedule(
  'decoded-abandonment-check',
  '0 * * * *', -- hourly
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/decoded-abandonment-check',
    headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
  );
  $$
);

-- Orphaned progress cleanup (weekly)
SELECT cron.schedule(
  'decoded-cleanup-orphans',
  '0 3 * * 0', -- Sunday 3am
  $$
  DELETE FROM public.assessment_progress
  WHERE updated_at < NOW() - INTERVAL '90 days'
    AND assessment_id IN (
      SELECT id FROM public.assessments WHERE completed_at IS NULL
    );
  $$
);
```

---

## Migration Order

Apply in this order during Sprint 0.1:

1. `001_decoded_assessments.sql` — `assessments` table
2. `002_decoded_progress.sql` — `assessment_progress` table
3. `003_decoded_responses.sql` — `assessment_responses` table
4. `004_decoded_scores.sql` — `assessment_scores` table
5. `005_decoded_reports.sql` — `assessment_reports` table
6. `006_decoded_profiles.sql` — `assessment_profiles` table
7. `007_decoded_message_usage.sql` — `coach_message_usage` table
8. `008_decoded_cron_jobs.sql` — pg_cron schedules
