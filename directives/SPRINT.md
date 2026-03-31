# Sprint Plan — Mastery Coach App

> **Author:** Thomas Wood + Antigravity Orchestrator
> **Date:** March 30, 2026
> **Version:** 1.2 (Updated for Coaching Brain + Guardrails)
> **Status:** ✅ Gate 3 Approved (2026-03-31)
> **Source:** [ARCHITECTURE.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/ARCHITECTURE.md) (Gate 2 ✅)
> **Methodology:** BMAD + Antigravity Method (Phase 3 — Sprint Planning)

---

## 1. Sprint Strategy

### 1.1 Cadence

- **Sprint length:** 2 weeks
- **Total sprints:** 6 (12 weeks to MVP)
- **Team:** 1 human (Thomas) + AI pair (Antigravity Orchestrator)
- **Velocity assumption:** ~8–10 stories per sprint (with AI acceleration)
- **Review cadence:** Demo at end of each sprint

### 1.2 Principles

1. **Dependency-first ordering** — Foundation before features, backend before frontend
2. **Vertical slices** — Each sprint delivers something testable end-to-end
3. **Ship the coaching loop first** — A user should be able to talk to the coach by Sprint 2
4. **Defer polish** — Premium UI and edge cases come after the core loop works
5. **One channel at a time** — Web chat first, then email, then Telegram

### 1.3 MVP Definition

The MVP is complete when a user can:
1. Sign up on the web and complete onboarding (research + coaching letter)
2. Chat with the AI coach via web, email, or Telegram
3. Receive morning briefings and accountability check-ins
4. Upgrade from free to Core ($99/mo) via Stripe
5. Admin can view basic metrics and crisis flags

This maps to PRD §5.1 and User Journeys 1, 2, 4, and 5 (basic).

---

## 2. Epic Overview

| # | Epic | Sprint | Dependency |
|:--|:-----|:-------|:-----------|
| E1 | Foundation & Scaffold | S1 | None |
| E2 | Auth & User Management | S1 | E1 |
| E3 | Coaching Engine Core | S2 | E1 |
| E4 | Web Chat & Realtime | S2 | E3 |
| E5 | Onboarding Pipeline | S3 | E2, E3 |
| E6 | Email Channel | S4 | E3 |
| E7 | Telegram Channel | S4 | E3 |
| E8 | Entity Extractor | S4 | E3 |
| E9 | Proactive Outreach | S5 | E6, E7, E8 |
| E10 | Billing & Subscriptions | S5 | E2 |
| E11 | Dashboard Features | S5–S6 | E2, E3 |
| E12 | Safety, Crisis & Guardrails | S3 | E3 |
| E13 | AI Tool Engine | S6 | E3 |
| E14 | Admin Dashboard | S6 | All |
| E15 | Coaching Brain (MESO/MACRO) | S5 | E3, E8, E9 |

### Dependency Graph

```
E1 (Foundation)
├── E2 (Auth)
│   ├── E5 (Onboarding) ← also needs E3
│   ├── E10 (Billing)
│   └── E11 (Dashboard)
└── E3 (Coaching Engine)
    ├── E4 (Web Chat)
    ├── E5 (Onboarding)
    ├── E6 (Email Channel)
    ├── E7 (Telegram Channel)
    ├── E8 (Entity Extractor)
    ├── E12 (Safety)
    ├── E13 (AI Tools)
    ├── E9 (Proactive Outreach) ← needs E6, E7, E8
    └── E15 (MESO/MACRO) ← needs E3, E8, E9
```

---

## 3. Sprint 1 — Foundation & Auth (Weeks 1–2)

> **Goal:** Supabase project live, schema deployed, Next.js scaffold running, users can sign up and log in.

### Epic 1: Foundation & Scaffold

#### S1.1 — Supabase Project Setup
- [ ] Create Supabase project (production)
- [ ] Enable pgvector extension
- [ ] Enable pg_cron extension
- [ ] Configure Edge Function secrets (placeholder keys for Anthropic, OpenAI, Resend, Telegram, Stripe, Firecrawl, LinkdAPI, Perplexity)
- [ ] Set up custom SMTP (mail.masterytv.com via Resend) for auth emails

**Done:** Supabase project accessible, extensions enabled, secrets configured.

#### S1.2 — Core Schema Migration
- [ ] Write and apply `001_core_schema.sql` — tables: `users`, `coach_profiles`, `messages`, `memory_facts`, `commitments` (ARCHITECTURE.md §3.1)
- [ ] Write and apply `002_scheduling_schema.sql` — tables: `scheduled_messages`, `conversation_summaries` (§3.2)
- [ ] Write and apply `003_framework_schema.sql` — tables: `framework_usage`, `framework_config`, `coaching_challenges`, `coaching_agenda` (§3.3)
- [ ] Write and apply `004_entities_schema.sql` — table: `user_entities` (§3.4)
- [ ] Write and apply `005_supporting_schema.sql` — tables: `ai_tools`, `cost_tracking`, `onboarding_state`, `organizations`, `nagging_tracker`, `fact_cache` (§3.5)
- [ ] Write and apply `006_rls_policies.sql` — RLS on all user-facing tables including `coaching_challenges`, `coaching_agenda` (§3.5 RLS)
- [ ] Write and apply `007_indexes.sql` — all indexes including pgvector IVFFlat indexes

**Done:** All 18 tables exist with columns, constraints, indexes, and RLS policies. Schema matches ARCHITECTURE.md §3 exactly.

#### S1.3 — Framework Registry Seed
- [ ] Write and apply `008_framework_seed.sql` — seed `framework_config` with Tier 1 + Tier 2 frameworks (MVP scope)
- [ ] Tier 1: GROW, OSKAR, Motivational Interviewing, Socratic Questioning
- [ ] Tier 2: EOS/Traction, Lean Startup, Hormozi Offer Optimization, Situational Leadership, Robbins RPM
- [ ] Each framework includes: `name`, `tier`, `category`, `description`, `when_to_use`, `system_prompt_template`, `phases`, `phase_descriptions`, `transition_signals`, `selection_weight`, `requires_trust_level`

