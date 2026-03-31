# Architecture Document — Mastery Coach App

> **Author:** Thomas Wood + Antigravity Orchestrator
> **Date:** March 30, 2026 (updated March 31, 2026)
> **Version:** 1.2
> **Status:** ✅ Gate 2 Approved (2026-03-30)
> **Source:** [PRD.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/PRD.md) (Gate 1 ✅)
> **Companion Docs:**
> - [COACHING_BRAIN.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COACHING_BRAIN.md) — AI decision-making architecture (3-layer brain map)
> - [COACHING_GUARDRAILS.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COACHING_GUARDRAILS.md) — Authoritative intervention safety rules
> **Methodology:** BMAD + Antigravity Method (Phase 2 — Architecture)

---

## 1. Architecture Overview & Principles

### 1.1 System Summary

Mastery Coach is a proactive, multi-channel AI coaching service built on a **single-platform architecture** (Supabase) with a Next.js web dashboard. The coaching engine uses direct LLM API calls with dynamic prompt assembly — no agent frameworks.

### 1.2 Architecture Principles

| Principle | Rationale |
|:---|:---|
| **Supabase as single source of truth** | One platform for DB, Auth, RLS, vectors, cron, Edge Functions, Realtime. Reduces ops for a team of 1 + AI. |
| **No agent frameworks** | No LangChain, LlamaIndex, CrewAI. Direct API calls give us full control over prompt assembly — our core IP. |
| **Channel-agnostic message router** | Every message (email, Telegram, web) is normalized to a unified format before reaching the coaching engine. Adding channels = adding adapters, not rewriting logic. |
| **UX-first decisions** | When evaluating implementation options, user experience is the primary constraint — not cost or technical simplicity. (GEMINI.md §3C) |
| **Dual-LLM strategy** | Claude 3.5 Sonnet for real-time coaching (best instruction-following). GPT-4o-mini for async work (cheaper for extraction, summarization). |
| **Progressive enrichment** | Start with minimal data, build profile over time. Never block the user — enrich in background. |
| **Cost-aware by design** | Every LLM call logged with token counts and costs. Admin dashboard shows cost breakdown by user/feature/model. |

