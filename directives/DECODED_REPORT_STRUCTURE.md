# Decoded — Report Structure Design

> **Version:** 1.1
> **Date:** May 18, 2026 | Updated: May 19, 2026
> **Status:** ✅ Active — Section-level design specs, tone guide, and gate psychology
> **Canonical section IDs:** RS01–RS12 (Free + Locked) + RD01–RD04 (Depth). See DECODED_PRD.md §4.2 for the authoritative list.
> **Informed by:** [COMPETITIVE_ANALYSIS_DP_REPORT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COMPETITIVE_ANALYSIS_DP_REPORT.md)

---

## What Deep Personality Does (and Does Well)

Before designing Decoded's report, the key lesson from their structure:

### The Generosity Trap

Deep Personality gives away **six substantial sections** for free — including the "Inner System" IFS analysis, which is arguably the most emotionally powerful content in the entire report. By the time you hit the gate, you've read ~3,000 words of deeply personalized, confrontational, accurate-feeling content. You are hooked.

This is intentional. **The upgrade gate only works if you believe the product.** They earn that belief in the free tier before asking for money.

**Decoded must match this generosity. Stinginess at the top of the funnel kills conversion.**

### Their 6 Free Sections

| # | Section | What It Contains | Emotional Hook |
|:---|:---|:---|:---|
| 1 | **You at a Glance** | Summary table (6 dimensions) + Superpowers + Things Holding You Back | Quick dopamine hit — "it knows me" |
| 2 | **What Your Data Revealed** | 5 cross-instrument insight bullets — confrontational, specific | "Holy shit, how did it know that?" |
| 3 | **Your Identity** | Archetype name + deep narrative prose + 3 sub-themes | Emotional anchor — this is the section people screenshot |
| 4 | **How Your Traits Interact** | 3 cross-trait interaction analyses (named patterns) | "This explains so much" |
| 5 | **Your Trait Profile** | Big Five breakdown with Gifts/Challenges per trait | Validation + productive friction |
| 6 | **Your Inner System** | IFS-style protectors + exiles + under-the-hood exile scores | Deepest hook — closest to therapy |

### Their Upgrade Gate Copy

> **"Your report continues — 5 more sections below"**
> **"Less than one therapy session. More honest than most of them."**

**Why this works:**
1. It doesn't say "upgrade" — it says "continues." The user is mid-journey.
2. The anchor ("therapy session") is universal, emotionally resonant, and expensive (~$200/session). Against that, $29/yr is almost comically cheap.
3. "More honest than most of them" is a bold claim — and after reading 6 sections of unusually direct content, the user believes it.

### Their 5 Locked Sections (Inferred)

Not shown in the text but based on their section list from the Sections TOC screenshot:
- What Your Data Revealed *(shown but possibly extended)*
- Career & Motivation deep dive
- Relationships & Attachment deep dive
- Wellbeing (physical, mental)
- Growth Roadmap / Action Plan

---

## Key Structural Lessons for Decoded

### 1. The "Things Holding You Back" block is underrated

Deep Personality's bullet list of negatives ("Your ADHD patterns are sabotaging your ambition") is the most provocative content in the free report. It reads like something only a brutally honest friend would say. This creates an "I need to finish this report" response. **Decoded needs an equivalent — named, specific, slightly uncomfortable.**

### 2. The closing question technique is coaching in disguise

Every major section ends with a reflective question:
- *"The version of Tom that the world sees — what would change if that version also got to be the one who openly asks for what he actually needs?"*
- *"Which protector did you recognize first — The Caretaker or The People-Pleaser?"*

These are actual IFS/coaching interventions. They prime the user to want more. **Decoded's equivalent:** the closing question at the bottom of each section should be the coach's opening line. "This is the question I'd start with if we were on a call right now."

### 3. The naming convention is viral

"The Radiant Wanderer." "The Caretaker." "The Escape Artist." "The Charismatic Non-Finisher." These named patterns are shareable. People identify with labels. This is why "Share Your Card" works — people want to post "I'm The Radiant Wanderer."

**Decoded must have equally compelling named archetypes and patterns.** The names are not decoration — they're product.

### 4. Cross-instrument synthesis is the product

Deep Personality's most powerful move is correlating across instruments: "You're lonelier at 94th percentile extraversion than most people with social anxiety." That sentence requires TWO data points (extraversion percentile + loneliness scale). This is what makes the report feel like it knows you — it's not just reporting your scores, it's finding contradictions and tensions between them.

**Decoded's AI synthesis layer is our competitive moat here.** The coach should surface these cross-instrument insights, not just present each scale independently.

---

## Decoded Report Structure — Proposed

### Design Principles

1. **Match Deep Personality's free depth** — 6 sections minimum, all substantive
2. **Differentiate with coaching integration** — every section ends with a coach question, not just a reflective prompt
3. **Name everything** — archetypes, patterns, protectors all get memorable labels
4. **Show the data** — percentile scores, radar charts, score breakdowns visible in free tier
5. **Gate at the emotional peak** — after the section that hits hardest, just as momentum builds