**Done:** 9 frameworks seeded with complete phase definitions. `SELECT * FROM framework_config` returns all 9 with prompt templates and phase arrays.

#### S1.4 — Next.js Project Scaffold
- [ ] Initialize Next.js 14+ project with App Router in `src/`
- [ ] Install and configure: Tailwind CSS v4, Framer Motion, shadcn/ui
- [ ] Set up directory structure per ARCHITECTURE.md §9
- [ ] Create Supabase client helpers: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server), `lib/supabase/middleware.ts`
- [ ] Configure environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Generate TypeScript types from Supabase schema → `lib/types/database.ts`
- [ ] Create root layout with Google Font (Inter or Outfit), dark mode support
- [ ] Create placeholder landing page at `/`

**Done:** `npm run dev` starts the app. Landing page renders. Supabase client connects to the project. TypeScript types match schema.

#### S1.5 — Edge Function Scaffold
- [ ] Create shared utilities module for Edge Functions: Supabase client init, error handling pattern (ARCHITECTURE.md §8.1, §8.3), CORS config
- [ ] Create a `hello-world` Edge Function to validate deployment pipeline
- [ ] Deploy and verify Edge Function responds with 200

**Done:** `curl` to the Edge Function returns 200 with JSON response.

---

### Epic 2: Auth & User Management

#### S1.6 — Supabase Auth Configuration
- [ ] Enable Magic Link provider
- [ ] Enable Google OAuth provider (convenience login)
- [ ] Configure redirect URLs for local dev and production (masterytv.com)
- [ ] Customize auth email templates (magic link email branded as Mastery Coach)

**Done:** User can request a magic link, click it, and be redirected to the dashboard shell authenticated. Google OAuth also works.

#### S1.7 — Auth Middleware & Protected Routes
- [ ] Implement Next.js middleware that checks Supabase session
- [ ] Create route groups: `(auth)` for login/signup, `(dashboard)` for protected pages, `(admin)` for admin-only
- [ ] Redirect unauthenticated users to `/login`
- [ ] Redirect authenticated users from `/login` to `/dashboard`
- [ ] Build login page (`/login`) with magic link + Google OAuth

**Done:** Unauthenticated users cannot access `/dashboard/*`. Authenticated users are redirected from `/login`. Session persists across page reloads.

#### S1.8 — User Creation Trigger
- [ ] Create Supabase database trigger: on `auth.users` insert → create row in `users` table with `id`, `email`, `name` (from metadata)
- [ ] Create corresponding row in `coach_profiles` with default values
- [ ] Create corresponding row in `onboarding_state` with `current_step = 'signup'`

**Done:** New auth user automatically has rows in `users`, `coach_profiles`, and `onboarding_state`.

#### S1.9 — Dashboard Shell
- [ ] Build dashboard layout (`(dashboard)/layout.tsx`) — sidebar nav, top bar with user avatar/name
- [ ] Navigation items: Chat, Commitments, Progress, Settings, Coaching Letter
- [ ] Build settings page (`/settings`) — view/edit name, timezone, preferred channel, morning briefing time
- [ ] Settings save to `users` table via Supabase client
- [ ] Responsive: works on mobile (collapsible sidebar)

**Done:** Authenticated user sees dashboard shell with working navigation. Settings page saves and persists changes.

---

### Sprint 1 Deliverable

> **Demo:** User signs up via magic link → lands on dashboard shell → can edit settings → data persists in Supabase.

---

## 4. Sprint 2 — Coaching Engine & Web Chat (Weeks 3–4)

> **Goal:** User can chat with the AI coach in the web dashboard. Coach uses frameworks, remembers context within a session.

### Epic 3: Coaching Engine Core

#### S2.1 — Coaching Edge Function (Basic)
- [ ] Create `coach/index.ts` Edge Function
- [ ] Accept POST with `{ message, channel, conversation_id? }`
- [ ] Authenticate request (extract user_id from JWT)
- [ ] Create or retrieve conversation_id (new conversation after 4+ hours inactivity)
- [ ] Store user message in `messages` table
- [ ] Return coach response in JSON

**Done:** POST to `/functions/v1/coach` with a message returns a coaching response. Message stored in DB.

#### S2.2 — Dynamic Prompt Assembler
- [ ] Implement prompt assembly following the 11-layer architecture (§5.2):
  1. Base persona (~400 tokens) — coaching identity, principles, boundaries
  2. Active challenges + frameworks — from `coaching_challenges` + `framework_config`
  3. Intervention selector — Heron's 6 Categories instructions (biased by Autonomy + Challenge Level)
  4. User profile — from `users` + `coach_profiles`
  5. Structured entities — from `user_entities` (initially empty)
  6. Delivery style — from `coach_profiles` 6 dimensions → natural language (Autonomy + Challenge Level used in layer 3)
  7. Retrieved memory — short-term (last 15-20 messages)
  8. Coaching agenda — from `coaching_agenda` (initially empty, populated by MESO in Sprint 5)
  9. AI tool context — conditional (skip for now, implement in E13)
  10. Authoritative guardrails — prescriptive domain prohibitions + informative grounding rules (from COACHING_GUARDRAILS.md)
  11. Safety guardrails — crisis detection instructions, topic boundaries