### 1.3 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER TOUCHPOINTS                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Email   │  │ Telegram │  │ Web Chat │  │   Web    │    │
│  │ (Resend) │  │   Bot    │  │   (RT)   │  │Dashboard │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
└───────┼──────────────┼──────────────┼──────────────┼─────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│           MESSAGE ROUTER (Edge Function)                     │
│  Normalize → Authenticate → Rate Limit → Route              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         💬 MICRO: COACHING ENGINE (Per-Message)               │
│                                                               │
│  ┌─ LAYER 1: FRAMEWORK (per-challenge) ──────────────────┐  │
│  │ Match message to active challenge → load framework     │  │
│  │ + current phase. Persists across sessions.             │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         ▼                                     │
│  ┌─ LAYER 2: INTERVENTION (Heron's 6 Categories) ────────┐  │
│  │ Prescriptive|Informative|Confronting|Cathartic|        │  │
│  │ Catalytic|Supportive — biased by Autonomy + Challenge  │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         ▼                                     │
│  ┌─ LAYER 3: DELIVERY (6 style dimensions) ──────────────┐  │
│  │ Directness + Framing + Warmth + Pacing                 │  │
│  │ + Evidence Style + Accountability                       │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         ▼                                     │
│  ┌─ PROMPT ASSEMBLER ────────────────────────────────────┐  │
│  │ Persona + Challenge/Framework + Intervention +         │  │
│  │ Profile + Entities + Style + Memory + Agenda + Safety  │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         ▼                                     │
│  ┌─ LLM (Claude 3.5 Sonnet) ────────────────────────────┐  │
│  │ → Coaching response + structured metadata              │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         ▼                                     │
│  ┌─ POST-PROCESSING (async) ─────────────────────────────┐  │
│  │ Post-Processor (GPT-4o-mini): facts, commits, sentiment│  │
│  │ Entity Extractor (GPT-4o): people, goals, fears, etc.  │  │
│  │ → Feeds back to MESO + MACRO layers                    │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                       │ extractions feed ↑
                       ▼                  │
┌─────────────────────────────────────────────────────────────┐
│  📋 MESO: SESSION PLANNER (Weekly, GPT-4o)                   │
│  Review week → Assess coaching state → Plan next frontier   │
│  → Generate weekly coaching session + update coaching agenda │
├─────────────────────────────────────────────────────────────┤
│  🧠 MACRO: ARC STRATEGIST (Monthly, GPT-4o)                  │
│  Detect arc phase → Generate progress reviews               │
│  → Update framework tiers available                         │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE                                   │
│  ┌──────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐     │
│  │ Auth │ │Postgres│ │pgvector│ │pg_cron │ │Realtime │     │
│  └──────┘ └────────┘ └────────┘ └────────┘ └─────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack & Versions

| Layer | Technology | Version | Why |
|:---|:---|:---|:---|
| **Database** | Supabase (Postgres) | 15+ | Single platform: DB + Auth + RLS + cron + vectors + Realtime |
| **Vector Search** | pgvector | 0.7+ | Semantic memory retrieval, native Postgres extension |
| **Backend** | Supabase Edge Functions (Deno) | Deno 1.40+ | Serverless, co-located with DB, TypeScript native |
| **Frontend** | Next.js (App Router) | 14+ | Existing stack, SSR, React Server Components |
| **Styling** | Tailwind CSS + Framer Motion | v4 / v11 | Premium aesthetic per GEMINI.md §3B |
| **UI Components** | shadcn/ui | latest | Accessible primitives, matches our design system |
| **State Machine** | XState | 5+ | Onboarding flow state management |
| **Primary LLM** | Claude 3.5 Sonnet (Anthropic) | claude-3-5-sonnet-20241022 | Best instruction-following for coaching persona |
| **Async LLM** | GPT-4o-mini (OpenAI) | gpt-4o-mini-2024-07-18 | Cheap for extraction, summarization, profile updates |
| **Embeddings** | text-embedding-3-small (OpenAI) | 1536d | Battle-tested, good quality/cost, pgvector compatible |
| **Email** | Resend | latest | mail.masterytv.com, free 3K/mo, clean API |
| **Messaging** | Telegram Bot API | latest | Free, webhook-based, rich formatting |
| **Payments** | Stripe | latest | Checkout, subscriptions, webhooks |
| **Website Scraping** | Firecrawl | latest | LLM-ready markdown/JSON, AI extraction, 500 free credits |
| **LinkedIn Data** | LinkdAPI | v1 | PAYG credits, structured JSON, no LinkedIn account needed |
| **AI Tool KB Refresh** | Perplexity API | latest | Weekly refresh of AI tools database |
| **Fact Grounding** | Perplexity Sonar API | `sonar` | Real-time factual grounding for Informative interventions (COACHING_GUARDRAILS.md §2) |
| **Web Chat Sync** | Supabase Realtime | latest | WebSocket push for chat UI updates |
| **Hosting** | Vercel (dashboard) + Supabase (everything else) | — | Minimal ops |

---

## 3. Database Schema

### 3.1 Core Tables

```sql
-- ============================================================
-- USERS — Core user record, supports multi-tenancy
-- ============================================================
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  linkedin_url text,
  website_url text,
  telegram_chat_id text,
  timezone text DEFAULT 'America/New_York',
  preferred_channel text DEFAULT 'email'
    CHECK (preferred_channel IN ('email', 'telegram', 'web')),
  morning_briefing_time time DEFAULT '08:00',
  subscription_tier text DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'core', 'premium')),
  stripe_customer_id text,
  stripe_subscription_id text,
  ai_tools jsonb DEFAULT '[]'::jsonb,        -- discovered during coaching, not onboarding
  daily_message_count int DEFAULT 0,
  daily_message_reset_at date,
  org_id uuid REFERENCES organizations(id),   -- B2B2C (Phase 3)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe ON users(stripe_customer_id);
CREATE INDEX idx_users_org ON users(org_id);

-- ============================================================
-- COACH PROFILES — 8-dimension communication style per user
-- ============================================================
CREATE TABLE coach_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  -- Personality dimensions (0.0 to 1.0)
  directness float DEFAULT 0.5,       -- 0=diplomatic, 1=blunt
  framing float DEFAULT 0.6,          -- 0=risk/prevention, 1=opportunity
  warmth float DEFAULT 0.6,           -- 0=challenge-first, 1=relationship-first
  autonomy float DEFAULT 0.5,         -- 0=prescriptive, 1=socratic
  pacing float DEFAULT 0.5,           -- 0=spacious, 1=high-frequency
  evidence_style float DEFAULT 0.5,   -- 0=data/logic, 1=stories
  accountability float DEFAULT 0.5,   -- 0=internal trust, 1=external push
  challenge_level float DEFAULT 0.4,  -- 0=comfort zone, 1=stretch zone
  -- Source tracking
  source text DEFAULT 'default'
    CHECK (source IN ('default', 'self_reported', 'behavioral', 'blended')),
  confidence float DEFAULT 0.3,
  -- Behavioral calibration
  avg_response_time_seconds int,
  avg_message_length int,
  action_completion_rate float DEFAULT 0.0,
  engagement_score float DEFAULT 0.5,
  -- Trust level (1-5, gates Tier 4 frameworks)
  trust_level int DEFAULT 1 CHECK (trust_level BETWEEN 1 AND 5),
  -- Framework affinity (per-user learning)
  framework_affinity jsonb DEFAULT '{}'::jsonb,
  -- Regulatory focus
  promotion_focus float DEFAULT 0.5,
  prevention_focus float DEFAULT 0.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- MESSAGES — All conversation history across channels
-- ============================================================
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,     -- groups messages into threads
  channel text NOT NULL
    CHECK (channel IN ('email', 'telegram', 'web')),
  role text NOT NULL
    CHECK (role IN ('user', 'coach', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  -- metadata: { framework_used, sentiment, topic, tokens_in, tokens_out, cost_usd }
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_messages_user ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_embedding ON messages
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- MEMORY FACTS — Structured knowledge about each user
-- ============================================================
CREATE TABLE memory_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL
    CHECK (category IN (
      'business', 'personal', 'goal', 'person', 'challenge',
      'win', 'pattern', 'preference', 'org_sop'
    )),
  subject text NOT NULL,          -- 'Hans', 'Series A', 'hiring'
  content text NOT NULL,
  importance float DEFAULT 0.5
    CHECK (importance BETWEEN 0.0 AND 1.0),
  source_message_id uuid REFERENCES messages(id),
  embedding vector(1536),
  expires_at timestamptz,         -- some facts expire
  is_confirmed boolean DEFAULT false,  -- user-confirmed during onboarding
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_memory_user ON memory_facts(user_id, category);
CREATE INDEX idx_memory_embedding ON memory_facts
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- COMMITMENTS — Accountability engine
-- ============================================================
CREATE TABLE commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text DEFAULT 'action_item'
    CHECK (type IN ('goal', 'action_item', 'rock', 'habit')),
  description text NOT NULL,
  due_date timestamptz,
  status text DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'missed', 'rescheduled', 'cancelled')),
  follow_up_count int DEFAULT 0,
  source_message_id uuid REFERENCES messages(id),
  ai_tool_suggestion text,       -- recommended AI tool for this task
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_commitments_user ON commitments(user_id, status);
CREATE INDEX idx_commitments_due ON commitments(due_date)
  WHERE status = 'active';
```

### 3.2 Scheduling & Outreach Tables

```sql
-- ============================================================
-- SCHEDULED MESSAGES — Proactive outreach queue
-- ============================================================
CREATE TABLE scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN (
      'morning_briefing', 'accountability_check', 'meeting_prep',
      'weekly_review', 'engagement_check', 'milestone',
      'weekly_coaching_session',  -- MESO: coach-led strategic session
      'progress_review'           -- MACRO: monthly growth reflection
    )),
  scheduled_for timestamptz NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'sent', 'failed', 'cancelled')),
  retry_count int DEFAULT 0,
  sent_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_scheduled_pending ON scheduled_messages(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX idx_scheduled_user ON scheduled_messages(user_id, type);

-- ============================================================
-- CONVERSATION SUMMARIES — Rolling summaries (3-tier memory)
-- ============================================================
CREATE TABLE conversation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  summary text NOT NULL,
  key_topics text[],
  framework_used text,
  message_count int,              -- how many messages were summarized
  first_message_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_summaries_user ON conversation_summaries(user_id, created_at DESC);
```

### 3.3 Framework & Learning Tables

```sql
-- ============================================================
-- FRAMEWORK USAGE — Tracks which frameworks work for whom
-- ============================================================
CREATE TABLE framework_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  framework text NOT NULL,
  message_id uuid REFERENCES messages(id),
  engagement_signal float,         -- 0-1, did they engage well?
  action_taken boolean,
  learning_flag boolean DEFAULT false,  -- flagged for review if confidence <60%
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_framework_user ON framework_usage(user_id, framework);

-- ============================================================
-- FRAMEWORK CONFIG — System-wide framework registry
-- ============================================================
CREATE TABLE framework_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,       -- 'GROW', 'MI', 'EOS'
  tier int NOT NULL CHECK (tier BETWEEN 1 AND 4),
  category text NOT NULL,          -- 'session_structure', 'business', 'mindset', 'deep_psychology'
  description text,
  when_to_use text,                -- selection criteria (per-challenge, not per-message)
  system_prompt_template text,     -- methodology guide (how the framework works as a whole)
  phases text[],                   -- e.g., '{Goal,Reality,Options,Will}' for GROW
  phase_descriptions jsonb,        -- per-phase coaching guidance
  transition_signals text,         -- when to advance to next phase
  selection_weight float DEFAULT 1.0,  -- admin-adjustable weight
  requires_trust_level int DEFAULT 1,
  requires_consent boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- COACHING CHALLENGES — Active challenges with assigned frameworks
-- Frameworks are selected per-challenge (not per-message).
-- A user can have multiple active challenges simultaneously.
-- See COACHING_BRAIN.md §2 for the framework lifecycle.
-- ============================================================
CREATE TABLE coaching_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,              -- "Get first 10 customers"
  description text,
  related_entity_id uuid REFERENCES user_entities(id),
  framework text NOT NULL,          -- FK to framework_config.name
  framework_phase text,             -- e.g., 'Goal', 'Reality', 'Options', 'Will'
  status text DEFAULT 'active'
    CHECK (status IN ('active', 'resolved', 'evolved', 'paused')),
  started_at timestamptz DEFAULT now(),
  last_coached_at timestamptz,
  session_count int DEFAULT 0,
  resolved_at timestamptz,
  evolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_challenges_user ON coaching_challenges(user_id, status);

-- ============================================================
-- COACHING AGENDA — Weekly coaching plan from MESO Session Planner
-- Written by the weekly pg_cron job, read by the Coaching Engine.
-- See COACHING_BRAIN.md §4 for the Session Planner algorithm.
-- ============================================================
CREATE TABLE coaching_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  arc_phase text DEFAULT 'orientation'
    CHECK (arc_phase IN ('orientation', 'working', 'depth', 'integration')),
  priority_topic text,
  suggested_framework text,
  coaching_questions text[],
  unresolved_entities uuid[],
  patterns_detected text[],
  wins_to_celebrate uuid[],
  stalled_goals uuid[],
  week_summary text,
  confidence float DEFAULT 0.5,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_agenda_user ON coaching_agenda(user_id, week_start DESC);

-- ============================================================
-- FACT CACHE — Cached factual lookups from Perplexity Sonar
-- Reduces API calls for common queries. 24h TTL.
-- See COACHING_GUARDRAILS.md §2.4 for grounding strategy.
-- ============================================================
CREATE TABLE fact_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash text NOT NULL UNIQUE,  -- SHA-256 of normalized query
  query text NOT NULL,
  answer text NOT NULL,
  sources jsonb DEFAULT '[]'::jsonb,  -- [{title, url}]
  confidence text DEFAULT 'medium'
    CHECK (confidence IN ('high', 'medium', 'low')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX idx_fact_cache_hash ON fact_cache(query_hash);
CREATE INDEX idx_fact_cache_expires ON fact_cache(expires_at);

-- Auto-cleanup expired cache entries (pg_cron job)
-- SELECT cron.schedule('clean-fact-cache', '0 */6 * * *',
--   $$DELETE FROM fact_cache WHERE expires_at < now()$$);
```

### 3.4 Structured Coaching Knowledge

```sql
-- ============================================================
-- USER ENTITIES — Structured coaching knowledge graph
-- Stores typed, queryable knowledge about the user's world:
-- people, goals, fears, values, behavioral patterns, triggers, wins
-- ============================================================
CREATE TABLE user_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- What type of knowledge is this?
  entity_type text NOT NULL
    CHECK (entity_type IN (
      'person',           -- people in their life (boss, co-founder, spouse, investor)
      'goal',             -- layered: life, annual, quarterly, weekly
      'fear',             -- fears, limiting beliefs, imposter syndrome
      'value',            -- core values, motivations, what drives them
      'pattern',          -- recurring behavioral patterns (avoidance, overcommitting)
      'trigger',          -- emotional triggers, stress responses
      'win'               -- milestones, achievements, celebrated moments
    )),

  -- Core fields
  name text NOT NULL,              -- "Chuck", "Get 10 customers", "Fear of delegation"
  description text,                -- rich text detail

  -- Structured metadata (varies by entity_type, see below)
  attributes jsonb DEFAULT '{}'::jsonb,
  -- person:  { relationship: "boss", organization: "Acme", sentiment: "strained",
  --            open_issues: ["budget debate"], ally_or_blocker: "blocker" }
  -- goal:    { level: "quarterly", progress: 0.3, target_date: "2026-06-30",
  --            sub_goals: ["hire recruiter", "post job listing"], related_values: ["growth"] }
  -- fear:    { severity: 0.7, context: "before board meetings",
  --            frameworks_used: ["Narrative Coaching"], addressed: false }
  -- value:   { priority: "high", conflicts_with: ["overworking"],
  --            expressed_as: "always protects family time" }
  -- pattern: { frequency: 3, examples: ["delayed Chuck convo", "avoided investor call"],
  --            coach_observation: "avoidance of difficult conversations" }
  -- trigger: { context: "before high-stakes meetings", response: "imposter feelings",
  --            coping_strategy: "overprepares", helpful: false }
  -- win:     { date: "2026-03-15", magnitude: "major",
  --            related_goal_id: "uuid", celebrated: true }

  -- Status tracking
  status text DEFAULT 'active'
    CHECK (status IN ('active', 'resolved', 'evolved', 'archived')),

  -- For semantic retrieval (hybrid: structured queries + vector search)
  embedding vector(1536),

  -- Provenance
  source_message_id uuid REFERENCES messages(id),
  first_mentioned_at timestamptz DEFAULT now(),
  last_mentioned_at timestamptz DEFAULT now(),
  mention_count int DEFAULT 1,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_entities_user_type ON user_entities(user_id, entity_type);
CREATE INDEX idx_entities_status ON user_entities(user_id, status)
  WHERE status = 'active';
CREATE INDEX idx_entities_last_mentioned ON user_entities(user_id, last_mentioned_at DESC);
CREATE INDEX idx_entities_embedding ON user_entities
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 3.5 AI Tools & Cost Tracking Tables

```sql
-- ============================================================
-- AI TOOLS — Knowledge base of AI tools for recommendations
-- ============================================================
CREATE TABLE ai_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  category text[],                 -- ['writing', 'coding', 'design']
  cost_model text,                 -- 'freemium', 'paid', 'free'
  cost_detail text,
  description text,
  strengths text[],
  when_to_recommend text,
  api_available boolean DEFAULT false,
  last_verified_at timestamptz,
  auto_flagged boolean DEFAULT false,  -- new tools flagged for admin review
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- COST TRACKING — Every LLM call logged
-- ============================================================
CREATE TABLE cost_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  purpose text NOT NULL,           -- 'coaching', 'summarization', 'extraction',
                                   -- 'embedding', 'research', 'briefing', 'letter'
  model text NOT NULL,             -- 'claude-3-5-sonnet', 'gpt-4o-mini', etc.
  tokens_in int NOT NULL,
  tokens_out int NOT NULL,
  cost_usd numeric(10, 6) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_cost_user ON cost_tracking(user_id, created_at);
CREATE INDEX idx_cost_purpose ON cost_tracking(purpose, created_at);

-- ============================================================
-- ONBOARDING STATE — Multi-step signup wizard state machine
-- ============================================================
CREATE TABLE onboarding_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'signup'
    CHECK (current_step IN (
      'signup', 'starting_point', 'research_pending',
      'research_confirm', 'coaching_letter', 'channel_connect', 'complete'
    )),
  data jsonb DEFAULT '{}'::jsonb,
  research_results jsonb,
  coaching_letter text,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- ORGANIZATIONS — Multi-tenancy (Phase 3)
-- ============================================================
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  coaching_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ANTI-NAGGING TRACKER — Per-topic strike tracking
-- ============================================================
CREATE TABLE nagging_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic text NOT NULL,             -- 'commitment:uuid' or 'engagement_check'
  strike_count int DEFAULT 0 CHECK (strike_count BETWEEN 0 AND 3),
  is_paused boolean DEFAULT false,
  last_strike_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, topic)
);
```

### 3.5 Row Level Security Policies

```sql
-- All user-facing tables: users can only access their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE nagging_tracker ENABLE ROW LEVEL SECURITY;

