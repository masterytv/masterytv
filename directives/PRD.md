# Product Requirements Document — Mastery Coach App

> ⛔ **SUPERSEDED / ON HOLD — June 16, 2026.** The project has taken a strategic **detour to Relatti** (relationship coaching). Current direction lives in [`STRATEGY.md`](STRATEGY.md) + [`RELATIONSHIP_PRD.md`](RELATIONSHIP_PRD.md). This document describes the **prior B2C "Mastery Coach + Decoded" direction**; it is **paused, not deleted** (the engine it relies on is reused). **Do not treat the plan, roadmap, pricing, or features below as the current direction.**

> **Author:** Thomas Wood
> **Date:** March 30, 2026
> **Version:** 1.3
> **Status:** ✅ Gate 1 Approved (2026-03-30)
> **Product:** Mastery Coach App (MasteryTV.com/CoachApp)
> **Methodology:** BMAD + Antigravity Method (Phase 1 — PRD)
> **Source:** [DISCOVERY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DISCOVERY.md) (Gate 0 ✅ approved)
> **Companion:** [COACHING_GUARDRAILS.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COACHING_GUARDRAILS.md) — Authoritative intervention safety rules

---

## 1. Executive Summary

### 1.1 Problem

Entrepreneurs and founders need ongoing coaching, but the market presents a false binary: free-but-forgetful AI chat ($20/mo ChatGPT), or expensive-but-effective human coaches ($1,000–$5,000/mo). Neither serves the 31% of coaching clients who are founders — people who need a persistent thinking partner that adapts to their communication style, remembers their business context, follows up on commitments, and meets them wherever they work — email, messaging apps, or the web.

### 1.2 Solution

Mastery Coach is a proactive, multi-channel AI coaching service for entrepreneurs. It combines:

- **Persistent semantic memory** — knows your business, people, goals, and patterns across every conversation
- **Evidence-based coaching framework engine** — dynamically selects from 20+ frameworks (GROW, MI, EOS, Stoic, etc.) based on context
- **Proactive outreach** — morning briefings, accountability check-ins, meeting prep, weekly reviews
- **Communication style adaptation** — 8-dimension behavioral profile calibrated from signals, not just preferences
- **Accountability engine** — tracks commitments, follows up with a 3-strike anti-nagging protocol

### 1.3 Product Vision

> *"An AI coach that knows your business as well as a co-founder and challenges you as well as a $5,000/mo human coach — for $99/mo."*

The coach earns trust through demonstrated context awareness (the "wow" moment), then deepens the relationship over time through progressive profiling, framework escalation, and accumulated memory. The longer someone uses it, the harder it is to leave — because leaving means losing the relationship.

### 1.4 Project Classification

| Attribute | Value |
|:---|:---|
| **Project Type** | SaaS (B2C first → B2B2C later) |
| **Domain** | AI Coaching / Productivity / Mental Performance |
| **Complexity** | High (multi-channel, AI orchestration, proactive scheduling, persistent memory) |
| **Project Context** | Greenfield (new product within existing MasteryTV ecosystem) |
| **BMAD Classification** | Type A — Full Development Project |

---

## 2. Success Criteria

### 2.1 User Success

| Criterion | Measurement | Target |
|:---|:---|:---|
| **User feels "known"** | Post-session survey: "Does your coach understand your business?" | >80% agree within 2 weeks |
| **User completes onboarding** | Passes through onboarding flow and receives first coached insight | >85% of signups |
| **User engages consistently** | Sends ≥3 messages/day on active days | Average across paying users |
| **User acts on coaching** | Commitment completion rate (commitments marked done vs. total) | >40% completion rate |
| **User perceives value** | NPS score | >50 within first 90 days |
| **"Aha" moment** | User receives first business-context-aware coaching response | Within first 5 minutes |

### 2.2 Business Success

| Criterion | 3-Month Target | 6-Month Target | 12-Month Target |
|:---|:---|:---|:---|
| **Paying users** | 40 | 100 | 400–500 |
| **MRR** | $2,000 | $8,000 | $50,000 |
| **Monthly churn** | <15% (early) | <10% | <8% |
| **Trial-to-paid conversion** | >8% | >12% | >15% |
| **LTV:CAC ratio** | >3:1 | >4:1 | >5:1 |
| **Revenue per user (blended)** | $99 | $120 | $139 |

### 2.3 Technical Success

| Criterion | Target |
|:---|:---|
| **Coaching response latency** | <3 seconds p95 (messaging channel round-trip); <5 seconds for email-based responses |
| **Morning briefing delivery** | Within ±5 min of user's preferred time |
| **Memory retrieval relevance** | >80% of retrieved context is relevant (spot-check audit) |
| **System uptime** | >99.5% (excluding scheduled maintenance) |
| **Cost per user per month** | <$15 COGS (LLM + hosting + channels) |

### 2.4 Make-or-Break Metric

> **Month 3 retention > 70%.** If users don't stay past 90 days, stop scaling and fix the product.

---

## 3. User Journeys

### 3.1 Journey 1: The Solo Founder — First Contact (Primary User, Happy Path)

**Persona:** *Sarah, 34, solo founder of a DTC skincare startup. Pre-revenue, post-prototype. Works from home, no co-founder. Tried coaching once at $2,500/mo but couldn't sustain it.*

**Opening Scene:** Sarah sees a LinkedIn post about AI coaching for founders. She clicks through to MasteryTV.com/CoachApp. The landing page speaks directly to her: *"A coach that remembers your business, challenges your thinking, and actually follows up."* She clicks "Get Started" and enters her name, email, LinkedIn URL, and company website.