---

### FREE TIER: 7 Sections

> One more section than Deep Personality = more generous = higher trust before the gate.

---

#### [RS01] Section 1 — You, Decoded (Summary Dashboard)
*Equivalent to: "You at a Glance"*

**Contents:**
- Summary table (same format — 6 dimensions):
  - Core Personality
  - Attachment Style
  - Top Values (top 3 from Schwartz/VIA)
  - Career Fit (Holland code)
  - Emotional Pattern (DERS summary)
  - Current Wellbeing (SWLS + flourishing)
- **Your 3 Strengths** (positive framing — equivalent of Superpowers)
- **Your 3 Growth Edges** (less self-flagellating than "Things Holding You Back" — same function, different tone)
- **Your Decoded Score** — a single composite wellness/growth-readiness score (0–100) visible at the top

*Design note: This section is the "above the fold" of the report. Must be visually striking — data viz, not just text.*

---

#### [RS02] Section 2 — What the Data Shows
*Equivalent to: "What Your Data Revealed"*

**Contents:**
- 5 cross-instrument insight bullets — each one synthesizes 2+ instruments
- Each bullet is named (e.g., "The Loneliness Paradox," "The Unfinished Arc")
- Direct, confrontational framing — this is where Decoded earns trust
- One callout: "Here's the finding that might surprise you most" — the biggest gap/contradiction in the data

*Tone guide: Firm but caring. Not brutal. Not clinical. Like a brilliant friend who happens to have a psychology PhD and actually read your data.*

---

#### [RS03] Section 3 — Your Decoded Archetype
*Equivalent to: "Your Identity" + archetype hero section*