-- Standard user policy (applied to all user-scoped tables)
-- Example for messages:
CREATE POLICY "Users can read own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass for Edge Functions
-- Edge Functions use the service_role key, which bypasses RLS,
-- allowing them to write coach responses and system messages.

-- Admin policy (future: admin role in JWT)
-- CREATE POLICY "Admins can read all"
--   ON messages FOR SELECT
--   USING (auth.jwt() ->> 'role' = 'admin');

-- AI Tools and Framework Config are public-read (no user data)
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI tools readable by authenticated users"
  ON ai_tools FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE framework_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Framework config readable by authenticated users"
  ON framework_config FOR SELECT
  USING (auth.role() = 'authenticated');
```

---

## 4. API Contracts (Edge Function Endpoints)

### 4.1 Coaching & Messaging

#### `POST /functions/v1/coach`
Main coaching endpoint. Receives a user message, runs the full coaching pipeline, returns a response.

```typescript
// Request
{
  message: string;           // User's message content
  channel: 'web' | 'email';  // Source channel (Telegram uses webhook)
  conversation_id?: string;  // Optional, auto-created if absent
}

// Response (SSE stream for web, complete for email)
{
  response: string;          // Coach's response
  conversation_id: string;
  metadata: {
    framework_used: string;
    commitments_extracted: Array<{
      description: string;
      due_date?: string;
    }>;
    facts_extracted: Array<{
      category: string;
      subject: string;
      content: string;
    }>;
    ai_tool_recommendations?: Array<{
      tool: string;
      suggestion: string;
    }>;
  };
}
```

#### `POST /functions/v1/telegram-webhook`
Telegram Bot API webhook receiver. Verifies secret token, normalizes message, routes to coaching engine.

```typescript
// Request: Telegram Update object (per Bot API spec)
// Headers: X-Telegram-Bot-Api-Secret-Token

// Response: 200 OK (Telegram expects fast response)
// Coach response sent back via Bot API sendMessage
```

#### `POST /functions/v1/email-inbound`
Processes inbound email replies (via Resend webhook or email parsing service).

```typescript
// Request
{
  from: string;     // sender email
  subject: string;
  text: string;     // plain text body
  html?: string;
}

// Response: 200 OK
// Coach response sent via Resend as reply email
```

### 4.2 Onboarding & Research

#### `POST /functions/v1/onboarding/research`
Triggers background research on user's website and LinkedIn.

```typescript
// Request
{
  website_url: string;
  linkedin_url: string;
}

// Response
{
  research: {
    company_name: string;
    company_description: string;
    industry: string;
    stage: string;           // 'pre-revenue', 'early', 'scaling', 'established'
    user_background: string;
    key_people: string[];
    recent_news: string[];
    challenges_detected: string[];
  };
  confidence: number;        // 0-1
}
```

#### `POST /functions/v1/onboarding/confirm`
User confirms/corrects research results. Stores as memory_facts.

```typescript
// Request
{
  research: object;          // confirmed/edited research object
  corrections: string[];     // user's corrections
}

// Response: { success: true, facts_stored: number }
```

#### `POST /functions/v1/onboarding/coaching-letter`
Generates personalized coaching letter after research confirmation.

```typescript
// Request
{
  starting_point: 'challenge' | 'goal' | 'systematic';
  user_input: string;        // their challenge/goal description
}

// Response
{
  letter: string;            // markdown-formatted coaching letter
  suggested_framework: string;
}
```

### 4.3 Proactive Outreach

#### `POST /functions/v1/cron/morning-briefings`
Triggered by pg_cron. Generates and sends morning briefings for users in the current timezone window.

```typescript
// Request (internal, from pg_cron)
{
  timezone_window: string;   // e.g., 'America/New_York'
}

// Response: { sent: number, failed: number, skipped: number }
```

#### `POST /functions/v1/cron/process-scheduled`
Processes the scheduled_messages queue. Generates content and delivers via appropriate channel.

```typescript
// Request (internal, from pg_cron)
// No body — reads from scheduled_messages WHERE status = 'pending'

// Response: { processed: number, failed: number }
```

### 4.4 Subscription & Billing

#### `POST /functions/v1/stripe-webhook`
Processes Stripe webhook events (checkout.session.completed, invoice.paid, customer.subscription.updated/deleted).

```typescript
// Request: Stripe webhook payload
// Headers: stripe-signature

// Response: 200 OK
// Side effects: updates users.subscription_tier
```

#### `POST /functions/v1/create-checkout`
Creates a Stripe Checkout session for tier upgrade.

```typescript
// Request
{
  tier: 'core' | 'premium';
  interval: 'monthly' | 'yearly';
}

