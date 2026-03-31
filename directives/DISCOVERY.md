# MasteryTV Coach App — Phase 0: Discovery

> **Version:** 1.0
> **Date:** March 30, 2026
> **Status:** ✅ Complete — Gate 0 passed
> **Product:** MasteryTV Coach App (MasteryTV.com/CoachApp)
> **Methodology:** BMAD + Antigravity Method (Full BMAD v6.2.2 installed)

---

## 1. Problem Statement

**Entrepreneurs and founders need ongoing coaching, but can't access it affordably or consistently.**

- Human leadership coaching costs $1,000–$5,000/month — inaccessible for solo founders, pre-revenue startups, and small teams
- Existing AI coaching tools are reactive (user must initiate), generic, and lack persistent memory
- ChatGPT/Claude can simulate coaching but forget everything between sessions, can't follow up proactively, and don't adapt to communication styles
- The 31% of coaching clients who are founders represent a massive underserved segment willing to pay $50–$200/mo for a tool that actually works

**Our thesis:** A proactive, multi-channel AI coach with persistent memory, evidence-based coaching frameworks, and accountability tracking can fill the 10x price gap between free ChatGPT and expensive human coaches.

---

## 2. Market Analysis

### 2.1 Market Size

| Metric | Value | Source |
|:---|:---|:---|
| **TAM** (AI Coaching Market) | $6.69B (2026) → $14.8B (2030) | Research & Markets, EIN Presswire |
| **SAM** (Individual/SMB digital coaching) | ~$1.5–2B | Subset excluding enterprise contracts |
| **SOM** (Founders paying $50–$200/mo for AI coach) | ~$200–500M | 31% coaching clients are founders × avg spend |
| **CAGR** | 22% | Consistent across multiple sources |

### 2.2 The $100k/mo Revenue Math

| Pricing Tier | Monthly Price | Users Needed | Feasibility |
|:---|:---|:---|:---|
| Low-end | $49/mo | 2,041 users | Hard — high volume, thin margins |
| **Sweet spot** | **$99/mo** | **1,011 users** | **Achievable with strong retention** |
| Premium | $199/mo | 503 users | Possible at scale |
| **Blended (60% @ $99, 40% @ $199)** | **~$139 avg** | **~720 users** | **Best path — our target** |

**Acquisition model:** At 8–12% monthly churn, maintaining 720 users requires ~3,000–5,000 total acquisitions over 18 months (~170–280 new signups/mo). Achievable with content marketing + founder communities.

### 2.3 Gross Margins

| Tier | Revenue | COGS (LLM + hosting) | Gross Margin |
|:---|:---|:---|:---|
| $99/mo | $99 | ~$12 | 88% |
| $199/mo | $199 | ~$15 | 92% |

COGS per user: LLM inference ($2–8) + Telegram (free) + hosting ($0.50–1) = **$5–15/user/month**. Margins are healthy.

---

## 3. Competitive Landscape

### 3.1 Direct Competitors

| Platform | Model | Target | Price | Weakness |
|:---|:---|:---|:---|:---|
| **BetterUp** | Human + AI hybrid | Enterprise/F500 | Custom ($$$) | Not for indie founders; enterprise pricing |
| **CoachVox** | AI clone of a coach | Coaches (B2B2C) | $99/mo | Tool FOR coaches, not a coaching service |
| **Rocky.ai** | AI-native daily coaching | Individuals/Teams | Free–$20/mo | Too generic, habit-tracker vibe, shallow |
| **Jodie AI** | AI digital twin | Entrepreneurs | ~$100/mo | Single persona, no multi-channel |
| **Cloverleaf** | Team behavioral coaching | Organizations | Per-seat | Team-focused, not individual founders |
| **CoachHub (AIMY)** | Human + AI assistant | Enterprise | Custom | Enterprise only |
| **Hone** | Live training + AI sims | Leadership teams | Custom | Workshop format, not async |

### 3.2 The Invisible Competitor

**ChatGPT / Claude / Gemini** — Any founder can get "coaching" for $20/mo with a custom GPT. We MUST offer things a raw LLM cannot:
- Persistent memory across all sessions
- Proactive outreach (morning briefings, accountability follow-ups)
- Multi-channel presence (meets you where you are)
- Behavioral profile adaptation (learns your communication preferences)
- Structured accountability engine (tracks commitments, follows up)