**Contents:**
- Archetype name (our system — distinct from Deep Personality's)
- One-line tagline
- 2–3 paragraph narrative — personal, second-person ("You are..."), convergent themes across instruments
- 3 named sub-themes (equivalent of "The Brightness That Dims Alone," etc.)
- Closing coach question: *"This is the question I'd open our first session with: [question]"*

*This is the section that gets screenshotted and shared. It must be beautiful and quotable.*

---

#### [RS04] Section 4 — How You're Wired
*Equivalent to: "How Your Traits Interact"*

**Contents:**
- 3 cross-trait interaction analyses — each given a memorable name
- At least one positive (reinforcing strength), one productive tension, one blindspot
- Big Five percentile scores shown visually (radar chart or bar chart)
- Pattern Alert callout (equivalent to Deep Personality's "Pattern Alert" callout boxes)

---

#### [RS05] Section 5 — Your Trait Profile
*Equivalent to: "Your Trait Profile" — Big Five deep dive*

**Contents:**
- Per-trait breakdown (Extraversion, Conscientiousness, Openness, Agreeableness, Neuroticism)
- Each trait: percentile score + 3 Gifts + 3 Challenges (same format as Deep Personality)
- One "interaction note" per trait connecting it to another trait or instrument
- Closing coach question per trait *or* one overall closing question for the section

---

#### [RS06] Section 6 — Your Attachment Map
*New section not in Deep Personality's free tier*

**Contents:**
- ECR-R results: Anxiety dimension (x-axis) + Avoidance dimension (y-axis) → plotted on 2x2 grid
- Which quadrant (Secure / Anxious / Avoidant / Disorganized) — named and explained
- How this attachment style shows up in: romantic relationships, friendships, work relationships
- Cross-instrument note: "Your attachment style + your [Big Five trait] creates [specific pattern]"
- "What this means for your Compare results" — teases the Compare feature
- Closing coach question

*Why this is in the free tier: ECR-R is one of Decoded's signature instruments. Showing the result hooks users and creates urgency for the Compare feature (share your attachment style with your partner).*

---

#### [RS07] Section 7 — Your Inner System
*Equivalent to: "Your Inner System" — IFS-style protectors/exiles*

**Contents:**
- Brief framing of the IFS model (2–3 sentences, non-jargony)
- Top 2–3 protector parts, named and described
- Brief exile glimpse: "Here's what your protectors are protecting" — 1 paragraph
- **Key score gaps** (equivalent to Deep Personality's "self-report: 100, behavioral: 58" gap callouts)
- Groundedness/Self score
- Closing coach question — the most personal and direct of all sections

*This is the final free section. It should end at peak emotional resonance — creating the strongest possible pull to continue.*

---

### UPGRADE GATE

Positioned after Section 7, at the bottom of the Inner System section.

**Gate Design:**
- Show section titles of what's locked (don't just say "5 more sections") — let the user see what they're missing
- Two-stage: first a soft fade/blur revealing partial content of Section 8, then the paywall

**Gate Copy (draft — improve before PRD):**

> **"Your report continues below."**
>
> *The next [N] sections cover your emotional regulation patterns, career motivation, relationship blueprint, wellbeing indicators, and your personal growth roadmap — with specific actions based on your data.*
>
> **"The insight is free. The growth plan isn't."**
> *(Or: "Knowing yourself is free. Becoming yourself takes a little more.")*

**Pricing (same as current DECODED.md):**

| Plan | Price | What's Included |
|:---|:---|:---|
| **Insight** | $29/year | Full report (RS01–RS12) + 50 coach messages/week |
| **Growth** | $69/year | Full report + 300 coach messages/month + Compare AI analysis |
| **Mastery** | $349/year | Everything + unlimited coach + full framework library + Depth Layer (RD01–RD04) |

*Note: Deep Personality has a $349 Lifetime option. We have $349/year for Mastery (includes live coaching). These are not comparable — ours is justified by ongoing coach access. Make this clear in the pricing copy.*

---

### PAID TIER: Locked Sections (5+)

#### [RS08] Section 8 — Your Emotional Landscape
*(DERS-16 results — Insight+ only)*

- 6 emotion regulation subscales: Awareness, Clarity, Goals, Impulse, Non-acceptance, Strategies
- How emotional regulation interacts with attachment style and Big Five Neuroticism
- Specific patterns: "When you're emotionally flooded, here's what happens..."
- Coach exercise: [specific emotion regulation technique from DBT/ACT matching their profile]

---

#### [RS09] Section 9 — Career & Motivation
*(WEIMS + Holland Code — Insight+ only)*

- Intrinsic vs. Extrinsic motivation breakdown (WEIMS — 7 motivation types scored)
- Holland Code: "Social + Artistic + Enterprising" — what roles and environments fit
- Motivation gap: "You're motivated by [X] but spending time on [Y]"
- Career fit recommendations (3 specific types of roles/environments)
- Coach exercise: "The Work That Matters" reflection

---

#### [RS10] Section 10 — Your Relationship Blueprint
*(ECR deep dive + early experiences — Insight+ only)*

- Attachment in specific relationship types (romantic, friendship, work)
- Early experience patterns and how they connect to current attachment
- Common relationship patterns based on your attachment + Big Five profile
- Compatibility preview: "Here's what to look for in a partner/team member"
- CTA: "Share your attachment results with someone using Compare"

---

#### [RS11] Section 11 — Wellbeing Dashboard
*(SWLS + Flourishing Scale + custom items — Insight+ only)*

- Life satisfaction score and subscales
- Flourishing dimensions (meaning, engagement, positive relationships, accomplishment, etc.)
- Wellbeing gap: "Here's where satisfaction is lowest relative to your potential"
- Physical and behavioral wellbeing indicators (if collected)
- Coach connection: "The one wellbeing metric that usually moves first when people start coaching"

---

#### [RS12] Section 12 — Your Growth Roadmap
*(Custom AI synthesis — Growth+ only)*

- 3 specific, prioritized growth edges based on cross-instrument data
- For each: what it is, why it matters, one concrete starting action
- Coach conversation starters: "Ask your coach about [X] — this is where most people see the fastest movement"
- 90-day reflection questions
- "Your next Decoded check-in" — prompt to retake in 90 days to track change

---

#### Depth Layer (optional, Mastery only)

- Neurodivergence / CAT-Q results (if user opted into this section)
- Moral Injury / Moral Repair indicators
- IFS deep dive — full parts map with coaching exercises
- Shadow & Integration (Jungian-informed — custom instrument)

---

## Upgrade Gate Psychology — Notes for PRD

**Why Deep Personality's gate works so well:**
1. User has invested 20–30 minutes reading about themselves — sunk cost creates forward momentum
2. The content is accurate enough to feel like the product "knows" them — trust is established
3. "$29/year" anchored against "therapy" is near-frictionless psychologically
4. "Continues" framing keeps the user in journey mode, not purchase mode

**How Decoded's gate should improve on this:**
1. **Show what's locked** — list the locked section titles so the user knows exactly what they're missing. "You at a Glance" → "Your Emotional Landscape" → etc. Deep Personality says "5 more sections" but doesn't name them.
2. **Coach preview** — show the first message the coach would send based on their free report. "Here's what your coach would say to start: [personalized opener]." Then gate it. The coach's voice is the product — let the user hear it before they pay.
3. **Anchor against coaching, not therapy** — "Less than one hour of coaching. More data than your coach usually has in month three." Our version of Deep Personality's therapy comparison.
4. **Make the Compare CTA visible at the gate** — "Your partner/friend's report + your report = a third report about your dynamic. That's the Compatibility plan." This sells the $69 tier without needing to oversell it.

---

## Report Tone Guide

| Deep Personality's Tone | Decoded's Tone |
|:---|:---|
| Confrontational ("sabotaging your ambition") | Direct but constructive ("here's the pattern that's getting in the way") |
| Clinical percentiles prominent | Percentiles shown but translated to plain language first |
| IFS language used explicitly ("exiles," "protectors") | IFS concepts used but named differently — our own terminology |
| Ends with "consult a therapist" | Ends with "this is what your coach would explore with you" |
| Static report (no path forward) | Every section ends with a coach question — the report IS the coaching intake |

**The core Decoded tone difference:** Deep Personality tells you what's true. Decoded tells you what's true AND what to do about it. The report is the beginning of a coaching relationship, not a finished analysis.