**Rising Action:** While the system scrapes her website and LinkedIn in the background, the signup flow asks Sarah one thing:

*"Where do you want to start?"* with three options:

1. 🎯 *Tell me about your biggest challenge*
2. 🏔️ *Share your most important goal*
3. 📋 *Follow a systematic onboarding (I'll ask you a few questions)*

Sarah picks "biggest challenge" and types about her struggle to get her first 10 paying customers. By the time she finishes typing, the background research is complete.

The website reveals the results — a research summary card:

> **🔍 Here's what I found:**
>
> 🏢 **Your company:** GlowLab — clean skincare with a focus on sensitive skin
> 📰 **In the news:** Your Product Hunt launch last month got great traction
> 👤 **Your background:** Biotech research → founder. You know the science, you're learning the go-to-market.
> 🎯 **Your challenge:** Getting from prototype traction to repeatable sales
>
> *Does this look right? Anything I should adjust?*

Sarah makes a small correction ("We're DTC, not B2B"), confirms, and clicks "Continue."

**Climax:** The website presents a **Coaching Letter** — a personalized document that sets the tone for the entire relationship:

> *Dear Sarah,*
>
> *I've reviewed your background, your company, and the challenge you shared. Here's what I understand and how I plan to help:*
>
> ***What I see:*** *You're a scientist-turned-founder with a validated product and real traction, but the gap between "people love it" and "people buy it repeatably" is where you're stuck. This is a GTM coaching challenge, not a product problem.*
>
> ***Our approach:*** *Over the next several weeks, I'll be using a combination of goal-setting frameworks (GROW) and revenue optimization strategies (Hormozi Offer Design) to help you build a repeatable customer acquisition engine. I'll adapt as we go — if the challenge shifts from GTM to team-building or mindset, I'll shift with you.*
>
> ***How we'll interact:*** *By default, I'll reach out via email — morning briefings, accountability check-ins, and coaching prompts. But coaching works best when it's woven into how you already work. I'd recommend connecting a messaging app for real-time back-and-forth. Right now, we support Telegram — and more channels are coming soon.*
>
> ***Why responding matters:*** *The more we interact, the better I understand your business, your patterns, and your communication style. Every response makes me a sharper coach. Silence is okay too — I have a strict anti-nagging policy. But consistent engagement is where the magic happens.*
>
> ***What to expect:***
> *- Daily morning briefings tailored to your goals and commitments*
> *- Accountability follow-ups when you commit to something*
> *- Coaching that challenges your thinking, not just validates it*
> *- A weekly recap of your wins, commitments, and patterns*
>
> *Ready to begin?*

Sarah reads the letter and thinks: *"No app has ever understood me this fast."* She clicks "Start Coaching" and optionally connects her Telegram account for messaging.

**Resolution:** Sarah's first coaching session begins — either right there on the web, or in Telegram if she connected it. The coach transitions into GROW framework coaching on her GTM challenge. Twenty minutes later, she has three action items:

1. DM 5 micro-influencers who already use clean skincare
2. Set up Calendly for free skin consultations
3. Write a "Why I Left Biotech" LinkedIn post

For each one, the coach doesn't just assign the task — it recommends how AI can help execute:

> *"For the LinkedIn post — since you're using ChatGPT, try this: paste in your GlowLab website and ask it to draft a 'Why I Left Biotech to Build GlowLab' story in your voice. Give it 3 bullet points of what you want to hit. You'll have a strong first draft in 2 minutes instead of staring at a blank page for an hour."*
>
> *"For the influencer outreach — I'd suggest using Claude for this one. It's better at writing personalized DMs that don't sound like templates. Tell it about each influencer's content and ask for a custom message. Here's a prompt you could use: [...]"*

The coach confirms: *"I've noted all three. I'll check in Wednesday on the influencer outreach. Morning briefings start tomorrow at 8am — by email unless you connect Telegram."*

Sarah closes the tab thinking two things: (1) she just had a real coaching session, and (2) she now knows *how* to use AI tools she was underutilizing. She didn't pay a dollar yet.

**Capabilities Revealed:** Web-first signup flow, background research (website/LinkedIn scraping), research confirmation UX, personalized coaching letter, email as default channel, Telegram as opt-in, conversational AI tool discovery + recommendations, GROW framework coaching, commitment extraction, proactive scheduling.

---

### 3.2 Journey 2: The Solo Founder — Daily Use + Upgrade (Primary User, Monetization Path)

**Persona:** *Sarah, 2 weeks later. She connected Telegram during her first week after seeing the recommendation in her coaching letter.*

**Opening Scene:** Sarah's morning starts with a Telegram notification (she connected it in week 1 after finding email too slow for real-time coaching):

> *"Morning Sarah ☀️ You have 2 skin consultations booked today (11am and 2pm). Yesterday you mentioned the influencer campaign is getting replies — want to prep talking points for the consultations, or should we first debrief on which influencers responded?"*

**Rising Action:** Sarah replies about the consultations. The coach uses Hormozi Offer Optimization to help her structure her consultation pitch as an "irresistible offer" — not just free advice, but a value-stacked experience that naturally leads to purchase. She hits her 5-message daily limit mid-conversation and sees:

> *"You've hit today's free coaching limit. I want to keep helping with this — your consultation is in 3 hours. Upgrade to Core ($99/mo) for unlimited messaging, full accountability tracking, and weekly progress reviews."*

**Climax:** Sarah upgrades because the timing is perfect — she needs help *right now*, not later. The conversation continues seamlessly. After the consultation debrief, the coach notes her energy is low and detects frustration from message sentiment. Instead of pushing more tactics, it shifts to PERMA+ — checking which psychological needs are depleted and suggesting she reconnect with *why* she started GlowLab.

**Resolution:** At the end of the week, Sarah receives a weekly review (via email, with a quick Telegram summary linking to the full report on the dashboard):

> *"Week 2 Recap: You completed 4 of 6 commitments (67% — up from 50% last week). Biggest win: 3 new paying customers from consultations. You mentioned feeling isolated twice this week — have you considered joining a founder community? Let's set a goal around that next week."*

**Capabilities Revealed:** Morning briefing via connected messaging channel, email as default with Telegram enhancement, framework switching (Hormozi → PERMA+), free-tier limits, upgrade flow, weekly review generation, sentiment analysis, engagement tracking.

---

### 3.3 Journey 3: The Scaling CEO — Deep Coaching (Secondary User, Premium Path)

**Persona:** *Marcus, 41, CEO of a 12-person B2B SaaS. Post-Series A. Manages engineering, sales, and product leads. Struggles with delegation and has a VP of Engineering who isn't performing.*

**Opening Scene:** Marcus signs up for Core ($99/mo) after hearing about it from another founder. During web onboarding, he enters his LinkedIn and company website. The background research reveals: 8 years as an IC engineer before becoming CTO, then first-time CEO. The coaching letter identifies the archetype immediately — technical founder struggling with the transition from builder to manager. Marcus connects Telegram right away per the letter's recommendation and starts his first coaching session there.

**Rising Action:** Over 3 weeks, the coach guides Marcus through Situational Leadership (his VP of Engineering needs more direction than Marcus is giving), EOS/Traction (setting 90-day rocks for his team), and Growth Mindset (reframing the discomfort of delegation).

In week 4, Marcus opens up about feeling like a fraud — "I don't know how to be a CEO. I just know how to write code." The coach detects vulnerability + trust level 3 and asks permission:

> *"I'd like to explore something deeper here. What you're describing sounds like more than just a skill gap — there might be a story you're telling yourself about what 'real leaders' look like. Would you be comfortable going there?"*

Marcus says yes.

**Climax:** The coach introduces Narrative Coaching (Tier 4 — trust-gated). It helps Marcus identify the story: *"Real leaders are decisive and charismatic. I'm analytical and quiet. Therefore I'm not a real leader."* The coach challenges this narrative with Socratic questioning: *"Who told you that story? Is it true for every successful CEO? What would you tell your VP if they said the same thing?"*

Marcus has never had anyone challenge that belief this directly — and this safely.

**Resolution:** Marcus upgrades to Premium ($199/mo) for deeper psychology modules and advanced analytics. He starts seeing a "Leadership Growth" dashboard that tracks patterns in his coaching conversations. His monthly review shows a trend: less avoidance of difficult conversations, more delegation, and his team's velocity has increased.

**Capabilities Revealed:** Premium tier features, Tier 4 trust-gated coaching, trust level calculation, Narrative Coaching framework, leadership archetype detection, progressive depth, analytics dashboard, upgrade to Premium.

---

### 3.4 Journey 4: The Disengaged User — Anti-Nagging Recovery

**Persona:** *Sarah, month 3. She's been busy with a product launch and has barely responded in 10 days.*

**Opening Scene:** The coach has detected engagement decay — response rate dropped from 80% to 20% over the past week. It runs the anti-nagging protocol.

**Rising Action:**
- **Strike 1 (Day 3 of silence):** *"Hey Sarah — I noticed you've been quiet. No pressure. When you're ready, I'm curious how the DTC launch went."*
- **Strike 2 (Day 5):** *"Just checking in — if the timing isn't right, say 'pause' and I'll go quiet until you reach out."*
- **Strike 3 (Day 8):** *"I'm going to pause proactive check-ins for now. Whenever you're ready, just send a message and we'll pick right back up. I still have all our context — nothing's lost. 🤝"*

**Climax:** On day 14, Sarah messages via Telegram: *"Hey, I'm back. The launch was intense. I think I need to hire my first employee."* The coach immediately reactivates, retrieves relevant memory, and starts a new coaching thread with zero ramp-up time:

> *"Welcome back! I remember you were debating between a marketing hire and a fulfillment person last month. Has the launch changed that calculus? Let's figure out what role would give you the most leverage right now."*

**Resolution:** Sarah realizes the coach remembered a conversation from 6 weeks ago. The persistent memory just saved her from re-explaining everything. She re-engages with daily use.

**Capabilities Revealed:** Anti-nagging 3-strike protocol, engagement decay detection, proactive pause, re-engagement flow, semantic memory retrieval, contextual re-entry.

---

### 3.5 Journey 5: The Admin — System Management

**Persona:** *Thomas (you), product owner and system admin.*

**Opening Scene:** Thomas logs into the web dashboard at MasteryTV.com/CoachApp/admin. He sees the admin overview: active users, engagement rates, revenue metrics, framework usage distribution, and system health.

**Rising Action:** He notices that 3 users haven't responded in 14+ days and are approaching churn risk. He clicks into each user's anonymized coaching summary to understand patterns — is it a product issue or life-got-busy? He also checks the framework usage stats: GROW is used 40% of the time, Stoic 20%, Hormozi 15%. He wonders if the framework selector is over-indexing on GROW.

He adjusts the morning briefing global settings to stagger delivery across timezones (the 9am EST batch was causing Edge Function cold start delays). He also reviews flagged conversations: 1 user triggered the crisis detection protocol — the system correctly paused coaching and displayed crisis resources.

**Climax:** Thomas reviews the billing metrics: 12 users on Core, 3 on Premium, 15 on free. Trial-to-paid conversion is 10% — on target. He exports the weekly report for investor updates.

**Resolution:** Thomas pushes a configuration change to the coaching engine — adjusting the framework selection weights to reduce GROW dominance and increase Hormozi usage for revenue-focused users. The change takes effect immediately via the framework registry config.

**Capabilities Revealed:** Admin dashboard, user engagement monitoring, framework usage analytics, system health monitoring, billing metrics, crisis flag review, framework config management, timezone-aware scheduling controls.

---

### Journey Requirements Summary

| Journey | Key Capabilities Revealed |
|:---|:---|
| First Contact | Web onboarding, background research, research confirmation, coaching letter, email default, Telegram opt-in, AI tool inventory + recommendations, GROW coaching, commitment extraction, scheduling |
| Daily Use + Upgrade | Morning briefings, email + Telegram channels, framework switching, free tier limits, upgrade flow, weekly review, sentiment analysis |
| Deep Coaching | Trust gating, Tier 4 frameworks, personality archetypes, analytics dashboard, Premium features |
| Anti-Nagging Recovery | 3-strike protocol, engagement decay, pause/resume, semantic memory retrieval |
| Admin | Dashboard, analytics, billing, crisis review, framework config, system health |

---

## 4. Core Features & Acceptance Criteria

### 4.1 Onboarding & Profile Enrichment

| Feature | Acceptance Criteria |
|:---|:---|
| **Web signup** | User enters name, email, LinkedIn URL, and company website → account created in Supabase Auth → proceeds to onboarding flow |
| **Background research** | System scrapes website (Jina AI Reader API) and LinkedIn in the background while user answers onboarding question → research completes before user finishes typing |
| **Choice-based onboarding** | Web form presents 3 options (biggest challenge, biggest goal, systematic onboarding) → user picks one and provides text input → stored as initial coaching context |
| **Research confirmation** | Web displays structured research summary (company, background, news, challenge) → user can edit/correct → confirmed facts stored as memory_facts |
| **Coaching letter** | System generates a personalized coaching letter that summarizes: what the coach understands about the user, the proposed coaching approach, how interactions will work (email default + messaging app recommendation), why responding matters, and what to expect over the coming days/weeks |
| **Channel connection** | After coaching letter, user is prompted: "We'll reach out by email by default. For real-time coaching, connect a messaging app." Currently supports Telegram; user can connect now or later from dashboard |
| **Telegram connection (optional)** | User clicks Telegram connect link → bot sends welcome message within 5 seconds → user authenticated against web account → preferred_channel updated to 'telegram' |
| **Initial coach profile creation** | After onboarding conversation, 8-dimension communication style profile initialized with default values + self-reported signals |

### 4.2 Coaching Engine

| Feature | Acceptance Criteria |
|:---|:---|
| **Dynamic prompt assembly** | System prompt = Base Persona + Active Challenges/Frameworks + Intervention Selector (Heron's 6 Categories) + User Profile + Communication Style + Retrieved Memory + Coaching Agenda + AI Tool Context + Authoritative Guardrails + Safety Guardrails — assembled per message. See ARCHITECTURE.md §5.2 for full 11-layer spec |
| **Framework registry** | 20+ frameworks organized into 4 tiers, with selection logic based on topic detection, user stage, trust level, and engagement signals |
| **Framework selection** | Engine assigns frameworks per-challenge (not per-message); framework persists across sessions until challenge is resolved, evolved, or paused. Selection logged to framework_usage table. Multiple challenges can be active simultaneously |
| **Coaching response** | Claude 3.5 Sonnet generates response; response includes coaching content + extracted metadata (new facts, commitments, sentiment) |
| **Commitment extraction** | LLM identifies action items and commitments in structured output; stored in commitments table with due dates and status |
| **AI tool recommendations** | When coaching produces action items, the engine evaluates whether AI tools could accelerate execution. If the user has known tools (from prior conversations), it generates a tool-specific prompt. If not, it asks: "Do you have a favorite AI tool for [task], or would you like me to recommend one?" User's tool preferences are stored as memory_facts for future recommendations |
| **AI tool knowledge** | System maintains awareness of current AI tools and their strengths (e.g., Claude for writing, ChatGPT for brainstorming, Midjourney for visuals); knowledge updated periodically; used to match tools to tasks. On-demand Perplexity API lookup for tools not in the database |
| **Memory storage** | Every message stored in messages table with embedding (text-embedding-3-small); extracted facts stored in memory_facts with category, importance, and embedding |
| **Semantic memory retrieval** | On each user message, top-K relevant memory_facts and past messages retrieved via pgvector cosine similarity; injected into prompt context |
| **Communication style adaptation** | Coaching response applies user's 8-dimension behavioral profile; profile updated after each interaction based on behavioral signals (response time, message length, action completion) |
| **Trust level tracking** | Trust level (1–5) calculated from: session count, vulnerability signals, consistent engagement, action completion rate; Tier 4 frameworks unlock at trust level ≥3 |
| **Dual-LLM architecture** | Claude 3.5 Sonnet for real-time coaching; GPT-4o-mini for async analysis (profile updates, commitment extraction, memory summarization) |

### 4.3 Proactive Outreach System

| Feature | Acceptance Criteria |
|:---|:---|
| **Morning briefing** | Generated daily at user's preferred time (±5 min); content based on: calendar events, pending commitments, detected patterns, or generic check-in; delivered via user's preferred channel |
| **Accountability check-in** | For commitments with due dates, bot follows up on due date; references specific commitment by name/description |
| **Meeting prep** | If calendar event detected, bot sends prep message 30–60 min before; includes context from prior conversations about the people/topic involved |
| **Weekly review** | Generated Friday afternoon; includes: commitments completed vs. total, biggest win, patterns noticed, suggestion for next week |
| **3-strike anti-nagging protocol** | Per-topic: Strike 1 (proactive message), Strike 2 (24h later, softer angle), Strike 3 (48h later, explicit pause + easy opt-back-in). Topic is paused until user re-initiates |
| **Engagement decay detection** | If response rate drops below 50% over 7 days, reduce outreach frequency automatically; send meta-check-in asking about preferred cadence |
| **Weekly coaching session** | Coach-led strategic session generated weekly (Sunday evening); coach initiates with 2-3 proactive questions based on patterns, stalled goals, and unresolved entities from the past week. This is the coach leading — not a status update but a strategic "I've been thinking about..." message |
| **Monthly progress review** | Structured growth reflection generated monthly showing: quantitative metrics (commitments completed, engagement trends), qualitative insights (patterns addressed, stories reframed, breakthroughs), entities resolved (fears confronted, goals achieved), and recommended coaching focus for next month |
| **Timezone-aware scheduling** | All proactive messages scheduled in user's local timezone; batch delivery staggered across 30-minute windows to prevent Edge Function overload |
| **Background job queue** | pg_cron triggers batch Edge Function → reads scheduled_messages table → generates and sends messages → updates status |

### 4.4 Messaging & Channel Layer

| Feature | Acceptance Criteria |
|:---|:---|
| **Email as default channel** | All users receive coaching via email by default (morning briefings, accountability check-ins, coaching prompts); email formatted as rich HTML with clear reply CTA; replies parsed and routed to coaching engine |
| **Telegram bot integration** | Webhook receives user messages → normalizes to internal format → routes to coaching engine → sends response back via Telegram Bot API; only active for users who connect Telegram |
| **Message router (channel-agnostic)** | Normalizes messages from any channel (email, Telegram, web) into unified format: `{user_id, channel, content, timestamp, metadata}`; routes to coaching engine regardless of origin |
| **Web chat** | Users can interact with their coach directly from the dashboard in a chat-style interface; messages routed through the same coaching engine |
| **Conversation threading** | Messages grouped into logical conversations regardless of channel; new conversation started after 4+ hours of inactivity or topic change |
| **Channel-appropriate formatting** | Email: rich HTML with coaching layout. Telegram: Markdown (bold, italic, bullet lists, emoji). Web: styled chat interface. No raw markup leaking on any channel |
| **Typing indicator** | Telegram: sends "typing..." action while LLM generates response. Web: shows typing animation |

### 4.5 User Dashboard (Web)

| Feature | Acceptance Criteria |
|:---|:---|
| **Auth & Settings** | User can log in via Supabase Auth (magic link or social); view/edit profile, timezone, preferred channel, morning briefing time, connected messaging apps |
| **Onboarding research view** | User can re-read their research summary and coaching letter from onboarding; can update or correct any facts |
| **Coach profile view** | User can view their 8-dimension communication style profile (visual representation); can flag dimensions that feel wrong → triggers recalibration |
| **Channel management** | User can connect/disconnect Telegram; see current default channel (email); change preferred channel for proactive outreach |
| **Commitment tracker** | User sees all active/completed/missed commitments; can mark commitments complete or reschedule from dashboard |
| **Progress timeline** | Chronological view of coaching milestones, key decisions, wins, and patterns noted |
| **Weekly/Monthly reports** | Read-only view of generated coaching summaries with engagement stats |

### 4.6 Subscription & Billing

| Feature | Acceptance Criteria |
|:---|:---|
| **Free tier** | 5 messages/day, proactive outreach enabled, calendar sync enabled, forever-free — generous enough to build relationship |
| **Core tier ($99/mo)** | Unlimited messaging, full coaching frameworks, accountability engine, weekly reviews, dashboard access |
| **Premium tier ($199/mo)** | Everything in Core + Tier 4 deep psychology, priority response, advanced analytics, co-founder coaching mode |
| **Stripe integration** | Checkout, subscription management, dunning, webhooks for status changes; subscription_tier updated in users table on Stripe webhook events |
| **Upgrade triggers** | In-context nudges when: user hits daily limit during active conversation, premium insight detected, after 2 weeks of consistent engagement, weekly review reveals locked value |
| **Annual plans** | 2 months free: Core $990/year, Premium $1,990/year |

### 4.7 Safety & Crisis Handling

| Feature | Acceptance Criteria |
|:---|:---|
| **Crisis detection** | LLM monitors for: suicidal ideation, self-harm, severe mental health crisis, domestic violence; uses keyword + context analysis |
| **Crisis response** | Immediately pauses coaching; displays empathetic message + professional resources (988 Lifeline, Crisis Text Line); flags conversation for admin review |
| **Topic boundaries** | Bot explicitly declines: legal advice, tax/financial advice, medical advice, HR/employment law, regulatory compliance; redirects to "talk to a professional" with an offer to help prepare questions for that professional |
| **Prescriptive guardrails** | When giving advice (Prescriptive intervention), the coach frames recommendations as options, asks permission before advising, returns ownership to the user, and never uses directive language ("you must", "you should"). See COACHING_GUARDRAILS.md §1 |
| **Informative guardrails** | When sharing facts (Informative intervention), the coach distinguishes between coaching-safe knowledge (state directly), verifiable claims (must ground via real-time search before stating), and prohibited facts (redirect to professional). All sourced facts include citations. See COACHING_GUARDRAILS.md §2 |
| **Safety disclaimers** | On first use and periodically: "I'm an AI coaching tool, not a therapist, lawyer, or financial advisor" |
| **Tier 4 consent** | Before activating deep psychology frameworks, bot explicitly asks permission; respects decline immediately |

---

## 5. Product Scope

### 5.1 MVP — Minimum Viable Product (Phase 1)

**MVP Philosophy:** Problem-solving MVP — prove that an AI coach with persistent memory, proactive outreach, and framework-based coaching retains founders past 90 days.

**Must-Have for MVP:**

- Web-first onboarding flow with background research (website + LinkedIn scraping), research confirmation, and personalized coaching letter
- Email as default coaching channel (morning briefings, accountability check-ins, coaching prompts via email)
- Telegram as opt-in messaging channel (recommended during onboarding for real-time coaching)
- Web chat interface in dashboard for direct coaching interaction
- Coaching engine with Tier 1 + Tier 2 frameworks (6–8 frameworks)
- Persistent memory (pgvector semantic search + structured memory_facts)
- Dynamic prompt assembly with communication style adaptation
- Commitment extraction and basic accountability follow-up
- Morning briefing (daily, timezone-aware, via preferred channel)
- Free tier (5 msgs/day) + Core tier ($99/mo) via Stripe
- Basic web dashboard (auth, settings, commitment tracker, coaching letter, channel management)
- Safety: crisis detection + topic boundaries + disclaimers
- AI tool awareness: discover user's tools conversationally (not during onboarding), recommend AI tools + prompts for action items
- Anti-nagging 3-strike protocol

**MVP User Journeys Supported:**
- Journey 1: First Contact (full)
- Journey 2: Daily Use + Upgrade (full)
- Journey 4: Anti-Nagging Recovery (full)
- Journey 5: Admin (basic — user list, engagement metrics, crisis flags)

### 5.2 Explicit "Not in V1" List

> [!IMPORTANT]
> The following features are intentionally excluded from MVP to keep scope tight and validate the core thesis first.

| Feature | Why Not V1 | Target Phase |
|:---|:---|:---|
| **SMS channel (Twilio)** | Adds cost + complexity; email + Telegram validates the concept | Phase 2 |
| **Calendar integration (Google OAuth)** | Adds OAuth complexity; morning briefings work without it | Phase 2 |
| **Meeting prep coaching** | Requires calendar; defer until calendar integration | Phase 2 |
| **Premium tier ($199/mo)** | Need to prove Core retention first | Phase 2 |
| **Tier 3 frameworks (Mindset)** | Tier 1+2 covers 80% of use cases | Phase 2 |
| **Tier 4 frameworks (Deep Psychology)** | Requires trust-gating infrastructure + careful prompt engineering | Phase 2 |
| **Advanced analytics dashboard** | Users need coaching first, not data | Phase 2 |
| **Weekly/Monthly review generation** | Nice but not essential for MVP retention test | Phase 2 |
| **Communication style behavioral calibration** | Start with self-reported; behavioral override later | Phase 2 |
| **B2B2C multi-org support** | Solo founders first; enterprise later | Phase 3 |
| **Co-founder coaching mode** | Niche feature; validate core product first | Phase 3 |
| **Referral program** | Growth mechanic; need product-market fit first | Phase 2 |
| **Mobile app (native)** | Telegram IS the app; web dashboard for settings | Phase 3+ |
| **Voice coaching** | Significant complexity; text-first validates faster | Phase 3+ |
| **AI-generated content (courses, playbooks)** | Content product ≠ coaching product | Phase 3+ |
| **Team coaching (multi-user orgs)** | Validate 1:1 coaching first | Phase 3 |
| **BYOK (Bring Your Own Key)** | Users add their own LLM API keys so the coach can execute tasks directly (e.g., draft the LinkedIn post, write the email); requires secure key storage + task execution engine | Phase 2 |
| **Token-based task execution** | Users purchase or earn tokens to spend on coach-executed tasks (content drafts, research, analysis) without providing their own API keys | Phase 3 |

### 5.3 Growth Features (Phase 2: Months 4–9)

- SMS channel via Twilio (additional messaging option alongside email + Telegram)
- Google Calendar integration + meeting prep coaching
- Premium tier ($199/mo) with Tier 3+4 frameworks
- Behavioral communication style calibration (overrides self-reported)
- Weekly + monthly review generation
- Advanced analytics dashboard (leadership growth trends, framework usage patterns)
- Referral program (give a friend 1 month free)
- Framework selection A/B testing infrastructure
- BYOK (Bring Your Own Key): users add LLM API keys so the coach can execute tasks (draft content, write emails, research) on their behalf

### 5.4 Vision Features (Phase 3: Months 10–18)

- B2B2C: Organizations can enroll teams with custom branding/frameworks
- Team coaching mode (shared context, multi-user goals)
- Mobile app (lightweight, complementary to Telegram)
- Voice note coaching (transcription + coaching on audio messages)
- AI-generated personalized playbooks based on coaching history
- Marketplace for human coaches to create custom framework packs
- Token-based task execution: users purchase tokens for coach-executed work without providing their own API keys
- Public API for integrations (Slack, calendars, CRMs)

---

## 6. Functional Requirements

### 6.1 User Management

- **FR1:** Users can sign up with name, email, LinkedIn URL, and company website via web landing page
- **FR2:** Users can authenticate via magic link email or social OAuth (Google)
- **FR3:** Users can optionally connect their Telegram account to their web account during or after onboarding
- **FR4:** Users can view and update their profile settings (timezone, morning briefing time, preferred channel, connected messaging apps)
- **FR5:** Users can view their communication style profile and flag any dimension for recalibration
- **FR6:** System generates and stores a unique coach profile for each user with 8 behavioral dimensions

### 6.2 Coaching & Conversation

- **FR7:** Users can send messages to their AI coach via email reply, web chat, or Telegram (if connected) and receive contextual coaching responses
- **FR8:** System selects the most appropriate coaching framework based on the user's message content, emotional state, business stage, and trust level
- **FR9:** System retrieves semantically relevant past memories and facts before generating each coaching response
- **FR10:** System assembles a dynamic prompt from base persona, active challenges/frameworks, intervention selector, user profile, communication style, retrieved memory, coaching agenda, authoritative guardrails, and safety guardrails for every response (11-layer architecture)
- **FR11:** System extracts and stores structured facts (people, goals, challenges, wins, preferences) from every conversation
- **FR12:** System detects and extracts commitments with due dates from coaching conversations
- **FR13:** System scrapes user's website and LinkedIn during onboarding signup (background process) and builds initial business context
- **FR14:** System presents research findings to user for confirmation/correction before storing as validated memory_facts
- **FR14b:** System generates a personalized coaching letter based on confirmed research + selected starting point (challenge/goal/systematic) summarizing understanding, approach, interaction expectations, and what to expect
- **FR14c:** System discovers user's AI toolset conversationally — when coaching produces an action item that AI could accelerate, the coach asks what tools the user prefers (if not already known) and stores their preferences as memory_facts
- **FR14d:** When coaching produces action items, system evaluates whether AI tools can accelerate execution. If user has known tools, generates tool-specific prompts. If not, asks the user or recommends from the `ai_tools` knowledge base. If tool is not in the database, performs on-demand lookup via Perplexity API

### 6.3 Proactive Outreach

- **FR15:** System sends personalized morning briefings at users' preferred time based on pending commitments and context
- **FR16:** System sends accountability check-in messages when commitment due dates are reached
- **FR17:** System varies proactive message types across the week (planning, accountability, insight, challenge, wins)
- **FR18:** System applies 3-strike anti-nagging protocol per topic (proactive → softer follow-up → explicit pause)
- **FR19:** System detects engagement decay and automatically reduces outreach frequency
- **FR20:** Users can pause all proactive outreach (say "pause") and resume at any time
- **FR20a:** System generates weekly coach-led strategic sessions with proactive questions referencing specific user entities, patterns, and stalled goals
- **FR20b:** System generates monthly progress reviews showing quantitative and qualitative growth metrics, resolved entities, and recommended next coaching focus

### 6.4 Accountability & Progress

- **FR21:** Users can view all active, completed, and missed commitments
- **FR22:** Users can mark commitments as complete or reschedule them
- **FR23:** System tracks commitment completion rate as a user metric
- **FR24:** System generates progress summaries showing commitments, wins, and patterns over time

### 6.5 Subscription & Billing

- **FR25:** Users can subscribe to a paid tier (Core $99/mo) via Stripe checkout
- **FR26:** System enforces free tier limits (5 messages/day) and prompts upgrade at contextually relevant moments
- **FR27:** Users can manage their subscription (upgrade, downgrade, cancel) from the web dashboard
- **FR28:** System processes Stripe webhook events to update subscription status in real-time

### 6.6 Safety & Boundaries

- **FR29:** System detects crisis signals (suicidal ideation, self-harm) in user messages and responds with professional resources
- **FR30:** System explicitly declines to provide advice in 6 prohibited domains (legal, tax, medical, financial, HR/employment law, regulatory compliance) and redirects to professionals with an offer to help prepare questions
- **FR31:** System displays coaching disclaimers on first use and periodically during engagement
- **FR32:** System requires explicit user consent before activating deep psychological coaching frameworks (Phase 2)
- **FR37:** When giving advice (Prescriptive interventions), system frames recommendations as options, asks permission, returns ownership, and never uses directive language ("you must", "you should")
- **FR38:** When sharing verifiable facts (statistics, market data, current events), system grounds claims via real-time search and cites sources. Coaching-safe knowledge (frameworks, general principles) may be stated directly
- **FR39:** System never states facts in prohibited domains (tax codes, legal statutes, medical dosages) and redirects to professionals

### 6.7 Administration

- **FR33:** Admin can view aggregate user engagement metrics (active users, response rates, churn risk)
- **FR34:** Admin can review crisis-flagged conversations
- **FR35:** Admin can view framework usage distribution and adjust selection weights
- **FR36:** Admin can view billing metrics (subscribers by tier, MRR, conversion rate)

---

## 7. Non-Functional Requirements

### 7.1 Performance

- **NFR1:** Coaching responses delivered within 3 seconds p95 (messaging channels); within 5 seconds for email-initiated coaching flows
- **NFR2:** Semantic memory retrieval completes within 200ms for up to 10,000 memory_facts per user
- **NFR3:** Morning briefing generation and delivery completes within 30-second window per user
- **NFR4:** Web dashboard pages load within 1.5 seconds (p95)

### 7.2 Security

- **NFR5:** All data encrypted at rest (Supabase default) and in transit (TLS)
- **NFR6:** Row Level Security (RLS) enforced on all user-facing tables — users can only access their own data
- **NFR7:** API keys (LLM, Telegram, Stripe) stored in environment variables, never in code
- **NFR8:** Telegram webhook verified via secret token on every request
- **NFR9:** Stripe webhook signatures verified on every event
- **NFR10:** Admin endpoints require authenticated admin role

### 7.3 Scalability

- **NFR11:** Architecture supports 10,000 concurrent users without re-architecture (Supabase + Edge Functions + pgvector)
- **NFR12:** Proactive messages staggered across 30-minute timezone windows to prevent burst load
- **NFR13:** LLM costs remain below $15/user/month at full feature utilization
- **NFR14:** Message storage supports indefinite history with periodic summarization for older conversations

### 7.4 Reliability

- **NFR15:** System uptime >99.5% measured monthly
- **NFR16:** Failed proactive messages retry up to 3 times with exponential backoff
- **NFR17:** Health check cron alerts admin if no messages processed in 15 minutes
- **NFR18:** LLM fallback: if Claude is unavailable, fall back to GPT-4o with quality logging

### 7.5 Privacy & Compliance

- **NFR19:** Users can request full data export (GDPR Article 20)
- **NFR20:** Users can request complete data deletion (GDPR Article 17)
- **NFR21:** Coaching conversation data is never used for model training
- **NFR22:** Privacy policy clearly states: data usage, retention, third-party sharing (LLM APIs)

---

## 8. Technical Constraints & Architecture Notes

> [!NOTE]
> These are constraints carried forward from Discovery. Full architecture will be defined in `directives/ARCHITECTURE.md` (Phase 2).

| Constraint | Rationale |
|:---|:---|
| **Supabase for everything** (DB, Auth, Edge Functions, vectors, cron) | One platform reduces ops burden; team of 1 + AI agent |
| **No LangChain / LlamaIndex / agent frameworks** | Too much abstraction; direct API calls are more maintainable |
| **Direct LLM API calls** | Dynamic prompt assembly is our IP; frameworks hide the logic |
| **Email as default channel + Telegram as opt-in** | Email is universal (no app install); Telegram adds real-time coaching for engaged users |
| **Next.js dashboard inside MasteryTV** | Leverages existing infrastructure and brand |
| **Claude 3.5 Sonnet primary** | Best instruction-following for coaching persona |
| **GPT-4o-mini for async work** | Cheaper; used for extraction, summarization, profile updates |
| **Stripe for billing** | Standard; well-documented; handles global payments |

---

## 9. Open Questions for Architecture Phase

> [!WARNING]
> These must be resolved during Architecture (Phase 2) before build begins.

1. **Embedding model selection:** text-embedding-3-small (1536d) vs. a smaller model? Trade-off: quality vs. storage/cost at scale.
2. **Conversation summarization cadence:** After how many messages do we summarize old conversations? Need to prevent prompt bloat while preserving important context.
3. **Framework selection confidence:** Should the framework selector output a confidence score? If confidence < threshold, should it ask the user which framework to use?
4. **Calendar integration architecture:** OAuth flow for Google Calendar — where does the token live? Edge Function or separate service?
5. **Telegram bot webhook vs. polling:** Webhook is preferred but requires public HTTPS endpoint. Supabase Edge Function handles this natively. Confirm latency is acceptable.
6. **Crisis detection model:** Pure LLM-based (prompt instruction) vs. keyword classifier + LLM confirmation? False positive vs. false negative trade-off.
7. **Multi-tenant RLS design:** When we add B2B2C, do we need a separate schema or is `org_id` on the users table sufficient?

---

## 10. Gate 1 Checklist

- [x] **Core features defined with acceptance criteria** — Section 4: 36 FRs across 7 capability areas, each with measurable acceptance criteria
- [x] **User journey mapped (onboarding → daily use → upgrade)** — Section 3: 5 narrative journeys covering first contact, daily engagement, premium path, re-engagement, and admin
- [x] **MVP scope bounded (explicit "not in V1" list)** — Section 5.2: 17 features explicitly deferred with rationale and target phase
- [x] **Success metrics defined (KPIs, retention targets)** — Section 2: User success (6 metrics), Business success (6 metrics with 3/6/12-month targets), Technical success (5 metrics), plus make-or-break metric

---

## 11. References

| Document | Location |
|:---|:---|
| DISCOVERY.md (Gate 0 ✅) | [directives/DISCOVERY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DISCOVERY.md) |
| Coaching Frameworks & Architecture | [coaching_frameworks_and_architecture.md](file:///Users/thomaswood/.gemini/antigravity/brain/10af7573-b1ce-4f3d-967b-86f7df78a842/coaching_frameworks_and_architecture.md) |
| Market Research | [coachengine_research.md](file:///Users/thomaswood/.gemini/antigravity/brain/10af7573-b1ce-4f3d-967b-86f7df78a842/coachengine_research.md) |
| BMAD Methodology (Full v6.2.2) | [_bmad/](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/_bmad/) |
| Antigravity Method | [GEMINI.md](file:///Users/thomaswood/.gemini/GEMINI.md) §8–§9 |

> **Next Phase:** Architecture (`directives/ARCHITECTURE.md`) — Tech stack rationale, database schema, API contracts, security model, ADRs.