// Response
{
  checkout_url: string;      // redirect user here
  session_id: string;
}
```

### 4.5 Admin (Phase 1 — Basic)

#### `GET /functions/v1/admin/metrics`
Returns aggregate engagement and billing metrics.

```typescript
// Response
{
  users: { total: number; free: number; core: number; premium: number };
  engagement: { daily_active: number; avg_messages_per_user: number; churn_risk: number[] };
  billing: { mrr: number; conversion_rate: number };
  costs: { total_llm_cost_30d: number; avg_cost_per_user: number };
  crisis_flags: number;
}
```

#### `GET /functions/v1/admin/crisis-flags`
Returns conversations flagged by crisis detection.

```typescript
// Response
{
  flags: Array<{
    user_id: string;
    message_id: string;
    trigger_type: string;    // 'keyword', 'llm_confirmed'
    severity: string;
    created_at: string;
    resolved: boolean;
  }>;
}
```

---

## 5. System Architecture (Subsystems)

### 5.1 Onboarding Pipeline

```
User lands on MasteryTV.com/CoachApp
  │
  ├── Step 1: SIGNUP
  │   Name, Email, LinkedIn URL, Website URL
  │   → Supabase Auth (magic link) → user created
  │   → Background: Edge Function triggers parallel research:
  │     • Firecrawl /extract (website)
  │     • LinkdAPI get_full_profile (LinkedIn)
  │   → XState transitions to 'starting_point'
  │
  ├── Step 2: STARTING_POINT
  │   "Where do you want to start?"
  │   🎯 Biggest challenge | 🏔️ Most important goal | 📋 Systematic
  │   User types their challenge/goal
  │   (research completes in background while user types)
  │   → XState transitions to 'research_pending' → 'research_confirm'
  │
  ├── Step 3: RESEARCH_CONFIRM
  │   Display research summary card
  │   User confirms/corrects → confirmed facts → memory_facts
  │   → XState transitions to 'coaching_letter'
  │
  ├── Step 4: COACHING_LETTER
  │   Generate and display personalized coaching letter
  │   (Template + LLM via Claude 3.5 Sonnet)
  │   → XState transitions to 'channel_connect'
  │
  ├── Step 5: CHANNEL_CONNECT
  │   "Email is your default. For real-time coaching, connect Telegram."
  │   User connects Telegram (optional) or skips
  │   → XState transitions to 'complete'
  │
  └── Step 6: COMPLETE
      First coaching session begins (web chat or Telegram)
      Onboarding state marked complete
```

**State persistence:** Every step writes to `onboarding_state` table. If user leaves and returns, XState rehydrates from DB and resumes at last step.

> [!NOTE]
> **AI tool discovery happens during coaching, not onboarding.** When the coach recommends an action item that could benefit from AI assistance (e.g., "write a LinkedIn post"), it asks the user what tools they use at that moment. This reduces onboarding friction and discovers tools at the point of relevance. See §5.5.

### 5.2 Coaching Engine

The core IP. Three decision layers produce every coaching response. See [COACHING_BRAIN.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COACHING_BRAIN.md) for the full decision architecture.

**Three Decision Layers (per response):**

| Layer | What It Decides | Scope | Based On |
|:---|:---|:---|:---|
| **Framework** | "What methodology for this challenge?" | Per-challenge (persists weeks) | Challenge type, user stage, trust level. Stored in `coaching_challenges`. |
| **Intervention** | "What should I do right now?" | Per-message | Heron's 6 Categories (Prescriptive, Informative, Confronting, Cathartic, Catalytic, Supportive). Biased by Autonomy + Challenge Level dims. |
| **Delivery Style** | "How should I say it for this person?" | Per-user (persistent) | 6 modulation dimensions: Directness, Framing, Warmth, Pacing, Evidence Style, Accountability. |

**Framework Selection (per-challenge, NOT per-message):**

Frameworks are assigned when a challenge or goal is identified in conversation. They persist across sessions until the MESO weekly planner reviews and evolves them.

```
Challenge identified in conversation
    │
    ├── Match to challenge type + user's coaching arc phase
    │   (GROW for goal-setting, EOS for team ops, MI for resistance, etc.)
    ├── Check trust level (Tier 3-4 require trust ≥ 3)
    ├── Check consent gate (Tier 4 requires explicit consent)
    │
    → Store in coaching_challenges (user_id, title, framework, phase)
    → Multiple challenges can be active simultaneously
    → MESO weekly planner reviews and may evolve framework/phase
```

**Intervention Selection (per-message, Heron's Six Categories):**

```
Message arrives → match to active challenge → load framework + phase
    │
    ├── Framework phase suggests intervention type:
    │   GROW "Reality" → likely Catalytic (explore current state)
    │   GROW "Will" → likely Prescriptive (commit to action)
    │
    ├── Check emotional state (overrides framework phase):
    │   User upset → Cathartic or Supportive (even if framework says "move to action")
    │   User achieved something → Supportive (celebrate before advancing)
    │
    ├── Check intervention biases (from coach_profiles):
    │   Autonomy: high → bias toward Catalytic/Cathartic over Prescriptive
    │   Challenge Level: low → Confronting only with trust ≥ 3 + high stakes
    │
    └── Conflict resolution:
        Low stakes: follow user's style bias
        High stakes: override + meta-acknowledge
        ("I know I usually ask questions, but I want to be direct here...")
```

**Prompt Assembly Order (per-message):**

```
1. BASE PERSONA (~400 tokens)
   - Coaching identity, core principles, boundaries

2. ACTIVE CHALLENGES + FRAMEWORKS (~200-400 tokens)
   - Active challenges with assigned framework + current phase
   - "User is working on GTM (GROW, Options phase) and VP management
     (Situational Leadership, Diagnosis phase)"

3. INTERVENTION SELECTOR (~150 tokens)
   - Instructions for selecting Heron's 6 categories based on
     framework phase + emotional state + intervention biases
   - "Select one: Prescriptive, Informative, Confronting,
     Cathartic, Catalytic, or Supportive."

4. USER PROFILE (~200 tokens)
   - Business context, stage, industry, key people
   - Current goals and active commitments

5. STRUCTURED ENTITIES (~200-400 tokens)
   - Active people with open issues (from user_entities WHERE entity_type='person')
   - Active goals with progress (from user_entities WHERE entity_type='goal')
   - Known fears/triggers relevant to current topic (pgvector on entities)
   - Detected patterns with frequency counts
   - Recent wins (for morale and framing)

6. DELIVERY STYLE (~100 tokens)
   - 6-dimension profile as natural language instructions
   - "Be direct but warm. Use data over stories. Check in externally."
   - Autonomy + Challenge Level → already used in intervention selection

7. RETRIEVED MEMORY (~500-800 tokens)
   - Top-K relevant memory_facts via pgvector (cosine similarity)
   - Recent conversation summary (medium-term tier)
   - Last 15-20 raw messages (short-term tier)

8. COACHING AGENDA (~100 tokens, from MESO weekly planner)
   - This week's priority topic, suggested questions
   - Weave naturally into conversation when relevant

9. AI TOOL CONTEXT (~100 tokens, conditional)
   - Injected only when action items are being discussed
   - If user has known tools (from prior conversations): include them
   - Instructions: "When recommending an action item that AI could help with,
     ask the user what tools they use before recommending. Remember their answer."

10. AUTHORITATIVE GUARDRAILS (~200 tokens)
    See: COACHING_GUARDRAILS.md for full detail.
    
    PRESCRIPTIVE RULES:
    - You are a coaching professional, NOT a lawyer, accountant,
      therapist, doctor, or financial advisor.
    - PROHIBITED DOMAINS: legal, tax, medical, financial,
      HR/employment law, regulatory compliance
    - When topics require licensure, redirect to professionals
    - Frame advice as options, not directives; ask permission;
      return ownership; never "you must/should"
    
    INFORMATIVE RULES:
    - Coaching-safe facts (frameworks, general principles): state directly
    - Verifiable facts (statistics, market data, pricing, current events):
      MUST call `search_facts` tool before stating
    - Prohibited facts (tax codes, legal statutes, dosages): never state,
      redirect to professionals
    - Always cite sources; always pivot back to coaching

11. SAFETY GUARDRAILS (~100 tokens)
    - Crisis detection instructions (see §5.8)
    - Topic boundary rules
    - Disclaimer trigger conditions

TOOLS PROVIDED:
- `search_facts`: Perplexity Sonar API wrapper (see §5.9)
  Used for real-time factual grounding when Informative intervention
  requires verifiable data. Returns answer + source URLs.