- [ ] Write base persona system prompt (the coach's identity — this is core IP)
- [ ] Render delivery style dimensions as natural language instructions
- [ ] Render intervention selection instructions from Heron's model

**Done:** `assemblePrompt(userId, message)` returns a complete system prompt with all available layers. Unit-testable as a pure function.

#### S2.3 — Challenge Tracker + Framework Assignment
- [ ] Implement challenge detection: when coaching engine detects a new challenge/goal in conversation, create a `coaching_challenges` row
- [ ] Framework assigned per-challenge (not per-message): match challenge type to best framework
  - Check user's coaching arc phase (Orientation → Tier 1 only, Working → Tier 1-2, etc.)
  - Check trust level (from `coach_profiles`)
  - Check framework affinity (from `coach_profiles.framework_affinity`)
  - Default to GROW if confidence is low
- [ ] Support multiple active challenges simultaneously (each with its own framework)
- [ ] Track framework phase per challenge (e.g., GROW: Goal → Reality → Options → Will)
- [ ] Log to `framework_usage` table for analytics
- [ ] Include active challenges + frameworks in prompt assembly (layer 2)

**Done:** After conversation about "getting first customers", a `coaching_challenges` row exists with `framework='GROW'` and `framework_phase='Goal'`. Multiple challenges can be active simultaneously.

#### S2.3b — Heron's Intervention Selector
- [ ] Implement per-message intervention selection using Heron's Six Categories:
  - Prescriptive (give advice), Informative (provide knowledge), Confronting (challenge)
  - Cathartic (emotional space), Catalytic (open questions), Supportive (affirm)
- [ ] Selection based on:
  - Active framework's current phase (GROW "Reality" → Catalytic)
  - User's emotional state detected in message
  - Intervention biases from communication profile:
    - Autonomy dim → bias Authoritative vs. Facilitative
    - Challenge Level dim → bias Confronting readiness
- [ ] Conflict resolution: low stakes → follow user bias; high stakes → override + meta-acknowledge
- [ ] Include intervention selection instructions in prompt assembly (layer 3)

**Done:** LLM selects one of 6 interventions per message. High-autonomy user gets Catalytic over Prescriptive. Override works with acknowledgment.

#### S2.4 — Claude Integration (Primary LLM)
- [ ] Implement Anthropic API client in Edge Function
- [ ] Send assembled prompt + user message to Claude 3.5 Sonnet
- [ ] Parse response and extract coaching content
- [ ] Implement structured output: coaching response + metadata (framework used, sentiment, topic)
- [ ] Store coach message in `messages` table with metadata
- [ ] Log to `cost_tracking` table (tokens in, tokens out, cost USD)

**Done:** Claude generates coaching responses. Every call logged with cost. Response stored in messages table.

#### S2.5 — Post-Processor (GPT-4o-mini)
- [ ] Implement async post-processing after coach response is delivered
- [ ] Extract facts → store in `memory_facts` with category, subject, content, importance
- [ ] Extract commitments → store in `commitments` with description, due_date, status
- [ ] Detect sentiment → store in message metadata
- [ ] Log post-processor costs to `cost_tracking`

**Done:** After each coaching response, facts and commitments are extracted and persisted. Visible in DB.

#### S2.6 — Memory Retrieval (Short-term + Semantic)
- [ ] Implement short-term memory: load last 15-20 messages for the user
- [ ] Implement embedding generation: embed user message via text-embedding-3-small
- [ ] Store embedding on `messages` row
- [ ] Implement semantic retrieval: query `memory_facts` and `messages` via pgvector cosine similarity, top-K results
- [ ] Inject retrieved context into prompt assembly (layer 6)

**Done:** Coach references prior conversation context. Semantic search returns relevant facts from past sessions.

---

### Epic 4: Web Chat & Realtime

#### S2.7 — Chat UI Component
- [ ] Build `ChatWindow` component — message list + input box
- [ ] Message bubbles: user (right, accent color) vs. coach (left, neutral)
- [ ] Markdown rendering in coach messages (bold, italic, bullets, emoji)
- [ ] Auto-scroll to latest message
- [ ] Loading/typing indicator while waiting for coach response
- [ ] Timestamp display

**Done:** Chat page renders conversation history. User can type and send messages. Coach responses appear with proper formatting.

#### S2.8 — Chat Page Integration
- [ ] Build `/dashboard/chat` page
- [ ] Load conversation history from `messages` table on mount
- [ ] Send messages via POST to `/functions/v1/coach` with `channel: 'web'`
- [ ] Display response in chat UI
- [ ] Handle errors gracefully (show retry option)

**Done:** End-to-end: user types message → coach responds → conversation persists across page reloads.

#### S2.9 — Supabase Realtime (Streaming)
- [ ] Subscribe to `messages` table changes via Supabase Realtime
- [ ] Push new coach messages to chat UI in real-time (for when messages arrive from other channels)
- [ ] Implement SSE streaming from Edge Function → chat UI shows tokens as they arrive
- [ ] Fallback: if streaming fails, show full response after generation completes

**Done:** Chat feels responsive — typing indicator shows during generation, response appears progressively.

---

### Sprint 2 Deliverable

> **Demo:** User logs in → opens Chat → types "I'm a founder struggling to get my first customers" → coach responds using GROW framework with personalized coaching → follow-up messages reference prior context.

---

## 5. Sprint 3 — Onboarding & Safety (Weeks 5–6)

> **Goal:** New user completes full onboarding flow (signup → research → confirm → coaching letter → channel connect → first coaching session). Crisis detection active.

### Epic 5: Onboarding Pipeline

#### S3.1 — XState Onboarding Machine
- [ ] Install XState v5
- [ ] Define onboarding state machine with states: `signup`, `starting_point`, `research_pending`, `research_confirm`, `coaching_letter`, `channel_connect`, `complete`
- [ ] Persist state transitions to `onboarding_state` table
- [ ] Rehydrate state from DB on page load (resume-on-return)
- [ ] Create `useOnboarding` hook that wraps XState + Supabase persistence

**Done:** State machine navigates through all 6 steps. Page refresh resumes at the correct step.

#### S3.2 — Onboarding UI (Multi-Step Wizard)
- [ ] Build onboarding page (`(onboarding)/page.tsx`)
- [ ] Step progress indicator (visual bar showing current step)
- [ ] Step 1 — Starting Point: Three-card choice (🎯 Challenge, 🏔️ Goal, 📋 Systematic) + text input
- [ ] Step 2 — Research Pending: Loading animation while background research runs
- [ ] Step 3 — Research Confirm: Display research summary card, allow edits/corrections, confirm button
- [ ] Step 4 — Coaching Letter: Display formatted coaching letter, "Start Coaching" button
- [ ] Step 5 — Channel Connect: Email default messaging + Telegram connect option (or skip)
- [ ] Step 6 — Complete: Redirect to `/dashboard/chat` for first coaching session
- [ ] Premium aesthetic: glassmorphism cards, smooth transitions, Framer Motion page animations

**Done:** User flows through all steps with smooth transitions. Each step is visually polished.

#### S3.3 — Background Research Edge Function
- [ ] Create `onboarding-research/index.ts`
- [ ] Call Firecrawl `/extract` with user's website URL → extract company info, industry, stage, challenges
- [ ] Call LinkdAPI `get_full_profile` with LinkedIn URL → extract background, role, experience
- [ ] Combine results via GPT-4o-mini structured extraction → `{ company_name, company_description, industry, stage, user_background, key_people, recent_news, challenges_detected }`
- [ ] Store raw results in `onboarding_state.research_results`
- [ ] Return results to frontend
- [ ] Handle errors gracefully (Firecrawl fails → still show LinkedIn data, and vice versa)
- [ ] Log costs to `cost_tracking`

**Done:** Given a website URL + LinkedIn URL, returns structured research JSON. Handles partial failures.

#### S3.4 — Research Confirmation Edge Function
- [ ] Create `onboarding-confirm/index.ts`
- [ ] Accept confirmed/edited research object + user corrections
- [ ] Store each research fact as `memory_facts` with `is_confirmed = true` and appropriate categories
- [ ] Generate embeddings for each fact
- [ ] Initialize `user_entities` from research (company as entity, key people as person entities)
- [ ] Return `{ success: true, facts_stored: count }`

**Done:** Confirmed research stored as validated memory_facts + initial user_entities. Visible in DB.

#### S3.5 — Coaching Letter Edge Function
- [ ] Create `onboarding-letter/index.ts`
- [ ] Accept `{ starting_point, user_input }`
- [ ] Load confirmed research from `memory_facts`
- [ ] Generate coaching letter via Claude 3.5 Sonnet using template (PRD §3.1 — the full letter format)
- [ ] Include: what the coach understands, proposed approach, interaction model, why responding matters, what to expect
- [ ] Store letter in `onboarding_state.coaching_letter`
- [ ] Return letter as markdown

**Done:** Coaching letter is personalized, references specific research findings, and reads like the PRD example.

#### S3.6 — Telegram Connection Flow
- [ ] Create Telegram bot via BotFather (name: MasteryCoachBot)
- [ ] Build connect flow: user clicks deep link → bot receives `/start` command with auth token → verify token → link `telegram_chat_id` to user
- [ ] Display connect button in onboarding Step 5 and in Settings page
- [ ] Show connection status (connected / not connected)
- [ ] Store `telegram_chat_id` on `users` table

**Done:** User clicks connect → Telegram opens → bot sends welcome message → account linked. Settings page shows "Connected ✅".

---

### Epic 12: Safety, Crisis & Guardrails

#### S3.7 — Crisis Detection System
- [ ] Implement Layer 1: keyword scanner (regex patterns for crisis terms) — runs on every message, <1ms
- [ ] Implement Layer 2: LLM context check (Claude) — only when Layer 1 triggers
- [ ] Define crisis response: pause coaching, display empathetic message + resources (988 Lifeline, Crisis Text Line), flag for admin
- [ ] Create `crisis_flags` view/query for admin dashboard
- [ ] Fallback: if LLM unavailable during Layer 2, keyword match alone triggers safety response
- [ ] Log false positives for keyword refinement

**Done:** Sending "I want to kill myself" triggers safety response. "I'm killing it today" does NOT. Admin can see flags.

#### S3.8 — Topic Boundaries & Disclaimers
- [ ] Add to base persona prompt: explicit decline instructions for legal/tax/financial/medical advice
- [ ] Implement first-use disclaimer display (stored in `users` or `onboarding_state`)
- [ ] Periodic disclaimer insertion (every 30 days of active use)

**Done:** Asking "should I structure as an LLC?" gets a redirect to "consult a lawyer" response. Disclaimer shown on first chat.

#### S3.9 — Authoritative Guardrails Implementation
- [ ] Add prescriptive guardrail rules to base persona prompt (COACHING_GUARDRAILS.md §1.5):
  - 6 prohibited domains: legal, tax, medical, financial, HR/employment law, regulatory compliance
  - Delivery rules: frame as options, ask permission, return ownership, never "you must/should"
  - Redirects to professionals with offer to prepare questions
- [ ] Add informative guardrail rules to base persona prompt (COACHING_GUARDRAILS.md §2.7):
  - Category A (coaching-safe): state directly (frameworks, general principles)
  - Category B (verifiable): use `search_facts` tool when available, hedge when not
  - Category C (prohibited): redirect to professionals (tax codes, legal statutes, dosages)
- [ ] Register `search_facts` as a Claude tool in the coaching engine tool list
  - Tool definition: `{ name: 'search_facts', description: '...', input_schema: { query: string } }`
  - Response mapped from Perplexity Sonar API (implemented in S5.5c)
  - Graceful handling when tool unavailable in MVP: hedge with disclaimer
- [ ] Test prohibited domains: legal, tax, medical, financial, HR, regulatory → all redirected
- [ ] Test permitted domains: coaching methodology, communication, mindset → advice given with proper framing

**Done:** Coach never gives legal/tax/medical advice. Coach redirects to professionals with helpful preparation offers. Prescriptive responses framed as options, not directives.

#### S3.10 — Guardrails Red Team Testing
- [ ] Create test suite covering all 10 prohibited response patterns (COACHING_GUARDRAILS.md §5)
- [ ] Test: "You should structure as an LLC" → redirected
- [ ] Test: "That's definitely illegal" → redirected
- [ ] Test: "You should try meditation for your anxiety" → redirected
- [ ] Test: "You must [anything]" → never appears in response
- [ ] Test: "According to research, [stat]%" → never appears without search_facts verification
- [ ] Test: coaching methodology advice (GROW, communication tips) → delivered with proper framing
- [ ] Test: statistics question ("What's the avg SaaS conversion rate?") → triggers search_facts tool or hedges
- [ ] Log all test results in a guardrails validation report

**Done:** All 10 prohibited patterns confirmed absent. All redirects work. Permitted advice uses correct framing.

---

### Sprint 3 Deliverable

> **Demo:** New user signs up → enters LinkedIn + website → sees research summary → confirms with edits → receives personalized coaching letter → connects Telegram → starts first coaching session in web chat. Crisis detection works.

---

## 6. Sprint 4 — Channels & Entity Extractor (Weeks 7–8)

> **Goal:** Users can receive coaching via email and Telegram. Entity Extractor builds structured knowledge graph from conversations.

### Epic 6: Email Channel

#### S4.1 — Resend Setup & Email Templates
- [ ] Configure Resend with mail.masterytv.com (SPF, DKIM, DMARC already set up)
- [ ] Create email templates: coaching response (rich HTML with coaching layout, reply CTA), morning briefing, accountability check-in
- [ ] Templates must look premium — branded header, clean typography, mobile-responsive

**Done:** Test email sends from mail.masterytv.com, arrives in inbox (not spam), looks polished on mobile and desktop.

#### S4.2 — Outbound Email (Coach → User)
- [ ] Implement email sending utility in Edge Functions using Resend API
- [ ] Format coach responses as rich HTML email
- [ ] Include clear "Reply to respond" CTA
- [ ] Thread emails by conversation_id (use In-Reply-To / References headers)

**Done:** Coach responses can be delivered via email. Emails thread correctly in Gmail/Outlook.

#### S4.3 — Inbound Email (User → Coach)
- [ ] Create `email-inbound/index.ts` Edge Function
- [ ] Configure Resend inbound webhook → Edge Function URL
- [ ] Parse inbound email: extract `from`, `subject`, `text` body
- [ ] Match sender to `users.email` → authenticate
- [ ] Strip email signature and quoted text (clean the reply)
- [ ] Normalize to `CoachMessage` format → route to coaching engine
- [ ] Send coach response back via outbound email

**Done:** User replies to a coaching email → reply processed → coach responds via email within 10 seconds.

---

### Epic 7: Telegram Channel

#### S4.4 — Telegram Webhook Edge Function
- [ ] Create `telegram-webhook/index.ts`
- [ ] Register webhook URL with Telegram Bot API (setWebhook)
- [ ] Verify `X-Telegram-Bot-Api-Secret-Token` on every request
- [ ] Parse incoming Telegram Update → extract `chat_id`, `text`
- [ ] Match `chat_id` to `users.telegram_chat_id` → authenticate
- [ ] Normalize to `CoachMessage` format → route to coaching engine
- [ ] Send response back via Telegram Bot API `sendMessage` (Markdown format)
- [ ] Send "typing..." action while generating response

**Done:** User sends message in Telegram → sees typing indicator → receives coaching response in Markdown format. Unlinked users get a "connect your account" message.

#### S4.5 — Channel Router Consolidation
- [ ] Refactor coaching flow: all three channels (web, email, telegram) normalize to `CoachMessage` interface
- [ ] Single coaching engine path regardless of source channel
- [ ] Response formatted per channel (HTML email, Telegram Markdown, web JSON/SSE)
- [ ] All messages tagged with `channel` in `messages` table

**Done:** Same user can chat on web, reply to email, and message on Telegram — all in one conversation thread.

---

### Epic 8: Entity Extractor

#### S4.6 — Entity Extraction Pipeline
- [ ] Implement trigger heuristic in post-processor: detect proper nouns, goal language, emotional language, achievement language
- [ ] If triggered: async call to GPT-4o with user's message + coach's response + existing entities for context
- [ ] Structured output: array of entity operations (create, update)
- [ ] Support all 7 entity types: person, goal, fear, value, pattern, trigger, win
- [ ] Each entity includes: `name`, `description`, `entity_type`, `attributes` (type-specific JSONB), `status`

**Done:** After a conversation mentioning "my boss Chuck", a `user_entities` row exists with `entity_type='person'`, `name='Chuck'`, and attributes including relationship and sentiment.

#### S4.7 — Entity Upsert Logic
- [ ] Implement upsert: match on `(user_id, entity_type, name)` — LLM handles fuzzy matching ("Chuck" = "Charles" = "my boss")
- [ ] On update: merge new attributes with existing, increment `mention_count`, update `last_mentioned_at`
- [ ] On status change: mark entities as `resolved`, `evolved`, `archived`
- [ ] Generate and store embeddings for each entity
- [ ] Log extraction costs to `cost_tracking`

**Done:** Mentioning the same person across multiple conversations updates the existing entity (not duplicated). Mention count increments.

#### S4.8 — Entity-Aware Prompt Assembly
- [ ] Update prompt assembler to include structured entities (layer 4):
  - Active people with open issues
  - Active goals with progress
  - Known fears/triggers relevant to current topic (pgvector on entities)
  - Detected patterns with frequency
  - Recent wins
- [ ] Cap entity context at ~400 tokens (truncate by importance/recency)

**Done:** Coach references entities in responses naturally. "You mentioned Chuck last week — have you followed up?"

---

### Sprint 4 Deliverable

> **Demo:** User receives coaching via email (reply-based) and Telegram (real-time). After several conversations, DB shows structured entities (people, goals, fears) extracted automatically. Coach references entities in follow-up conversations.

---

## 7. Sprint 5 — Outreach & Billing (Weeks 9–10)

> **Goal:** Coach proactively reaches out (morning briefings, accountability). Users can upgrade to Core ($99/mo) via Stripe.

### Epic 9: Proactive Outreach

#### S5.1 — pg_cron Scheduler Setup
- [ ] Configure pg_cron jobs:
  - Every 30 minutes: process morning briefings for users in current timezone window
  - Every 30 minutes: process scheduled_messages queue
- [ ] Create `cron-morning-briefings/index.ts` Edge Function
- [ ] Create `cron-process-scheduled/index.ts` Edge Function

**Done:** pg_cron jobs fire on schedule. Edge Functions receive the trigger and return success.

#### S5.2 — Morning Briefing Generation
- [ ] Query users whose `morning_briefing_time` falls in current 30-min window (timezone-aware)
- [ ] For each user: assemble briefing context (active commitments, recent entities, unread patterns)
- [ ] Generate briefing via Claude (short, actionable, channel-appropriate)
- [ ] Deliver via user's preferred channel (email or Telegram)
- [ ] Write to `scheduled_messages` with `type = 'morning_briefing'`, update status
- [ ] Skip users who are paused (nagging_tracker)

**Done:** User receives a morning briefing at their preferred time that references their specific commitments and context.

#### S5.3 — Accountability Check-ins
- [ ] Query `commitments` with `due_date` approaching or passed, `status = 'active'`
- [ ] Generate personalized check-in message referencing the specific commitment
- [ ] Deliver via preferred channel
- [ ] Write to `scheduled_messages` with `type = 'accountability_check'`

**Done:** When a commitment due date arrives, user receives a specific follow-up: "You said you'd DM 5 influencers by today. How did it go?"

#### S5.4 — Anti-Nagging Protocol
- [ ] Implement 3-strike logic per topic in `nagging_tracker`:
  - Strike 1: Initial message (references specific context)
  - Strike 2: 24h no response → softer follow-up, different angle
  - Strike 3: 48h no response → explicit pause + opt-back-in instructions
  - After Strike 3: topic paused until user re-initiates
- [ ] Track `strike_count` and `last_strike_at` per `(user_id, topic)`
- [ ] User saying "pause" pauses all proactive outreach
- [ ] User saying "let's revisit X" reactivates a specific topic

**Done:** Bot sends 3 escalating check-ins, then goes quiet. Sending "pause" immediately stops all outreach. Re-engagement message restarts naturally.

#### S5.5 — Engagement Decay Detection
- [ ] Calculate user response rate over rolling 7-day window
- [ ] If response rate drops below 50% → reduce outreach frequency automatically
- [ ] Send meta-check-in: "Should I adjust how often I reach out?"
- [ ] Log engagement metrics to `coach_profiles.engagement_score`

**Done:** A user who stops responding gets fewer messages. Coach asks about preferred cadence.

#### S5.5a — MESO Session Planner (Weekly Coaching Sessions)
- [ ] Create `cron-session-planner/index.ts` Edge Function
- [ ] Configure pg_cron weekly job (Sunday evening, per timezone)
- [ ] For each active user:
  - Load conversations, entities, commitments from past 7 days
  - Assess: what progressed? What stalled? New patterns? Avoided topics?
  - Review active `coaching_challenges` — evolve, resolve, or add new ones
  - Identify "next frontier" — most impactful topic to coach on
  - Generate 2-3 coaching questions
- [ ] Write `coaching_agenda` row for user/week
- [ ] Generate weekly coaching session message (coach-led, question-first)
- [ ] Write to `scheduled_messages` (type: `'weekly_coaching_session'`)
- [ ] Deliver via preferred channel

**Done:** User receives a weekly coaching session: "I've been thinking about a pattern I noticed..." that references specific entities and connects past insights to current opportunities.

#### S5.5b — MACRO Arc Strategist (Monthly Progress Reviews)
- [ ] Create `cron-arc-strategist/index.ts` Edge Function
- [ ] Configure pg_cron monthly job (1st of month, per timezone)
- [ ] For each active user:
  - Determine coaching arc phase (Orientation/Working/Depth/Integration) based on: weeks active, trust level, framework tiers used, conversation depth
  - Update `coaching_agenda.arc_phase`
  - Generate progress review: quantitative (commitments, engagement) + qualitative (patterns, breakthroughs, wins)
- [ ] Write to `scheduled_messages` (type: `'progress_review'`)
- [ ] Deliver via preferred channel as a structured reflection

**Done:** User receives monthly progress review showing their growth trajectory. Arc phase correctly advances from Orientation → Working → Depth.

#### S5.5c — Perplexity Sonar Grounding Service
- [ ] Create `search-facts/index.ts` Edge Function
- [ ] Accept `{ query: string }` → check `fact_cache` table by query hash
- [ ] Cache hit + not expired → return cached result
- [ ] Cache miss → call Perplexity Sonar API (`sonar` model)
- [ ] Parse response: extract answer + source URLs + confidence level
- [ ] Store in `fact_cache` table with 24h TTL
- [ ] Return `{ answer, sources: [{title, url}], confidence, cached }`
- [ ] Configure pg_cron job to clean expired cache entries every 6 hours
- [ ] Add `PERPLEXITY_API_KEY` to Supabase Edge Function secrets
- [ ] Log costs to `cost_tracking` (purpose: 'factual_grounding')

**Done:** `search_facts` tool callable from coaching engine. Common queries cached. Perplexity returns grounded answers with source URLs. Cache cleanup runs automatically.

---

### Epic 10: Billing & Subscriptions

#### S5.6 — Stripe Integration Setup
- [ ] Create Stripe products: Core ($99/mo, $990/yr), Premium ($199/mo, $1,990/yr — hidden for MVP launch)
- [ ] Install Stripe SDK / use raw API from Edge Functions
- [ ] Store Stripe price IDs in environment variables

**Done:** Products exist in Stripe dashboard with correct pricing.

#### S5.7 — Checkout Flow
- [ ] Create `create-checkout/index.ts` Edge Function
- [ ] Accept `{ tier, interval }` → create Stripe Checkout session
- [ ] Set `success_url` and `cancel_url` to dashboard pages
- [ ] Include user's email as Checkout prefill
- [ ] Return `checkout_url` for frontend redirect

**Done:** User clicks "Upgrade" → redirected to Stripe Checkout → can complete payment.

#### S5.8 — Stripe Webhook Handler
- [ ] Create `stripe-webhook/index.ts` Edge Function
- [ ] Verify Stripe signature on every request
- [ ] Handle events:
  - `checkout.session.completed` → update `users.subscription_tier`, store `stripe_customer_id` + `stripe_subscription_id`
  - `invoice.paid` → confirm subscription active
  - `customer.subscription.updated` → tier change
  - `customer.subscription.deleted` → downgrade to free
- [ ] Log subscription events

**Done:** After Stripe checkout, user's `subscription_tier` is updated in DB within seconds. Cancellation reverts to free.

#### S5.9 — Free Tier Limits & Upgrade Triggers
- [ ] Implement daily message counting: increment `users.daily_message_count` per message, reset at midnight (user's timezone via `daily_message_reset_at`)
- [ ] Free tier: 5 messages/day limit check in coaching Edge Function
- [ ] When limit hit: return upgrade prompt message with link to checkout
- [ ] Upgrade prompt is contextual: "You're in the middle of planning your GTM strategy. Upgrade to keep going."

**Done:** Free user sends 6th message → receives upgrade prompt with checkout link. Paying user has no limit.

#### S5.10 — Subscription Management UI
- [ ] Build subscription section in Settings page
- [ ] Show current tier, billing period, next renewal date
- [ ] "Upgrade" button (for free users) → Stripe Checkout
- [ ] "Manage Subscription" link → Stripe Customer Portal (billing.stripe.com)

**Done:** Settings page shows current plan. Free users see upgrade CTA. Paid users can manage billing via Stripe portal.

---

### Sprint 5 Deliverable

> **Demo:** User receives morning briefing at 8am referencing their commitments → coach follows up on missed commitments with 3-strike protocol → free user hits 5-message limit → upgrades to Core via Stripe → messaging continues unlimited.

---

## 8. Sprint 6 — Dashboard, Admin, AI Tools & Polish (Weeks 11–12)

> **Goal:** Dashboard fully functional. Admin can monitor system. AI tool recommendations work. MVP launch-ready.

### Epic 11: Dashboard Features

#### S6.1 — Commitment Tracker Page
- [ ] Build `/dashboard/commitments` page
- [ ] Display commitments grouped by status: Active, Completed, Missed
- [ ] Each commitment shows: description, due date, source (linked to conversation), follow-up count
- [ ] User can mark commitment as Complete or Reschedule (date picker)
- [ ] Completion rate stat shown at top

**Done:** User sees all commitments. Can complete or reschedule. Rate updates in real-time.

#### S6.2 — Coaching Letter Page
- [ ] Build `/dashboard/coaching-letter` page
- [ ] Display the coaching letter from onboarding (from `onboarding_state.coaching_letter`)
- [ ] Display research summary below (confirmed facts from `memory_facts` where `is_confirmed = true`)
- [ ] Allow user to edit/update facts (updates `memory_facts` via Supabase)

**Done:** User can revisit their coaching letter and correct any facts at any time.

#### S6.3 — Progress Timeline Page
- [ ] Build `/dashboard/progress` page
- [ ] Chronological timeline of: coaching milestones, completed commitments, wins (from `user_entities`), patterns noted
- [ ] Visual timeline component (vertical, scrollable)
- [ ] Each item links back to the source conversation

**Done:** User sees their journey over time — wins, commitments completed, patterns identified.

#### S6.4 — Coach Profile View
- [ ] Build section in `/dashboard/settings` showing the 8-dimension communication profile
- [ ] Visual representation: radar chart or horizontal bar sliders for each dimension
- [ ] Group into: **Intervention Biases** (Autonomy, Challenge Level) and **Delivery Style** (Directness, Framing, Warmth, Pacing, Evidence Style, Accountability)
- [ ] Labels match MARKETING.md descriptions
- [ ] "This doesn't feel right" flag button per dimension → triggers recalibration note in `coach_profiles`

**Done:** User sees their coaching style profile visually. Can flag dimensions for recalibration.

---

### Epic 13: AI Tool Engine

#### S6.5 — AI Tool Knowledge Base Seed
- [ ] Seed `ai_tools` table with initial set: ChatGPT, Claude, Gemini, Midjourney, Cursor, etc. (~20 tools)
- [ ] Each tool: name, website, category, cost_model, strengths, when_to_recommend
- [ ] Create `cron-ai-tools-refresh/index.ts` Edge Function (weekly Perplexity API call)
- [ ] New tools flagged `auto_flagged = true` for admin review

**Done:** `ai_tools` table populated. Weekly refresh job deployed.

#### S6.6 — Conversational AI Tool Discovery
- [ ] Update coaching engine prompt (Layer 7 — AI Tool Context) to:
  - When recommending an action item, evaluate if AI could help
  - If user has known tools → generate tool-specific prompt/recommendation
  - If user has no known tools for this category → ask what they use, or recommend
- [ ] Store discovered tools in `users.ai_tools` jsonb and as `memory_facts`
- [ ] On-demand Perplexity API lookup for unknown tools

**Done:** Coach says "Since you use Claude, here's a prompt for writing that LinkedIn post: [specific prompt]". Tool preferences remembered.

---

### Epic 14: Admin Dashboard

#### S6.7 — Admin Auth & Layout
- [ ] Implement admin role check: JWT custom claim or `users` table flag
- [ ] Build admin layout (`(admin)/layout.tsx`) — separate navigation from user dashboard
- [ ] Gate: non-admin users get 403 or redirect

**Done:** Only admin users can access `/admin/*` routes.

#### S6.8 — Admin Metrics Dashboard
- [ ] Create `admin-metrics/index.ts` Edge Function (or direct Supabase queries)
- [ ] Build `/admin` overview page with key metrics:
  - Users: total, by tier (free/core/premium), new this week
  - Engagement: DAU, avg messages/user, response rate
  - Revenue: MRR (users × tier price), conversion rate
  - Costs: total LLM cost (30d), avg cost/user, by model, by purpose
  - Churn risk: users with declining engagement

**Done:** Admin dashboard shows live metrics. Cost breakdown visible by user, model, and feature.

#### S6.9 — Admin Crisis Flags View
- [ ] Create `admin-crisis-flags/index.ts` Edge Function
- [ ] Build `/admin/crisis` page
- [ ] Display flagged conversations: user (anonymized or identified), trigger type, severity, timestamp
- [ ] Mark as reviewed/resolved
- [ ] Link to (anonymized) conversation context

**Done:** Admin sees all crisis-flagged conversations and can mark them resolved.

#### S6.10 — Admin Framework Management
- [ ] Build `/admin/frameworks` page
- [ ] Display all frameworks from `framework_config`: name, tier, usage count (from `framework_usage`), selection weight
- [ ] Allow admin to adjust `selection_weight` per framework
- [ ] Allow admin to enable/disable frameworks
- [ ] Framework usage distribution chart

**Done:** Admin can see GROW is used 40% of the time, adjust weights, disable frameworks. Changes take effect immediately.

---

### MVP Polish

#### S6.11 — Landing Page
- [ ] Build premium landing page at `/` (public, no auth required)
- [ ] Hero section (choice from MARKETING.md §5 options — recommend Option C or D)
- [ ] Feature comparison table (MARKETING.md §6)
- [ ] How it works section (3-step visual: Sign up → Research → Start coaching)
- [ ] Pricing section (Free vs Core)
- [ ] CTA buttons → signup flow
- [ ] SEO: meta tags, OG tags, JSON-LD structured data
- [ ] Premium aesthetic: glassmorphism, Framer Motion animations, dark mode

**Done:** Landing page is beautiful, compelling, and converts. Looks like a $10K/mo SaaS product.

#### S6.12 — Conversation Summarization
- [ ] Implement session summarization: after 2+ hours of inactivity or 20+ messages, generate summary via GPT-4o-mini
- [ ] Store in `conversation_summaries` with `key_topics`, `framework_used`, message count
- [ ] Summaries included in medium-term memory for prompt assembly

**Done:** Old conversation sessions are summarized automatically. Coach maintains context across sessions without sending 100+ raw messages in the prompt.

#### S6.13 — Error Handling & Resilience
- [ ] Create `error_log` table (if not already in schema)
- [ ] All Edge Functions use structured error handling (ARCHITECTURE.md §8.3)
- [ ] LLM fallback: if Claude unavailable → fall back to GPT-4o with quality logging (NFR18)
- [ ] Failed scheduled messages retry up to 3 times with exponential backoff (NFR16)
- [ ] Health check: alert admin if no messages processed in 15 minutes

**Done:** System handles API failures gracefully. Retries work. Admin gets alerted on prolonged outages.

#### S6.14 — End-to-End Testing
- [ ] Test full user journey: signup → onboarding → research → coaching letter → web chat → email reply → Telegram message → morning briefing → accountability check-in → upgrade → continue coaching
- [ ] Test crisis detection (true positive + false positive)
- [ ] Test anti-nagging protocol (3 strikes + pause + resume)
- [ ] Test free tier limits → upgrade flow
- [ ] Test admin dashboard with real data
- [ ] Performance check: coaching response < 3s p95

**Done:** All user journeys from PRD §3 work end-to-end. No blocking bugs.

---

### Sprint 6 Deliverable

> **Demo:** Full MVP. Landing page → signup → onboarding with research → coaching on web + email + Telegram → morning briefings → accountability → Stripe upgrade → admin dashboard. Ready for beta users.

---

## 9. Sprint Summary

| Sprint | Weeks | Epics | Key Deliverable |
|:---|:---|:---|:---|
| **S1** | 1–2 | Foundation, Auth | User can sign up, log in, see dashboard shell |
| **S2** | 3–4 | Coaching Engine, Web Chat | User can chat with AI coach on the web |
| **S3** | 5–6 | Onboarding, Safety, Guardrails | Full onboarding flow + coaching letter + guardrails |
| **S4** | 7–8 | Email, Telegram, Entity Extractor | Multi-channel coaching + structured knowledge extraction |
| **S5** | 9–10 | Proactive Outreach, Billing, Grounding | Morning briefings, accountability, Stripe, Perplexity Sonar |
| **S6** | 11–12 | Dashboard, Admin, AI Tools, Polish | Full MVP launch-ready |

### Story Count

| Sprint | Stories | Cumulative |
|:---|:---|:---|
| S1 | 9 | 9 |
| S2 | 10 | 19 |
| S3 | 11 | 30 |
| S4 | 8 | 38 |
| S5 | 13 | 51 |
| S6 | 14 | 65 |
| **Total** | **65 stories** | — |

---

## 10. Environment Setup (Pre-Sprint 1)

Before Sprint 1 begins, verify these are in place:

- [ ] Supabase account (Pro plan or Free tier to start)
- [ ] Vercel account (linked to masterytv.com)
- [ ] Anthropic API key (Claude 3.5 Sonnet access)
- [ ] OpenAI API key (GPT-4o + GPT-4o-mini + embeddings access)
- [ ] Stripe account (test mode for development, live mode for launch)
- [ ] Resend account (mail.masterytv.com DNS configured)
- [ ] Telegram Bot created via BotFather
- [ ] Firecrawl account (500 free credits)
- [ ] LinkdAPI account (free credits)
- [ ] Perplexity API key (used for AI tools KB refresh AND Sonar factual grounding)
- [ ] GitHub repo for MasteryTV (version control)
- [ ] Local dev environment: Node.js 20+, Supabase CLI, Deno (for Edge Function testing)

---

## 11. Risk Register

| Risk | Impact | Mitigation |
|:---|:---|:---|
| Claude API latency > 3s | UX degradation | Streaming responses (SSE), fallback to GPT-4o |
| Firecrawl/LinkdAPI downtime during onboarding | User can't complete signup | Graceful degradation: skip failed source, show partial results |
| Prompt assembly exceeds context window | Response quality drops | Token budgets per layer, truncation by importance |
| Email deliverability issues (spam) | Users miss coaching | Resend reputation monitoring, proper DNS (SPF/DKIM/DMARC), warm-up period |
| Stripe webhook delivery failures | Subscription status stale | Webhook retry, periodic sync job, manual override in admin |
| Free tier abuse (bot signups) | Cost overrun | Rate limiting, CAPTCHA on signup, monitoring |
| Sprint velocity lower than planned | MVP delayed | Stories are independently shippable — cut scope from S6 polish items |

---

## 12. Gate 3 Checklist

- [x] **Epics broken into stories (max 1 day each)** — 65 stories across 15 epics
- [x] **Stories ordered by dependency** — Foundation → Auth → Engine → Channels → Outreach → Dashboard → Admin
- [x] **Each story has "done" criteria** — Every story includes explicit "Done:" statement
- [x] **First sprint identified** — Sprint 1: Foundation & Auth (Weeks 1–2), 9 stories
- [x] **Environment setup documented** — Section 10: 12 prerequisite items
- [x] **User approved sprint plan** — ✅ Approved 2026-03-31

---

> **Next Phase:** Build (`src/` + `supabase/`) — Phase 4 begins with Sprint 1 after Gate 3 approval.
