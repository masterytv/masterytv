# The Coaching Brain — Decision Architecture Map

> **Author:** Thomas Wood + Antigravity Orchestrator
> **Date:** March 31, 2026
> **Version:** 1.0
> **Purpose:** Reference document for how the Mastery Coach AI makes decisions at every level — from individual messages to the arc of the coaching relationship.
> **Sources:** ICF Core Competencies (2020), Heron's Six Category Intervention Framework (1975), Ivey's Microskills Hierarchy, Co-Active Coaching Model (CTI)
> **Companion:** [COACHING_GUARDRAILS.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COACHING_GUARDRAILS.md) — Authoritative intervention safety rules

---

## 1. Three Levels of Coaching Intelligence

The AI coach operates at three distinct levels simultaneously, just like a human coach:

```
┌──────────────────────────────────────────────────────────────────┐
│  🧠 MACRO — The Strategist                                       │
│  Scope: Monthly / phase transitions                               │
│  Thinks about: "Where is this user in their coaching journey?"   │
│  Outputs: Arc phase detection, progress reviews, monthly plan     │
├──────────────────────────────────────────────────────────────────┤
│  📋 MESO — The Session Planner                                    │
│  Scope: Weekly                                                    │
│  Thinks about: "What should we work on next? What's unresolved?" │
│  Outputs: Coaching agenda, weekly coaching session, framework     │
│           reviews, proactive coaching questions                    │
├──────────────────────────────────────────────────────────────────┤
│  💬 MICRO — The Conversationalist                                 │
│  Scope: Per-message                                               │
│  Thinks about: "What intervention fits this moment? How do I     │
│  deliver it for this specific person?"                            │
│  Outputs: Coaching responses                                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. The Three Decision Layers (Per-Message)

Every coaching response is the product of three distinct decisions:

### Layer 1: Framework (Per-Challenge)

**"What methodology are we using to work on this challenge?"**

- Selected when a challenge or goal is identified — NOT per message
- Persists across many conversations (days, weeks, months)
- Multiple can be active simultaneously (one per active challenge)
- Changed by the MESO weekly planner when: challenge evolves, resolves, or a new one emerges

**Example:** "We're using GROW to work through your GTM strategy. We're in the Options phase."

**Framework Lifecycle:**

```
1. TRIGGER → Challenge or goal identified in conversation
2. SELECTION → Match challenge to best framework
   (by challenge type, user stage, trust level)
3. ACTIVE → Framework guides multiple conversations
   (each framework has phases the coach tracks)
4. EVOLVE/RESOLVE → MESO reviews weekly
   ├── Resolved → deactivate
   ├── Evolved → may change framework
   └── New connected challenge → new framework added
```

**Multiple Active Frameworks Example:**

| Challenge | Framework | Phase | Since |
|:---|:---|:---|:---|
| GTM: get first 10 customers | GROW | Options | Week 1 |
| Imposter feelings before investors | Growth Mindset | Ongoing | Week 3 |
| VP of Engineering not performing | Situational Leadership | Diagnosis | Week 2 |
| "I'm not a real CEO" identity | Narrative Coaching (Tier 4) | Reauthoring | Week 4 |

---

### Layer 2: Intervention (Per-Message)

**"What should the coach DO right now in this conversation?"**

Based on **Heron's Six Category Intervention Framework** (1975) — a research-backed taxonomy used in professional coaching training.

#### The 6 Interventions (2 Styles)

| Style | Intervention | What the Coach Does | When to Use |
|:---|:---|:---|:---|
| **Authoritative** | **Prescriptive** | Give specific advice, suggest actions | User needs direction, is stuck on execution, asks "what should I do?" ⚠️ [See Guardrails §1](COACHING_GUARDRAILS.md) — prohibited domains, delivery rules |
| | **Informative** | Provide knowledge, facts, or feedback | User lacks information needed to act, or needs to see data ⚠️ [See Guardrails §2](COACHING_GUARDRAILS.md) — fact grounding via Perplexity |
| | **Confronting** | Challenge behavior, assumptions, or patterns | User is avoiding, rationalizing, or repeating harmful patterns |
| **Facilitative** | **Cathartic** | Create safe space for emotional expression | User is processing something heavy, needs to vent or release |
| | **Catalytic** | Ask open questions to spark self-discovery | User has the answer within them, needs to think it through |
| | **Supportive** | Affirm strengths, celebrate, build confidence | User needs validation, had a win, or is demoralized |

#### How Intervention Selection Works

The intervention is NOT random. It's chosen based on:

1. **The active framework's current phase** — GROW's "Reality" phase naturally calls for Catalytic (exploring). GROW's "Will" phase calls for Prescriptive or Confronting (committing).
2. **The user's emotional state** — If the user is upset, Cathartic or Supportive overrides the framework phase.
3. **The user's intervention biases** — Two of the 8 profile dimensions directly influence which intervention is preferred (see §3 below).

```
Framework phase suggests: Prescriptive (time to commit to action)
User's emotional state: frustrated, low energy
User's autonomy bias: high (prefers Socratic)