TOTAL: ~2,300-3,000 tokens of context per message
```

**4-Tier Memory System:**

| Tier | Content | Trigger | Storage |
|:---|:---|:---|:---|
| Short-term | Last 15-20 raw messages | Always loaded | `messages` table, ordered by created_at |
| Medium-term | Rolling summaries of completed sessions | Session ends (>2hr inactivity) or buffer >20 messages | `conversation_summaries` table |
| Long-term (unstructured) | Semantic memory_facts + old embeddings | Top-K retrieval on every message | `memory_facts` + `messages.embedding` via pgvector |
| Long-term (structured) | People, goals, fears, values, patterns, triggers, wins | Extracted by Entity Extractor after each message; queried by type + status | `user_entities` table (structured queries + pgvector) |

### 5.2a MESO Session Planner (Weekly)

The "meta-thinker" — an async GPT-4o job that runs weekly (Sunday evening) to plan the coaching direction for each user. This is what makes the coach proactive rather than just reactive.

**Trigger:** Weekly pg_cron job → `cron-session-planner/index.ts` Edge Function

**Process:**

```
For each active user:
    │
    ├── 1. REVIEW: Load conversations, entities, commitments from past 7 days
    ├── 2. ASSESS: What progressed? What stalled? What's avoided? New patterns?
    ├── 3. PLAN: Identify "next frontier" — most impactful topic to coach on
    │   ├── Review active coaching_challenges — any need to evolve/resolve?
    │   ├── Generate 2-3 coaching questions to weave into interactions
    │   └── Select or confirm framework for priority challenge
    ├── 4. GENERATE: Weekly coaching session message
    │   ├── Coach-led, question-first (NOT a status update)
    │   ├── References specific entities and patterns
    │   └── Connects past insights to current opportunities
    │
    └── 5. STORE:
        ├── Write coaching_agenda row for this user/week
        └── Write scheduled_messages row (type: 'weekly_coaching_session')
```

**Cost:** ~$0.05-0.10/user/week (GPT-4o, ~3K tokens in, ~1K out)

**Coaching Session vs. Morning Briefing:**

| Touchpoint | Purpose | Frequency |
|:---|:---|:---|
| **Morning Briefing** | Tactical: commitments, schedule, quick insight | Daily |
| **Accountability Check-in** | Specific follow-up on a single commitment | As needed |
| **Weekly Coaching Session** | Strategic: "I've been thinking about..." — coach leads with questions | Weekly |
| **Progress Review** | Reflection: growth summary over 30/60/90 days | Monthly |

### 5.2b MACRO Arc Strategist (Monthly)

Detects which phase of the coaching arc the user is in and generates progress reviews.

**Trigger:** Monthly pg_cron job or milestone-triggered

**Coaching Arc Phases:**

| Phase | Typical Timing | Coach Mode | Frameworks Available |
|:---|:---|:---|:---|
| **Orientation** | Weeks 1–2 | Supportive + Structured | Tier 1 only |
| **Working** | Weeks 3–8 | Challenging + Adaptive | Tier 1-2 |
| **Depth** | Weeks 8+ (trust ≥ 3) | Provocative + Deep | Tier 1-3 (Tier 4 with consent) |
| **Integration** | Ongoing | Partner | All tiers |

**Progress Review:** Monthly structured reflection showing the user their growth:
- Quantitative: commitments completed, engagement trends
- Qualitative: patterns addressed, stories reframed, breakthroughs
- Entities resolved: fears confronted, goals achieved, relationships improved
- Next direction: recommended coaching focus for next month

Stored as `scheduled_messages` (type: `'progress_review'`).

### 5.3 Channel Router

```typescript
// Unified message format (all channels normalize to this)
interface CoachMessage {
  user_id: string;
  channel: 'email' | 'telegram' | 'web';
  content: string;
  timestamp: string;
  metadata: {
    telegram_chat_id?: string;
    email_thread_id?: string;
    reply_to_message_id?: string;
  };
}
```

**Channel adapters:**

| Channel | Inbound | Outbound | Format |
|:---|:---|:---|:---|
| **Email** | Resend inbound webhook → parse → normalize | Resend API → rich HTML template | HTML with clear CTAs |
| **Telegram** | Bot API webhook → normalize | Bot API sendMessage | Markdown (bold, italic, emoji) |
| **Web Chat** | POST /coach → normalize | SSE stream + Supabase Realtime | Styled chat bubbles |

**Conversation threading:** New conversation created after 4+ hours of inactivity or explicit topic change detected by LLM.

### 5.4 Entity Extractor (Structured Knowledge Builder)

A **separate GPT-4o call** that runs asynchronously after the post-processor. While the post-processor (GPT-4o-mini) handles quick extraction of facts, commitments, and sentiment, the Entity Extractor performs deeper analysis to build and maintain the structured coaching knowledge graph.

**Why a separate call (not bundled with post-processor):**
- Entity extraction requires reasoning about relationships, patterns, and context — GPT-4o is significantly more accurate than GPT-4o-mini for this
- Runs async — doesn't add latency to the coaching response
- Only triggers when the conversation contains extractable entities (not every message)

**Extraction pipeline:**

```
Coach sends response → POST-PROCESSOR runs (GPT-4o-mini, sync)
                        │
                        ▼
                    Coaching response delivered to user
                        │
                        ▼ (async, non-blocking)
                    ENTITY EXTRACTOR (GPT-4o)
                        │
                        ├── New person mentioned?
                        │   → Upsert user_entities (person)
                        │   → Set relationship, sentiment, open_issues
                        │
                        ├── Goal stated or progress reported?
                        │   → Upsert user_entities (goal)
                        │   → Update progress, sub_goals, target_date
                        │
                        ├── Fear or limiting belief surfaced?
                        │   → Upsert user_entities (fear)
                        │   → Set severity, context, addressed status
                        │
                        ├── Value or motivation expressed?
                        │   → Upsert user_entities (value)
                        │   → Set priority, conflicts_with
                        │
                        ├── Behavioral pattern detected (3rd+ occurrence)?
                        │   → Upsert user_entities (pattern)
                        │   → Increment frequency, add examples
                        │
                        ├── Emotional trigger identified?
                        │   → Upsert user_entities (trigger)
                        │   → Set context, response, coping_strategy
                        │
                        ├── Win or milestone achieved?
                        │   → Insert user_entities (win)
                        │   → Link to related goal if applicable
                        │
                        └── Existing entity updated?
                            → Update last_mentioned_at, mention_count
                            → Update status if resolved/evolved
                            → Update attributes with new information
```

**Upsert logic:** The extractor receives existing entities for the user as context. When it detects "Chuck" again, it updates the existing Chuck entity rather than creating a duplicate. Matching is by `(user_id, entity_type, name)` — fuzzy name matching handled by the LLM ("Chuck" = "Charles" = "my boss").

**Cost per message:** ~$0.01-0.02 (GPT-4o with ~2K tokens in, ~500 out). Only runs when entities are detected — estimated ~40% of messages contain extractable entities. **Monthly cost at 100 users: ~$40-80.**

**Trigger heuristic:** Post-processor flags whether entity extraction is warranted based on simple signals:
- Proper nouns detected (person names, company names)
- Goal language ("I want to...", "my target is...", "by Q2...")
- Emotional language ("I'm afraid...", "what scares me...", "I always...")
- Achievement language ("I did it!", "we closed...", "finally...")
- If none detected, Entity Extractor is skipped for this message

### 5.5 Factual Grounding Service (Perplexity Sonar)

**Purpose:** Prevent hallucination in Informative interventions by grounding verifiable facts via search.
**Full spec:** [COACHING_GUARDRAILS.md §2](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COACHING_GUARDRAILS.md)

**Implementation:** Exposed as a Claude tool (`search_facts`) during coaching response generation.

```typescript
// Edge Function: search-facts/index.ts
// Called by Claude as a tool during coaching response generation

interface SearchFactsRequest {
  query: string;  // "What is the average SaaS trial conversion rate?"
}

interface SearchFactsResponse {
  answer: string;
  sources: { title: string; url: string; }[];
  confidence: 'high' | 'medium' | 'low';
  cached: boolean;
}

// Flow:
// 1. Hash query → check fact_cache table
// 2. Cache hit + not expired → return cached result
// 3. Cache miss → call Perplexity Sonar API
// 4. Store result in fact_cache (24h TTL)
// 5. Return grounded answer + sources to Claude
```

**When the coach triggers this tool:**
- User asks a fact-seeking question (statistics, market data)
- Coach is about to state a specific number or claim
- User mentions a market/industry fact that should be verified
- Discussion references current events or tool capabilities

**Cost:** ~$5-6/1K requests → ~$8-10/month at 100 users (see §7.2)

### 5.6 Proactive Outreach System

**Scheduling architecture:**

1. `pg_cron` fires every 30 minutes
2. Edge Function reads users whose `morning_briefing_time` falls in the current 30-min window (timezone-aware)
3. For each user: generate briefing content → write to `scheduled_messages` → deliver via preferred channel
4. Staggered delivery prevents Edge Function overload

**Anti-nagging protocol (per-topic):**

```
Strike 0: Initial proactive message (references specific commitment/context)
Strike 1: 24h no response → softer follow-up, different angle
Strike 2: 48h no response → explicit pause offer
Strike 3: Topic paused. "I'll stop checking in on this. Say 'let's revisit X' when ready."