### 3.3 Identified Market Gaps (Our White Space)

| Gap | Our Position |
|:---|:---|
| No multi-channel AI coach | Telegram + SMS + Web dashboard |
| No proactive coaching | Morning briefings, accountability check-ins, calendar-aware prep |
| No affordable 1:1 for founders | $99–$199/mo (10x cheaper than human coaches) |
| No persistent memory | pgvector semantic memory + structured fact extraction |
| No accountability engine | Commitment tracking with 3-strike follow-up protocol |
| No communication style adaptation | 8-dimension personality profile with behavioral calibration |

---

## 4. Target User

### Primary Persona: "The Solo Founder"

- **Demographics:** 28–45, seed-to-Series-A, solo or small team (1–10)
- **Psychographics:** High drive, limited time, isolated (no co-founder/board to bounce ideas off), hungry for growth, values efficiency
- **Pain Points:**
  - Makes decisions alone with no sounding board
  - Knows they should get coaching but can't afford $3,000/mo
  - Tried productivity apps but they're passive — no one pushing back
  - Uses ChatGPT for brainstorming but hates that it forgets everything
  - Overwhelmed by conflicting advice online
- **Willingness to Pay:** $99–$199/mo if it demonstrably saves them 4+ hours/week or prevents a costly mistake
- **Preferred Channel:** Messaging (Telegram/SMS) — already glued to phone, doesn't want another app
- **Success Metric:** "I feel like I have a thinking partner who knows my business"

### Secondary Persona: "The Scaling CEO"

- **Demographics:** 30–50, post-PMF, team of 5–20, raising or recently raised Series A
- **Pain Points:** Managing people for the first time, imposter syndrome, no longer doing the work — managing the work
- **Willingness to Pay:** $199/mo (has budget, used to paying for tools)
- **Key Need:** Situational leadership coaching, EOS/Traction frameworks, team communication

---

## 5. Revenue Model

### Confirmed: Freemium → Tiered Subscription

| Tier | Price | Includes |
|:---|:---|:---|
| **Free (Always-On)** | $0 | 5 messages/day, proactive outreach, calendar sync — permanent free tier to build relationship and trust |
| **Core** | $99/mo | Unlimited messaging, full coaching frameworks, accountability engine, weekly reviews, dashboard |
| **Premium** | $199/mo | Everything in Core + deep psychology mode, priority response, advanced analytics, co-founder coaching |

**Key Decision:** Free tier is generous enough to be genuinely useful, so the coach keeps learning about them. Upgrade triggers:
- Hit daily message limit during an important conversation
- See "premium insight" coaching that requires upgrade
- Weekly review shows "you'd unlock X with Core"
- After 2 weeks of consistent use, personalized upgrade nudge

**Annual Discount:** 2 months free ($990/year Core, $1,990/year Premium)

---

## 6. Business Model Canvas

| Block | Details |
|:---|:---|
| **Value Proposition** | Affordable, always-on AI coaching that proactively supports entrepreneurs — bridging the gap between free ChatGPT and $3,000/mo human coaches |
| **Channels** | Telegram (MVP), SMS (Phase 2), Web Dashboard (settings/analytics), MasteryTV.com/CoachApp (landing/signup) |
| **Customer Segments** | Solo founders (primary), scaling CEOs (secondary), eventually other coaching niches |
| **Revenue Streams** | Monthly subscription ($99/$199), annual plans |
| **Key Activities** | AI coaching delivery, coaching framework R&D, user research, retention optimization |
| **Key Resources** | LLM APIs (Claude/GPT), Supabase infrastructure, coaching methodology IP, user relationship data |
| **Key Partners** | Anthropic/OpenAI (LLM), Stripe (payments), Jina AI (scraping), MasteryTV brand |
| **Cost Structure** | LLM inference (~$12–15/user/mo), Supabase hosting, Vercel, domain |
| **Competitive Advantage** | Accumulated user context (moat deepens with time), proactive cadence (habit loop), evidence-based framework registry |

---

## 7. Technical Feasibility