→ Override: Use Catalytic instead
  "What's the smallest version of this you could try this week?"
  (Not: "Here are your 3 action items.")
```

---

### Layer 3: Delivery Style (Per-User)

**"HOW should I say this, given who this person is?"**

The 8 dimensions from the coach profile. BUT — they split into two types:

#### 2 Intervention Biases (Influence WHICH Intervention)

These dimensions don't just change how the coach talks — they bias which intervention the coach selects:

| Dimension | What It Biases | Low End | High End |
|:---|:---|:---|:---|
| **Autonomy** | Authoritative ↔ Facilitative preference | Bias toward Prescriptive/Informative | Bias toward Catalytic/Cathartic |
| **Challenge Level** | Confronting readiness | Confronting only with trust + high stakes | Confronting available anytime |

#### 6 Delivery Modulations (Influence HOW Intervention is Delivered)

These are pure style — they modulate the delivery of any intervention:

| Dimension | What It Modulates | Low End | High End |
|:---|:---|:---|:---|
| **Directness** | How bluntly the coach speaks | Diplomatic, contextual | Blunt, straight |
| **Framing** | Risk vs. opportunity language | "If you don't X, you'll lose..." | "If you X, you could gain..." |
| **Warmth** | Emotional wrapping | Challenge-first | Relationship-first |
| **Pacing** | Follow-up frequency | Spacious, less outreach | High-frequency check-ins |
| **Evidence Style** | Data vs. stories | Numbers, logic, analysis | Narratives, metaphors, analogies |
| **Accountability** | External push vs. internal trust | "I trust you'll follow through" | "I'll check on this Wednesday" |

---

## 3. Conflict Resolution: When Style and Situation Disagree

**Rule: Style sets the default bias. Situation can override in high-stakes moments.**

### The Two Real Tensions

#### Tension 1: Prescriptive Intervention × High Autonomy (Socratic)

| Stakes | Resolution | Example |
|:---|:---|:---|
| **Low** | Follow the bias → use Catalytic instead | "What approach feels right to you?" (even though you know the answer) |
| **High** | Override + meta-acknowledge | "I usually let you work through these, but I want to be direct here: the pattern you're describing has cost you 3 months. Here's what I'd do..." |

#### Tension 2: Confronting Intervention × Low Challenge Level

| Stakes | Resolution | Example |
|:---|:---|:---|
| **Low** | Follow the bias → use Catalytic instead | "I've noticed something. Three times now, a similar situation has come up. What do you make of that?" |
| **High** | Override + soften entry | "I want to share an observation, and you can tell me if it doesn't land... You've avoided this conversation three times. What would happen if you had it this week?" |

### All Other Combinations: Pure Modulation (No Conflict)

Every other pairing works cleanly:
- **Confronting + High Warmth** → Warm challenge: "Because I care about your growth, I need to name something..."
- **Supportive + High Directness** → Direct celebration: "That was a big deal. You built that."
- **Prescriptive + Low Directness** → Diplomatic advice: "One approach that often works is..."
- **Cathartic + Low Warmth** → Space without sentiment: "That's real. Take a second. Then let's figure out what to do."

---

## 4. The MESO Layer — Weekly Session Planner

**Trigger:** Weekly async job (e.g., Sunday evening)
**Model:** GPT-4o (~3K tokens in, ~1K out, ~$0.05/user/week)
**Output:** Coaching agenda + weekly coaching session message

### What the Session Planner Does

```
1. REVIEW — What happened this week?
   • Load conversations from past 7 days
   • Load active entities (goals, fears, patterns, people)
   • Load commitment completion rate
   • Load framework usage + engagement signals