Tracked in: nagging_tracker table (user_id + topic → strike_count)
```

**Engagement decay detection:**
- If user response rate drops <50% over 7 days → reduce outreach frequency
- Send meta-check-in: "Should I adjust how often I reach out?"

**Entity-powered intelligent outreach (via `user_entities`):**

| Query | Outreach Example |
|:---|:---|
| `WHERE entity_type = 'person' AND status = 'active' AND attributes->>'open_issues' IS NOT NULL AND last_mentioned_at < now() - interval '24h'` | "You mentioned a heated debate with Chuck yesterday. Have you reached out to him like we discussed?" |
| `WHERE entity_type = 'goal' AND attributes->>'target_date' < now() + interval '14d'` | "Your Q2 rock 'hire first employee' has a deadline in 2 weeks. You're at 30% — want to break it down?" |
| `WHERE entity_type = 'fear' AND status = 'active' AND attributes->>'context' LIKE '%board%'` + calendar check | "Board meeting Thursday. Last time you mentioned imposter feelings before these. Want to do a 5-min prep?" |
| `WHERE entity_type = 'pattern' AND attributes->>'frequency' >= 3` | "I've noticed you tend to avoid delegation conversations — this is the 3rd time in 2 months. Want to explore why?" |
| `WHERE entity_type = 'win' AND created_at > now() - interval '7d'` | "This week: you closed your first enterprise deal AND shipped the MVP. That's worth celebrating. 🎉" |

### 5.7 AI Tool Discovery & Recommendation Engine

**Design principle:** AI tools are discovered conversationally, not during onboarding. This follows the UX-First rule (GEMINI.md §3C) — don't ask users questions that aren't immediately relevant.

**How it works (conversational discovery):**

```
Coaching produces action item (e.g., "Write a LinkedIn post")
    │
    ├── LLM evaluates: Can AI accelerate this task?
    │   │
    │   ├── NO → deliver action item normally
    │   └── YES → check users.ai_tools for known preferences
    │       │
    │       ├── User has known tool for this category:
    │       │   "Since you use ChatGPT, here's a prompt for
    │       │    writing that LinkedIn post: [specific prompt]"
    │       │
    │       └── No known tool for this category:
    │           "Would you like help with that? Do you have a
    │            favorite AI tool for writing, or would you like
    │            me to recommend one?"
    │           │
    │           ├── User says "I use Claude" →
    │           │   Store in users.ai_tools + memory_facts
    │           │   Generate tool-specific prompt
    │           │
    │           └── User says "I don't know what to use" →
    │               Query ai_tools table for best match
    │               If no match: Perplexity API search
    │               → recommend tool + store in ai_tools table
    │               → generate specific prompt for user
```

**Tool memory:** When a user mentions any AI tool (even casually: "I was using Midjourney yesterday"), the post-processor extracts it and stores it in `users.ai_tools` as a memory_fact: `{tool: "Midjourney", discovered_at: date, category: "design"}`.

**Knowledge base refresh:**
- Weekly `pg_cron` job triggers Edge Function
- Edge Function calls Perplexity API for current AI tool landscape
- GPT-4o-mini structures response into `ai_tools` table format
- New tools auto-flagged (`auto_flagged = true`) for admin review
- On-demand: if user asks about a tool not in our DB, Perplexity lookup triggered in real-time
- Cost: ~$1/month (weekly batch) + ~$0.01/on-demand lookup

### 5.8 Background Research Pipeline

**Architecture:**

```
User enters website_url + linkedin_url
         │
         ▼
  Edge Function: /onboarding/research
         │
    ┌────┴────┐
    ▼         ▼
 Firecrawl   LinkdAPI
 /extract    get_full_profile
    │         │
    └────┬────┘
         ▼
  GPT-4o-mini: Structured Extraction
  {company, stage, industry, background,
   key_people, challenges, recent_news}
         │
         ▼
  Return to frontend for user confirmation
         │
         ▼
  Confirmed → memory_facts (is_confirmed = true)
```

**Cost per signup:** Firecrawl (1 credit) + LinkdAPI (1 credit) + GPT-4o-mini (~$0.001) ≈ **~$0.01/signup**

### 5.9 Crisis Detection System

**Hybrid approach:**

```
User message received
    │
    ├── Layer 1: Keyword Scanner (regex, <1ms)
    │   Scans for high-signal terms: "kill myself", "end it all",
    │   "self-harm", "suicide", etc.
    │   │
    │   ├── No match → proceed to coaching engine normally
    │   └── Match found → Layer 2
    │
    └── Layer 2: LLM Context Check (Claude, ~1-2s)
        Full message evaluated for true crisis signal
        (filters false positives: "killing it", "dying laughing")
        │
        ├── Confirmed crisis → SAFETY RESPONSE
        │   • Pause coaching immediately
        │   • Display empathetic message + resources
        │     (988 Lifeline, Crisis Text Line)
        │   • Flag for admin review
        │   • Log in crisis_flags
        │
        └── False positive → proceed normally
            (log for keyword refinement)

    Fallback: If LLM unavailable, keyword match alone
    triggers safety response (err on side of caution)
```

---

## 6. Security Model

### 6.1 Authentication

| Method | Implementation | When |
|:---|:---|:---|
| **Magic Link** | Supabase Auth magic link via email | Primary signup/login |
| **Google OAuth** | Supabase Auth Google provider | Phase 2 convenience login |
| **Telegram Auth** | Custom: user clicks deep link → bot sends verification code → user enters on web → accounts linked | Telegram connection |
| **Admin Auth** | Same Supabase Auth + custom `role` claim in JWT | Admin dashboard access |

### 6.2 Authorization (RLS)

All user-facing tables have RLS enabled. Policies enforce:

- **User data isolation:** `auth.uid() = user_id` on all user-scoped tables
- **Edge Function writes:** Service role key bypasses RLS (coach responses, system messages, research results)
- **Admin access:** JWT custom claim `role = 'admin'` (Phase 2: formal admin role)
- **Public-read tables:** `ai_tools`, `framework_config` — readable by any authenticated user

### 6.3 API Security

| Vector | Protection |
|:---|:---|
| **Telegram webhook** | Secret token in `X-Telegram-Bot-Api-Secret-Token` header, verified on every request |
| **Stripe webhook** | Signature verification via `stripe-signature` header |
| **Email inbound** | Resend webhook signature verification |
| **Edge Functions** | Supabase Auth JWT required (except webhooks which use their own auth) |
| **API keys** | All stored in Supabase Edge Function secrets (env vars), never in code |
| **CORS** | Edge Functions configured for `masterytv.com` origins only |

### 6.4 Data Privacy

- All data encrypted at rest (Supabase default) and in transit (TLS)
- Coaching data never shared with LLM providers for training (Anthropic/OpenAI enterprise terms)
- Users can request data export (GDPR Article 20) via admin
- Users can request data deletion (GDPR Article 17) → cascading delete on `users.id`
- Privacy policy clearly states: what data we collect, how LLM APIs process it, retention periods

---

## 7. 3rd Party Integrations & Cost Table

### 7.1 Integration Summary

| Service | Purpose | Auth Method | MVP Cost |
|:---|:---|:---|:---|
| **Anthropic (Claude)** | Primary coaching LLM | API key | ~$8-12/user/mo at full usage |
| **OpenAI (GPT-4o-mini)** | Async extraction, summarization, embeddings | API key | ~$1-2/user/mo |
| **Supabase** | DB, Auth, Edge Functions, vectors, Realtime, cron | Project key | Free tier → $25/mo Pro |
| **Vercel** | Next.js dashboard hosting | Account | Free tier → $20/mo Pro |
| **Resend** | Email delivery (mail.masterytv.com) | API key | Free (3K/mo) → $20/mo |
| **Telegram Bot API** | Messaging channel | Bot token | Free |
| **Stripe** | Payments & subscriptions | API key | 2.9% + $0.30/transaction |
| **Firecrawl** | Website scraping for onboarding research | API key | Free (500 credits) → $16/mo |
| **LinkdAPI** | LinkedIn profile enrichment | API key | Free (100 credits) → PAYG |
| **Perplexity API** | AI tools knowledge base refresh | API key | ~$1/mo |
| **Perplexity Sonar** | Real-time factual grounding for coaching | API key | ~$8-10/mo at 100 users |

### 7.2 Monthly Cost Projections

| Scenario | Users | LLM | Infrastructure | Channels | Total | Per User |
|:---|:---|:---|:---|:---|:---|:---|
| **Pre-launch** | 10 beta | $50 | $25 (Supabase) | $0 | ~$76/mo | $7.60 |
| **Month 3** | 40 paying | $400 | $45 | $20 (Resend) + $4 (Sonar) | ~$469/mo | $11.73 |
| **Month 6** | 100 paying | $1,000 | $45 | $20 + $10 (Sonar) | ~$1,075/mo | $10.75 |
| **Month 12** | 400 paying | $3,600 | $100 | $40 + $40 (Sonar) | ~$3,780/mo | $9.45 |

**NFR13 target: <$15/user/month COGS** ✅ Met at all projections.

---

## 8. Implementation Patterns & Naming Conventions

### 8.1 Edge Function Pattern

All Edge Functions follow the same structure:

```typescript
// Standard Edge Function pattern
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // 1. Auth check
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // Service role for writing
  );

  // 2. Input validation
  const body = await req.json();

  // 3. Business logic

  // 4. Response
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### 8.2 Naming Conventions