### Confirmed: Fully buildable with current team (1 human + AI coding agent)

| Component | Technology | Status |
|:---|:---|:---|
| Database + Auth + Vectors | Supabase (Postgres + pgvector + Auth + RLS + pg_cron) | ✅ Proven, well-documented |
| Backend API | Supabase Edge Functions (Deno/TypeScript) | ✅ Serverless, scales automatically |
| Frontend Dashboard | Next.js 14+ App Router (inside existing MasteryTV site) | ✅ Existing stack |
| Primary Channel | Telegram Bot API (webhook-based) | ✅ Free, instant setup |
| LLM Coaching | Claude 3.5 Sonnet (sync) + GPT-4o-mini (async analysis) | ✅ Dual-LLM architecture proven |
| Embeddings | OpenAI text-embedding-3-small via pgvector | ✅ Cheap, fast |
| Proactive Scheduling | Queue-based worker: pg_cron → background_jobs table → batch Edge Function | ✅ Scales to 10K+ users |
| Payments | Stripe | ✅ Standard |
| Scraping | Jina AI (websites) + user paste (LinkedIn) + Gemini 2.0 grounding (news) | ✅ Legal, low-cost |
| Hosting | Vercel (Next.js) + Supabase (everything else) | ✅ Minimal ops |

**Why NOT heavy frameworks:**
- No LangChain, LlamaIndex, or agent frameworks — too much abstraction, breaks under iteration
- No OpenClaw fork — designed for personal use, not multi-tenant SaaS
- Direct API calls to Claude/GPT with dynamic prompt assembly

---

## 8. Coaching Framework Registry (Core IP)

The coaching engine selects frameworks dynamically based on user context:

### Tier 1: Session Structure (HOW to coach)
- **GROW** — Goal, Reality, Options, Will (default goal-setting)
- **OSKAR** — Outcome, Scaling, Know-how, Affirm, Review (when stuck/demoralized)
- **Motivational Interviewing** — RULE: Resist righting reflex, Understand, Listen, Empower (when resistant)
- **Socratic Questioning** — Deep exploration of beliefs and assumptions

### Tier 2: Business & Execution (WHAT to coach on)
- **EOS/Traction** — 90-day rocks, scorecards, IDS (scaling founders, teams 5+)
- **Lean Startup** — Build-Measure-Learn (pre-PMF founders)
- **Hormozi Offer Optimization** — Value stacking, irresistible offers (revenue challenges)
- **Situational Leadership** — Direct/Coach/Support/Delegate (people management)
- **Robbins RPM** — Results, Purpose, Massive Action (motivation/clarity)

### Tier 3: Mindset & Resilience (WHO the founder is becoming)
- **Stoic Philosophy** — Dichotomy of control, premeditatio malorum
- **Mindfulness** — Grounding, non-judgmental observation, "pause before reacting"
- **PERMA+** — Positive Psychology (burnout, loss of meaning)
- **Growth Mindset** — Reframe failure as learning (impostor syndrome, perfectionism)
- **Stages of Change** — Prochaska model (identify action stage, adapt approach)