2. ASSESS — What's the coaching state?
   • Which goals progressed? Which stalled?
   • Any new patterns emerging (3+ occurrences)?
   • Any fears/triggers surfaced but not addressed?
   • Any people situations unresolved?
   • Commitments repeatedly missed (underlying blocker)?
   • User engagement increasing or decreasing?

3. PLAN — What should we work on next?
   • Identify "next frontier" — most impactful topic
   • Review active frameworks — any need to evolve/change?
   • Generate 2-3 coaching questions to pose
   • Decide: proactive session vs. weave into daily outreach?

4. GENERATE — Weekly coaching session message
   • Coach-led, question-first (NOT a status update)
   • References specific entities and patterns
   • Connects past insights to current opportunities
```

### Weekly Coaching Session vs. Morning Briefing

| Morning Briefing | Weekly Coaching Session |
|:---|:---|
| Status-oriented: "You have 2 commitments due" | Insight-oriented: "I've been thinking about a pattern..." |
| Reactive to calendar/commitments | Proactive from meta-analysis |
| Short, actionable | Deeper, exploratory |
| Daily | Weekly |
| User acts on it | User responds to it — it starts a conversation |

### Example: Marcus, Week After Imposter Syndrome Breakthrough

> *"Marcus, I wanted to check in on something specific.*
>
> *Last week we explored the 'I'm not a real CEO' story, and you had a real breakthrough recognizing that quiet, analytical leadership is its own strength. But here's what I've been thinking about:*
>
> *You have a 1:1 with your VP of Engineering tomorrow. The last three times we talked about him, you mentioned frustration — but you haven't had the direct conversation about expectations. And I think that might be connected to the same story.*
>
> *What would it look like to have that conversation as the kind of leader YOU are — analytical, prepared, specific — rather than trying to be the charismatic confronter you think you should be?"*

---

## 5. The MACRO Layer — Monthly Arc Strategist

**Trigger:** Monthly async job (or milestone-triggered)
**Model:** GPT-4o
**Output:** Arc phase update, progress review, monthly coaching direction

### Coaching Arc Phases

| Phase | Typical Timing | Coach Mode | What Happens |
|:---|:---|:---|:---|
| **Orientation** | Weeks 1–2 | Supportive + Structured | Building context, establishing trust (level 1-2), focusing on the presented problem, frameworks: Tier 1 |
| **Working** | Weeks 3–8 | Challenging + Adaptive | Deeper business challenges, trust level 2-3, patterns emerging, framework switching, "now what?" handled here |
| **Depth** | Weeks 8+ (trust ≥ 3) | Provocative + Deep | Root causes surface, Tier 3-4 frameworks available, coach challenges the person not just the problem, requires consent for Tier 4 |
| **Integration** | Ongoing | Partner | User has frameworks internalized, coach shifts to maintenance + stretch, less frequent but deeper, quarterly reviews |

### Progress Reviews

Monthly (or at phase transitions), the coach generates a structured reflection:

> **Sarah's 30-Day Progress Review**
>
> 📊 **By the Numbers:**
> - 47 coaching conversations
> - 18 commitments set → 13 completed (72% — up from 50% in week 1)
> - 7 new paying customers (started at 0)
>
> 🔄 **Patterns I've Noticed:**
> - You're strongest setting 3 specific actions/day (not 5+)
> - You delay outreach to people you admire — we've worked on this twice, improving
> - Energy drops Thursdays — you've started protecting that day
>
> 🏆 **Biggest Wins:**
> - 0 → 7 paying customers
> - Had the "scary" influencer conversation
> - Shifted from "I don't know marketing" to "I'm learning GTM"
>
> 🎯 **Where We Should Go Next:**
> - Your "first customers" problem is solved. Next: repeatability. I want to introduce EOS to set 90-day rocks.
> - You mentioned feeling isolated twice. Let's explore community or co-working.

---

## 6. Complete Decision Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    🧠 MACRO (Monthly)                              │
│  Arc Phase Detector → Progress Review Generator                    │
│  "Is this user in Orientation, Working, Depth, or Integration?"   │
│  Sets: which framework tiers are available, coaching direction     │
├────────────────────────────────────────────────────────────────────┤
│                    📋 MESO (Weekly)                                 │
│  Week-in-Review → Next Frontier Identifier → Coaching Agenda      │
│  "What should we focus on this week? What's unresolved?"          │
│  Sets: priority topics, framework reviews, weekly coaching session │
├────────────────────────────────────────────────────────────────────┤
│                    💬 MICRO (Per-Message)                           │
│                                                                    │
│  ┌─ LAYER 1: FRAMEWORK (per-challenge) ─────────────────────────┐ │
│  │ Which challenge is this about? → Load active framework+phase  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                          │                                         │
│                          ▼                                         │
│  ┌─ LAYER 2: INTERVENTION (per-message, Heron's 6) ─────────────┐│
│  │ A. Situation assessment → candidate intervention               ││
│  │ B. Check intervention biases (Autonomy, Challenge Level)       ││
│  │ C. Bias agrees? → proceed                                     ││
│  │    Bias conflicts? → Low stakes: follow bias                   ││
│  │                      High stakes: override + meta-acknowledge  ││
│  │ → INTERVENTION SELECTED                                        ││
│  └───────────────────────────────────────────────────────────────┘ │
│                          │                                         │
│                          ▼                                         │
│  ┌─ LAYER 3: DELIVERY (per-user, 6 dimensions) ─────────────────┐│
│  │ Directness + Framing + Warmth + Pacing + Evidence +            ││
│  │ Accountability → modulate HOW the intervention is delivered    ││
│  │ → RESPONSE GENERATED                                           ││
│  └───────────────────────────────────────────────────────────────┘ │
│                          │                                         │
│                          ▼                                         │
│  Post-Processing (async):                                          │
│  • Post-Processor (GPT-4o-mini) → facts, commitments, sentiment   │
│  • Entity Extractor (GPT-4o) → people, goals, fears, patterns     │
│  • → Feeds back to MESO and MACRO                                 │
└────────────────────────────────────────────────────────────────────┘
```

---

## 7. Research Sources

| Source | What We Use From It |
|:---|:---|
| **Heron's Six Category Intervention Framework** (1975) | The 6 per-message intervention types (Prescriptive, Informative, Confronting, Cathartic, Catalytic, Supportive) |
| **ICF Core Competencies** (2020 update) | Foundation: Listens Actively, Evokes Awareness, Facilitates Client Growth. Frameworks are guides, not rigid formulas. |
| **Co-Active Coaching Model** (CTI) | "Forward the Action / Deepen the Learning" duality — every session balances insight and action |
| **Ivey's Microskills Hierarchy** | Skill progression from listening → questioning → reflecting → confronting → directing. Lower skills before higher. |
| **Professional coaching practice** (ICF research) | Frameworks selected per engagement/challenge, not per message. Coach is "model-aware, not model-bound." |

---

> **Usage:** This document is the canonical reference for the coaching AI's decision-making architecture. ARCHITECTURE.md §5.2 implements these patterns in code. [COACHING_GUARDRAILS.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COACHING_GUARDRAILS.md) defines safety rules for Authoritative interventions (Prescriptive + Informative).