| Entity | Convention | Example |
|:---|:---|:---|
| Database tables | `snake_case`, plural | `memory_facts`, `scheduled_messages` |
| Database columns | `snake_case` | `user_id`, `created_at` |
| Edge Functions | `kebab-case` | `telegram-webhook`, `morning-briefings` |
| TypeScript types | `PascalCase` | `CoachMessage`, `UserProfile` |
| TypeScript functions | `camelCase` | `assemblePrompt`, `extractCommitments` |
| Environment variables | `SCREAMING_SNAKE_CASE` | `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN` |
| React components | `PascalCase` | `ChatWindow`, `CommitmentTracker` |
| CSS classes | Tailwind utility classes | Per GEMINI.md §3B |

### 8.3 Error Handling

All Edge Functions use structured error responses:

```typescript
// Never naked try/catch (GEMINI.md §3C)
try {
  // business logic
} catch (error) {
  // Log to cost_tracking or a dedicated error_log table
  await supabase.from('error_log').insert({
    function_name: 'coach',
    error_message: error.message,
    stack_trace: error.stack,
    user_id: userId,
    created_at: new Date().toISOString()
  });

  return new Response(JSON.stringify({
    error: 'coaching_error',
    message: 'Unable to generate response. Please try again.'
  }), { status: 500 });
}
```

---

## 9. Project Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Dashboard shell (nav, sidebar)
│   │   ├── page.tsx              # Dashboard home
│   │   ├── chat/page.tsx         # Web chat interface
│   │   ├── commitments/page.tsx  # Commitment tracker
│   │   ├── settings/page.tsx     # Profile, timezone, channels
│   │   ├── coaching-letter/page.tsx
│   │   └── progress/page.tsx     # Timeline view
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Admin overview
│   │   ├── users/page.tsx
│   │   ├── crisis/page.tsx
│   │   ├── frameworks/page.tsx
│   │   └── costs/page.tsx
│   ├── (onboarding)/
│   │   └── page.tsx              # Multi-step onboarding wizard
│   ├── api/                      # Next.js API routes (if needed)
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── chat/                     # Chat window, message bubbles
│   ├── onboarding/               # Step components, progress bar
│   └── dashboard/                # Charts, tables, cards
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Auth middleware
│   ├── stripe/
│   │   └── client.ts
│   └── types/
│       └── database.ts           # Generated Supabase types
├── hooks/
│   ├── useChat.ts                # Chat state + Realtime subscription
│   ├── useOnboarding.ts          # XState integration
│   └── useUser.ts
└── styles/
    └── globals.css