### Tier 4: Deep Psychology (Trust-Gated — Month 2+)
Inspired by Joe Hudson (Art of Accomplishment, OpenAI's leadership coach):
- **Three Brains** — Head (beliefs), Heart (emotions), Gut (nervous system)
- **Psychodynamic Coaching** — Childhood patterns → leadership dysfunction
- **Shadow Work** — Unconscious biases, defensive behaviors
- **Narrative Coaching** — Rewrite limiting self-stories
- **Emotional Fluidity** — Feel all emotions without being controlled
- **Inner Critic Work** — Change relationship with the critical inner voice

> **Safety Gate:** Always ask permission before going deep. If declined, respect immediately. Only unlocks at Trust Level 3 (consistent engagement + demonstrated vulnerability).

---

## 9. Key Risks

| Risk | Severity | Probability | Mitigation |
|:---|:---|:---|:---|
| **Churn cliff at Month 3** | 🔴 Critical | High | Proactive engagement, accountability loops, visible progress tracking, progressive coaching depth |
| **ChatGPT commoditization** | 🔴 Critical | High | Persistent memory, proactive outreach, multi-channel — things ChatGPT can't do |
| **Coaching quality ceiling** | 🟡 Medium | Medium | Framework registry with dynamic selection, behavioral calibration, human coach consultation on methodology |
| **AI nagging problem** | 🟡 Medium | Medium | 3-strike per-topic protocol, engagement decay detection, easy opt-out |
| **Legal/safety (crisis)** | 🟡 Medium | Low | Hard disclaimers, crisis detection → human escalation, topic boundaries |
| **LLM costs spike** | 🟡 Medium | Low | Dual-LLM (cheap model for analysis, premium for coaching), daily usage caps |
| **Channel API changes** | 🟢 Low | Low | Channel-agnostic message router, can swap backends |

---

## 10. Strategic Differentiators (Moat Strategy)

1. **Accumulated user context** — After 6 months, the coach knows a founder's business, fears, goals, patterns, relationships, and blockers better than any new tool. Switching cost = losing that relationship.
2. **Coaching methodology IP** — 12+ evidence-based frameworks with dynamic selection logic is hard to replicate without deep coaching expertise.
3. **Proactive cadence** — Daily briefings, weekly reviews, and accountability follow-ups create a habit loop that's hard to break once established.
4. **Anti-nagging protocol** — 3-strike system, engagement decay detection, easy pause — coaches, not nags.
5. **Communication style adaptation** — 8-dimension personality profile calibrated from behavioral signals, not just what users say they prefer.

---

## 11. The 18-Month Roadmap (High-Level)

| Month | Focus | Target MRR | Target Users |
|:---|:---|:---|:---|
| 1–2 | Build MVP, beta test with 20 founders | $0 | 20 (free) |
| 3–4 | Launch at $99/mo, iterate on retention | $2,000 | 40 |
| 5–6 | Introduce $199 tier, content marketing | $8,000 | 80–100 |
| 7–9 | Scale acquisition, add SMS, referral program | $25,000 | 250 |
| 10–12 | Premium tier optimization, retention focus | $50,000 | 400–500 |
| 13–15 | Scale content, partnerships, paid ads | $75,000 | 550–650 |
| 16–18 | Optimize, expand channels, hit target | $100,000 | 720+ |

**Make-or-break metric:** Month 3 retention > 70%. If users don't stay past 90 days, stop scaling and fix the product.

---

## 12. Gate 0 Checklist

- [x] Problem statement clear and validated
- [x] Competitors analyzed (8+ direct, 1 invisible — ChatGPT)
- [x] Target user defined (Solo Founder persona, Scaling CEO secondary)
- [x] Revenue model identified (Freemium: Free/$99/$199)
- [x] Key risks documented (churn, commoditization, coaching quality)
- [x] Technical feasibility confirmed (Supabase + Edge Functions + Telegram + Claude)
- [x] User approved discovery findings

---

## 13. References

- Brain artifact: [coachengine_research.md](file:///Users/thomaswood/.gemini/antigravity/brain/10af7573-b1ce-4f3d-967b-86f7df78a842/coachengine_research.md) — Detailed market research, competitive analysis, channel cost analysis, PRD generation prompt
- Brain artifact: [coaching_frameworks_and_architecture.md](file:///Users/thomaswood/.gemini/antigravity/brain/10af7573-b1ce-4f3d-967b-86f7df78a842/coaching_frameworks_and_architecture.md) — Full coaching framework registry, system architecture, database schema, system prompt architecture, anti-nagging protocol, "wow" onboarding sequence
- Brain artifact: [methodology_recommendation.md](file:///Users/thomaswood/.gemini/antigravity/brain/10af7573-b1ce-4f3d-967b-86f7df78a842/methodology_recommendation.md) — Methodology comparison and BMAD selection rationale
- Brain artifact: [bmad_lite_vs_full.md](file:///Users/thomaswood/.gemini/antigravity/brain/10af7573-b1ce-4f3d-967b-86f7df78a842/bmad_lite_vs_full.md) — Full BMAD vs Lite comparison (decided: Full BMAD with customization)

> **Next Phase:** PRD (directives/PRD.md) — Formal product requirements with acceptance criteria, user journeys, "not in V1" list, and success metrics.