supabase/
├── functions/
│   ├── coach/index.ts            # Main coaching endpoint
│   ├── telegram-webhook/index.ts
│   ├── email-inbound/index.ts
│   ├── onboarding-research/index.ts
│   ├── onboarding-confirm/index.ts
│   ├── onboarding-letter/index.ts
│   ├── create-checkout/index.ts
│   ├── stripe-webhook/index.ts
│   ├── cron-morning-briefings/index.ts
│   ├── cron-process-scheduled/index.ts
│   ├── cron-ai-tools-refresh/index.ts
│   ├── admin-metrics/index.ts
│   └── admin-crisis-flags/index.ts
├── migrations/
│   ├── 001_core_schema.sql
│   ├── 002_rls_policies.sql
│   ├── 003_indexes.sql
│   ├── 004_framework_seed.sql
│   └── 005_ai_tools_seed.sql
└── seed.sql                      # Framework registry + initial AI tools
```

---

## 10. Architecture Decision Records (ADRs)

### ADR-001: No Agent Frameworks
**Decision:** Direct LLM API calls instead of LangChain/LlamaIndex/CrewAI.
**Context:** Team of 1 + AI. Agent frameworks add abstraction layers that obscure prompt logic — our core IP.
**Consequences:** More boilerplate for LLM calls, but full control over prompt assembly and easier debugging.

### ADR-002: Supabase as Single Platform
**Decision:** Use Supabase for DB, Auth, Edge Functions, vectors, cron, and Realtime.
**Context:** Minimizes ops burden. One billing, one mental model, one dashboard.
**Risk:** Vendor lock-in. Mitigated by: Supabase is open-source, Postgres is portable, Edge Functions are standard Deno.

### ADR-003: Dual-LLM Strategy
**Decision:** Claude 3.5 Sonnet for real-time coaching; GPT-4o-mini for async work.
**Context:** Claude excels at instruction-following and maintaining coaching persona. GPT-4o-mini is 10x cheaper for extraction/summarization tasks that don't need persona consistency.
**Fallback:** If Claude is unavailable, fall back to GPT-4o with quality logging (NFR18).

### ADR-004: Email Default + Telegram Opt-in
**Decision:** Email is the default channel for all users. Telegram is recommended but optional.
**Context:** Email is universal — no app install required. Telegram adds real-time coaching for engaged users who want it. Reduces onboarding friction.

### ADR-005: Firecrawl + LinkdAPI for Research
**Decision:** Firecrawl for website scraping (LLM-ready output), LinkdAPI for LinkedIn (PAYG, no subscription).
**Context:** Proxycurl shut down (LinkedIn lawsuit). Cookie-based scrapers carry high ban risk. Firecrawl's AI extraction eliminates post-processing. LinkdAPI offers true PAYG with credits that never expire.
**Risk:** LinkdAPI is a newer service — if it shuts down, fallback to Scrapingdog ($10 min PAYG).

### ADR-006: Hierarchical 3-Tier Memory
**Decision:** Short-term (raw messages) + medium-term (session summaries) + long-term (semantic search).
**Context:** Fixed message counts waste context window. 15-20 raw messages + rolling summaries + pgvector retrieval keeps prompts lean while maintaining continuity.

### ADR-007: XState for Onboarding
**Decision:** XState on frontend + JSONB state persistence in Supabase.
**Context:** Multi-step onboarding with conditional paths, background async operations (research), and resume-on-return capability requires a proper state machine. XState prevents invalid state transitions and handles edge cases deterministically.

### ADR-008: Resend for Email
**Decision:** Resend via mail.masterytv.com.
**Context:** Clean API, good deliverability, free tier covers MVP (3K emails/month). DNS setup on masterytv.com domain (SPF, DKIM, DMARC).

### ADR-009: Webhook-Based Telegram
**Decision:** Telegram webhook via Edge Function, not polling.
**Context:** Webhooks are push-based (lower latency, no wasted requests). Supabase Edge Functions provide a native HTTPS endpoint. Telegram recommends webhooks for production.

### ADR-010: Hybrid Crisis Detection
**Decision:** Keyword scanner (fast, regex) + LLM confirmation (accurate, contextual).
**Context:** Pure keyword matching produces false positives ("killing it"). Pure LLM adds latency to every message. Hybrid: fast keyword scan first, LLM only when triggered. If LLM unavailable, keyword alone errs on side of caution.

### ADR-011: Framework Selection Per-Challenge (Not Per-Message)
**Decision:** Coaching frameworks (GROW, EOS, MI, etc.) are assigned per-challenge and persist across sessions. They are NOT selected per-message.
**Context:** ICF research confirms that professional coaches are "model-aware, not model-bound." Frameworks structure the engagement arc, not individual responses. Per-message selection caused incoherent framework-hopping. The MESO weekly planner reviews and evolves frameworks. Multiple challenges can have different active frameworks simultaneously.
**Source:** ICF Core Competencies (2020), Co-Active Coaching Model.

### ADR-012: Heron's Six Category Intervention Framework
**Decision:** Per-message intervention decisions use Heron's Six Categories (Prescriptive, Informative, Confronting, Cathartic, Catalytic, Supportive) instead of ad-hoc coaching moves.
**Context:** Heron's framework (1975) is research-backed, widely used in coaching training, and provides exactly 6 clean categories split into Authoritative vs. Facilitative. Maps cleanly to our Autonomy communication style dimension (high autonomy → bias Facilitative, low → bias Authoritative). Simpler for the LLM to select than a custom taxonomy.
**Source:** John Heron, "Six Category Intervention Analysis" (1975).

### ADR-013: Three-Level Coaching Brain (MICRO/MESO/MACRO)
**Decision:** The coaching engine operates at three levels: MICRO (per-message response), MESO (weekly session planner), MACRO (monthly arc strategist + progress reviews).
**Context:** Without MESO/MACRO layers, the coach is reactive — it only responds when spoken to. The MESO weekly planner provides the "clinical mind" that reviews between sessions, identifies the next coaching frontier, and generates proactive coaching sessions. The MACRO strategist detects which phase of the coaching arc the user is in (Orientation → Working → Depth → Integration) and generates monthly progress reviews. This is what differentiates an AI coach from an AI chatbot.
**Cost:** ~$0.05-0.10/user/week (MESO) + ~$0.03/user/month (MACRO).

### ADR-014: Perplexity Sonar for Factual Grounding
**Decision:** Use Perplexity Sonar API (not Gemini Google Search Grounding) as the factual grounding service for Informative interventions.
**Context:** LLMs hallucinate statistics, market data, and time-sensitive facts. Perplexity Sonar returns search-grounded answers with source URLs at ~$5-6/1K requests. Gemini's Google Search Grounding costs ~$35/1K — 6x more expensive. Hedging with disclaimers ("from my training data...") erodes trust. The coach should either know or say it doesn't know.
**Implementation:** Exposed as a Claude tool (`search_facts`) — the coaching LLM calls it when it needs verified data. Results cached in `fact_cache` table (24h TTL) to reduce costs.
**Cost:** ~$0.10/user/month additional COGS — negligible against $15 target.
**Source:** COACHING_GUARDRAILS.md §2.4.

### ADR-015: Authoritative Intervention Guardrails
**Decision:** Implement explicit prohibitions for Prescriptive and Informative interventions to prevent the AI coach from overstepping professional boundaries or stating unverified facts.
**Context:** The AI coach has no professional license. It must never give legal, tax, medical, financial, HR law, or regulatory advice. For facts, it must distinguish between coaching-safe knowledge (state directly), verifiable claims (ground via search), and prohibited claims (redirect to professional). These rules are enforced via prompt engineering and tool availability.
**Source:** ICF Code of Ethics (2020), COACHING_GUARDRAILS.md.

---

## 11. Cost Tracking & Admin Dashboard

### 11.1 Cost Tracking

Every LLM call writes to `cost_tracking` table:

```typescript
await supabase.from('cost_tracking').insert({
  user_id: userId,
  purpose: 'coaching',         // or 'summarization', 'extraction', 'embedding', etc.
  model: 'claude-3-5-sonnet',
  tokens_in: usage.input_tokens,
  tokens_out: usage.output_tokens,
  cost_usd: calculateCost(model, usage),
  metadata: { framework_used, conversation_id }
});
```

### 11.2 Admin Dashboard Views (MVP)

| View | Data Source | Purpose |
|:---|:---|:---|
| **User Overview** | `users` + `messages` aggregation | Active users, signups, tiers |
| **Engagement** | `messages` + `commitments` | Response rates, message volume, completion rates |
| **Framework Usage** | `framework_usage` + `framework_config` | Distribution chart, adjust weights |
| **Crisis Flags** | Crisis flag query | Review flagged conversations |
| **Cost Breakdown** | `cost_tracking` | By user, by feature, by model, by time period |
| **Billing** | `users` (tier counts) + Stripe API | MRR, conversion, churn |

---

## 12. Open Questions for Future Phases

| Question | Phase | Impact |
|:---|:---|:---|
| Google Calendar OAuth flow — where do tokens live? | Phase 2 | Schema includes `calendar_tokens` placeholder; implementation deferred |
| SMS channel (Twilio) — integrated directly or via Novu? | Phase 2 | Novu adds orchestration value but also complexity |
| Behavioral style calibration — how frequently should behavioral signals override self-reported? | Phase 2 | Currently defaults only; behavioral override needs statistical confidence threshold |
| B2B2C multi-org — separate schema or shared with org_id? | Phase 3 | `org_id` on users is sufficient; `organizations.coaching_config` handles custom frameworks |
| BYOK (Bring Your Own Key) — secure key storage pattern? | Phase 2 | Supabase Vault or encrypted column; needs security review |
| Token-based task execution — pricing model? | Phase 3 | Depends on actual LLM costs per task type |
| Voice coaching — transcription pipeline? | Phase 3+ | Whisper API + coaching engine; significant UX design needed |

---

## 13. Gate 2 Checklist

- [x] **Tech stack selected with rationale** — Section 2: 18 technologies with version + rationale
- [x] **Database schema designed** — Section 3: 17 tables with columns, types, constraints, indices, and RLS
- [x] **API contracts defined** — Section 4: 13+ Edge Function endpoints with request/response types
- [x] **Security model defined** — Section 6: Auth methods, RLS policies, API security, data privacy
- [x] **3rd party integrations identified with costs** — Section 7: 10 integrations with cost projections at 4 scale points
- [x] **User approved architecture** — Approved 2026-03-30

---

## 14. FR Coverage Matrix

Every functional requirement from the PRD maps to an architectural component:

| FR | Description | Component |
|:---|:---|:---|
| FR1 | Web signup | Onboarding Pipeline (§5.1), Supabase Auth |
| FR2 | Magic link / Google OAuth | Auth (§6.1) |
| FR3 | Telegram connection | Channel Router (§5.3), Telegram webhook |
| FR4 | Profile settings | User Dashboard, `users` table |
| FR5 | Communication style view | Dashboard, `coach_profiles` table |
| FR6 | Coach profile creation | Onboarding Pipeline, `coach_profiles` |
| FR7 | Multi-channel messaging | Channel Router (§5.3), Message Router |
| FR8 | Framework selection | Coaching Engine (§5.2), `coaching_challenges`, `framework_config` — per-challenge, not per-message |
| FR8b | Per-message intervention | Coaching Engine (§5.2), Heron's 6 Categories — per-message intervention selection |
| FR9 | Semantic memory retrieval | 3-Tier Memory (§5.2), pgvector |
| FR10 | Dynamic prompt assembly | Coaching Engine (§5.2) |
| FR11 | Fact extraction | Post-Processor, `memory_facts` |
| FR12 | Commitment extraction | Post-Processor, `commitments` |
| FR13 | Website/LinkedIn scraping | Research Pipeline (§5.6), Firecrawl + LinkdAPI |
| FR14 | Research confirmation | Onboarding (§5.1), `/onboarding/confirm` |
| FR14b | Coaching letter | Onboarding (§5.1), `/onboarding/coaching-letter` |
| FR14c | AI toolset collection | Onboarding (§5.1), `users.ai_tools` |
| FR14d | AI tool recommendations | AI Tool Engine (§5.5), `ai_tools` |
| FR15-20 | Proactive outreach | Outreach System (§5.4), `scheduled_messages`, `nagging_tracker` |
| FR21-24 | Accountability | `commitments` table, Dashboard views |
| FR25-28 | Billing | Stripe integration (§4.4), `users.subscription_tier` |
| FR29-32 | Safety | Crisis Detection (§5.8), Safety guardrails in prompt |
| FR33-36 | Admin | Admin endpoints (§4.5), Dashboard views (§11.2) |
| FR37 | Prescriptive guardrails | Prompt Assembly (§5.2) Layer 10, COACHING_GUARDRAILS.md §1 |
| FR38 | Informative grounding | Factual Grounding Service (§5.5), `search_facts` tool, `fact_cache` table |
| FR39 | Professional boundary redirection | Prompt Assembly (§5.2) Layer 10, prohibited domain list |

---

> **Next Phase:** Sprint Planning (`directives/SPRINT.md`) — Break this into epics, stories, and tasks.

---

## Appendix A: CRM & Marketing Infrastructure (Added Sprint 1)

> **ADR:** Added during Phase 4 build (2026-03-31). Not in original PRD. Decision: add schema now, build features later. No PRD revision needed.

### A.1 Contacts-First Model

The CRM uses a **contacts-first** model where every email address is a `contact`, and app users are a subset:

```
contacts (anyone who gives us an email)
    ↑
    └── users (subset: people who created an account)
```

- A newsletter subscriber is a `contact` with `status = 'lead'`
- When they sign up for the app, the `handle_new_user` trigger finds their contact by email and promotes them to `free_member`
- This preserves their marketing history (source, lead score, events) through the conversion

### A.2 Schema

| Table | Purpose | RLS |
|:---|:---|:---|
| `contacts` | Every email captured (superset of users) | Service-role only |
| `contact_lists` | Mailing lists (newsletter, product updates, etc.) | Authenticated read |
| `contact_subscriptions` | Who's on which list (CAN-SPAM compliant) | Service-role only |
| `contact_events` | Lead scoring breadcrumbs + lifecycle events | Service-role only |

### A.3 Contact Lifecycle

```
lead → prospect → free_member → paid_member → premium_member
                                                    ↓ (cancel)
                                                  churned
```

Scoring events: `page_visit` (+1), `newsletter_signup` (+5), `email_opened` (+2), `email_clicked` (+3), `trial_started` (+10), `onboarding_completed` (+15), `first_coaching_session` (+20), `upgraded` (+50), `referred` (+25).

### A.4 Deferred Features (Sprint 5-6 / Post-MVP)

- Newsletter sending UI + campaign builder
- Email template system with Resend
- Segmented campaigns by contact status
- Lead scoring automation (pg_cron job)
- Referral tracking system
- Unsubscribe / email preferences page (`/unsubscribe?email=...`) — linked from all auth email templates
- Admin dashboard for CRM analytics
