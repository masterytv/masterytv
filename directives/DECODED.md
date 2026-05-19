# Decoded — Phase 0: Discovery

> **Version:** 1.1
> **Date:** May 18, 2026
> **Status:** 🟡 Draft — Pending Gate 0 Approval
> **Product:** Decoded (mastery.tv/decoded)
> **Tagline:** *"You, decoded."*
> **Relationship:** Top-of-funnel for Mastery Coach App. Standalone product with its own pricing ladder.
> **Methodology:** BMAD + Antigravity Method

---

## 1. Problem Statement

**People who want to grow don't know where to start — and the tools that exist either tell them nothing useful or leave them alone with a PDF.**

- Personality tools (16Personalities, Enneagram, Myers-Briggs) are scientifically weak, entertainment-grade, and produce no actionable output
- Clinical tools (PHQ-9, GAD-7, attachment assessments) are accurate but designed for clinicians — consumers receive scores with no context, no framing, and no pathway forward
- Deep Personality (deeppersonality.app) showed the market is real (#3 Product Hunt, March 2026) but only offers a report — there is no transformation, no coaching, no "what now?"
- The self-improvement market ($13B+ in the US alone) is filled with motivated people who lack a coherent, science-backed starting point

**Our thesis:** A comprehensive, adaptive psychological assessment built on validated research frameworks — delivering a free personalized report AND a personalized AI coach who already knows the user — is the most powerful top-of-funnel in the self-improvement space. The report captures attention. The coach creates retention.

---

## 2. Market Analysis

### 2.1 Market Size

| Metric | Value | Notes |
|:---|:---|:---|
| **Self-improvement market (US)** | $13.4B (2025) | Books, apps, coaching, courses |
| **Personality assessment market** | $11.6B (2025), 12% CAGR | Includes B2B psychometric tools |
| **B2C consumer assessment segment** | ~$500M–1B | Largely fragmented, bootstrapped |
| **Target TAM for Self Mastery** | ~$2–3B | Self-aware adults aged 22–55 seeking growth |

### 2.2 Competitive Landscape

| Product | Model | Price | Weakness |
|:---|:---|:---|:---|
| **Deep Personality** | Assessment → Annual report | $29/yr | No next step — report is the destination |
| **16Personalities** | Free quiz → premium unlock | Freemium | Not scientifically validated (MBTI-adjacent) |
| **TraitLab** | Big Five deep dive | $9–19 one-time | Niche, no action pathway, no coaching |
| **Gallup CliftonStrengths** | Strengths assessment | $19.99 | Narrow (strengths only), B2B focus |
| **BetterHelp / Headspace** | Mental health apps | $50–100/mo | Not personality; not growth-oriented |
| **Mastery Coach App** | AI coaching | $99–199/mo | No low-friction entry point — Decoded fills this gap |

**Key Insight:** Deep Personality's pricing (confirmed): $29/yr individual, $69/yr compatibility, $349 lifetime. They are building an annual subscription model, not a one-time product. This is important — they are a real subscription business, not a report seller.

### 2.3 The White Space

Deep Personality stops at *understanding*. Decoded starts there and goes to *transformation*. No product in this space currently combines:
1. Validated multi-domain assessment (15–30 instruments)
2. Free personalized report (~30 pages)
3. An AI coach pre-loaded with the user's profile who starts coaching from Day 1

That combination is Decoded's moat.

---

## 3. Target Audience

### Primary Persona: "The Self-Aware Seeker"

This is deliberately broad — the self-improvement market spans many archetypes who share one trait: they are already motivated to grow.

**Sub-segments (same product, different marketing hooks):**

| Sub-segment | Hook | Assessment Relevance |
|:---|:---|:---|
| **Entrepreneurs/Founders** | "Know your blind spots before they cost you" | Career, motivation, stress response |
| **Athletes / High performers** | "The mental side of your performance, mapped" | Focus, emotional regulation, self-compassion |
| **Relationship-focused adults** | "Finally understand why the same pattern keeps repeating" | Attachment, relationship satisfaction, conflict style |
| **Career changers** | "Your personality + career alignment in one report" | RIASEC, work motivation, Big Five |
| **Fitness / Wellness enthusiasts** | "The inner work that makes the outer work stick" | Sleep, physical habits, stress response, self-compassion |
| **General self-aware adults (25–50)** | "The most honest thing you'll ever read about yourself" | All domains |

**Shared Psychographics:**
- Already in "self-improvement mode" — they seek, not stumble
- Frustrated by shallow tools ("Which Disney Princess are you?")
- Want data about themselves, not generalizations
- Will spend $29–99 on something they trust
- Skeptical of therapy but curious about psychology

### Secondary Persona: "The Referring Professional"

Coaches, therapists, and HR professionals who want to refer clients to a credible free tool as a pre-session primer. B2B opportunity in Phase 3.

---

## 4. Product Overview

### 4.1 The Assessment

**30 validated instruments, adaptive branching, ~35–50 minutes.**

#### Core Layer (Everyone — ~15 min, ~50 items)

| Assessment | Instrument | Domain |
|:---|:---|:---|
| Big Five Personality | IPIP-50 (public domain) | Personality traits |
| Career Interests | RIASEC / Holland Codes (public domain) | Vocational fit |
| Attachment Style | ECR-R Short Form (research license) | Relationships |
| Life Satisfaction | SWLS — 5 items (public domain) | Wellbeing |
| Self-Compassion | SCS-SF — 12 items (public domain) | Positive psychology |

#### Adaptive Layer (Conditional — ~15–20 min based on Core results)

| Trigger Condition | Assessment Added | Instrument |
|:---|:---|:---|
| High Neuroticism (Big Five) | Stress & Anxiety Profile | GAD-7 (public domain) |
| High Neuroticism + low Openness | Emotion Regulation | DERS-16 Short (research license) |
| Low Conscientiousness | Focus & Attention | ASRS-v1.1 Short (public domain) |
| User indicates relationship | Relationship Satisfaction | CSI-4 (public domain) |
| User indicates relationship | Attachment (full version) | ECR-R Full |
| User indicates work/career focus | Work Motivation | WEIMS (research license) |
| Any trauma indicators (soft) | Resilience Context | ACE-3 item (public domain) |

#### Depth Layer (Optional unlock for paid tiers — ~10–15 min)

| Assessment | Instrument | Domain |
|:---|:---|:---|
| Inner Parts Inventory | IFS-adjacent (custom, non-clinical) | Internal system awareness |
| Social Adaptation Profile | CAM-R Short (research license) | Masking / neurodivergence context |
| Moral Injury | Moral Injury Symptom Scale short (public domain) | Values & ethical distress |
| Childhood Context | ACE Full (public domain) | Resilience foundation |

> [!IMPORTANT]
> **License Verification Required (Gate 0 Blocker):** Before build, verify commercial use terms for: ECR-R, DERS-16, WEIMS, CAM-R. All others confirmed public domain or freely usable for non-clinical commercial applications.

### 4.2 The Report

**Free for all users. ~30 pages. AI-generated. Web + browser "Save as PDF."**

> *The original 10-section list in this section was superseded during the report structure design session (May 18, 2026). See **DECODED_PRD.md §4.2** for the canonical report section list (RS01–RS12 + Depth Layer). See **DECODED_REPORT_STRUCTURE.md** for section-level design specs, tone guide, and gate psychology.*

**Summary:** 7 free narrative sections + 5 locked sections (Insight/Growth tiers) + optional Depth Layer (Mastery tier). Every section ends with a coaching question. Upgrade gate positioned after peak emotional resonance (Section 7 — Inner System).

> **Critical Differentiator:** Section 8 (Mastery Blueprint) is the section Deep Personality doesn't have. It translates results into coaching frameworks specific to the user. This is only possible because Decoded is built on top of MasteryTV's Coaching Framework Library.

### 4.3 The Coach Handoff

When a user finishes the assessment and reads their report, the coach is pre-loaded with their entire profile. The onboarding question is no longer "Tell me about yourself" — it's:

> *"I've reviewed your Decoded profile. Based on your results, I'd suggest we start with [specific framework]. Here's what I noticed about you that made me think this would have the most impact: [personalized insight]. Does that resonate — or is there something more pressing?"*

This is the "wow" moment that no other coaching tool can replicate. The Decoded profile IS the onboarding.

---

## 5. Revenue Model

### 5.1 Pricing Ladder

| Tier | Price | What's Included |
|:---|:---|:---|
| **Free** | $0 | Full assessment + 7-section AI report (web) + 5 messages/day to coach |
| **Insight** | $29/year | + 5 locked report sections + 50 coach messages/week + AI Compatibility Report |
| **Growth** | $69/year | Insight + Growth Roadmap section + 300 coach messages/month + Compare AI analysis |
| **Mastery** | $99/month OR $349/year (save ~70%) | Everything + unlimited coach + full framework library + Depth Layer |

### 5.2 Pricing Rationale

- **Free report** removes all friction. Deep Personality charges $29 for this. We give it away to earn the coaching relationship. Free tier includes 5 coach messages/day — enough to get hooked, not enough to get full value.
- **Insight ($29/year)** competes directly with Deep Personality's individual tier. Our version adds locked report sections + 50 coach messages/week — we're better at the same price.
- **Growth ($69/year)** competes with their compatibility tier ($69/year). Same price, but our version adds the Growth Roadmap + 300 messages/month + Compare analysis.
- **Mastery ($349/year)** is the strategic anchor: $99/mo × 12 = $1,188. $349 = 70.6% savings. Unlimited coach + full framework library + Depth Layer.
- **$99/month** remains available for users who want to try before committing annually.

### 5.3 Revenue Math

| Scenario | Monthly Assessments | Report→Insight (5%) | Report→Growth (2%) | Report→Mastery Annual (3%) | Report→Mastery Monthly (2%) | Monthly Revenue |
|:---|:---|:---|:---|:---|:---|:---|
| **Conservative** | 500 | $725 | $580 | $1,748 | $990 | ~$4,000 |
| **Moderate** | 1,500 | $2,175 | $1,740 | $5,250 | $2,970 | ~$12,100 |
| **Optimistic** | 3,000 | $4,350 | $3,480 | $10,500 | $5,940 | ~$24,200 |

> Coach Monthly revenue compounds — each new monthly subscriber adds permanently to MRR until churn. These figures show new MRR added per month.

---

## 6. Technical Architecture (High Level)

The Decoded integrates with the existing MasteryTV stack. No new infrastructure required — new product surfaces only.

| Component | Approach | Notes |
|:---|:---|:---|
| **Assessment Engine** | Next.js multi-step form with conditional branching | Store responses in Supabase `assessment_responses` table |
| **Scoring Engine** | TypeScript scoring functions per instrument | IPIP-50, ECR-R, GAD-7 etc. have published scoring keys |
| **Report Generator** | GPT-4o (long-form, structured) | ~10,000 token output; cached per user |
| **PDF Generation** | React PDF or Puppeteer | PDF version of the web report |
| **Progress Tracking** | Supabase time-series assessment snapshots | For $29/yr Insight tier reassessment comparison |
| **Coach Integration** | Decoded profile → `user_profiles` table → coaching engine reads on first message | Pre-loads coach context; replaces conversational onboarding for Decoded users |
| **Compatibility Feature** | Share link → partner takes assessment → AI synthesizes both profiles | Requires both users to have Decoded profile data |
| **Stripe** | New price objects for $29/yr, $69/yr, $349/yr, $99/mo | Existing Stripe integration extended |
| **URL** | `mastery.tv/decoded` | New Next.js route within existing app |

---

## 7. Go-To-Market Strategy

### Phase 1: Build & Internal Validate (Sprint 0.1–0.3)
- Build assessment engine + scoring + free report
- Internal testing with 5–10 users
- Validate: does the report resonate? Does the Decoded coach handoff feel magical?

### Phase 2: Soft Launch + A/B Test (Sprint 0.4–0.5)
- Launch to MasteryTV existing audience (email list, social)
- A/B test: free report (Option B) vs. $29 report (Option A baseline)
- Track: assessment completion rate, upgrade conversion, coach activation

### Phase 3: Public Launch (Post Sprint 0)
- Product Hunt launch — target #1 Product of the Day
- Reddit: r/selfimprovement, r/psychology, r/enneagram, r/attachment_theory
- Press angle: "We analyzed 15 validated psychological instruments and found what actually predicts life satisfaction" (data story from aggregated results)
- Shareable personality cards (Big Five visual, attachment style card) → viral loop

### Phase 4: Viral Mechanics
- **Compatibility invite**: "Share with your partner" → partner takes Decoded assessment → both get relationship analysis
- **Progress card**: After reassessment, "Here's how you've grown since [date]" shareable graphic
- **Referral**: Complete Decoded → share link → friend completes → both get 1 month coach free

### Phase 5: B2B (Month 6+)
- Target: coaches, therapists, HR departments, leadership programs
- Offer: white-label team assessment + organizational insights dashboard
- Price: $1,000–5,000/month organizational license

---

## 8. Key Risks

| Risk | Severity | Mitigation |
|:---|:---|:---|
| **Clinical screener liability** | 🔴 High | Never show raw clinical scores; reframe all results as growth insights; mandatory crisis gateway for suicidal ideation items; prominent non-clinical disclaimer |
| **Assessment license violations** | 🔴 High | Verify commercial use terms before build; use only public domain or licensed instruments |
| **Report quality disappoints** | 🟡 Medium | Extensive prompt engineering; human review of sample reports before launch; allow report regeneration |
| **Coach not ready at launch** | 🟡 Medium | Assessment + report can launch standalone (Option A); coach integration is Phase 2 of the launch |
| **Deep Personality copies our coach integration** | 🟡 Medium | They'd have to build a coaching product from scratch; our moat deepens with each user's coaching history |
| **Assessment fatigue (too long)** | 🟡 Medium | Adaptive branching keeps it to 35–50 min; progress bar + section titles manage expectation |
| **Privacy concerns** | 🟢 Low | Explicit consent at start; data never sold; GDPR-compliant; delete anytime |

---

## 9. Positioning & Copy Direction

**Tagline:** *"You, decoded."*

**Supporting lines:**
- *"15 validated assessments. One transformational report. A coach who already knows you."*
- *"Finally understand why you are the way you are — and get the tools to change it."*
- *"The most comprehensive personality report built for people who want to actually do something with it."*

**Positioning Statement:**
> Decoded is the only personality assessment that doesn't leave you alone with a PDF. We combined 15 clinically validated psychological frameworks into a single adaptive assessment. You get a free 30-page report — and an AI coach who's already read every word of it and is ready to help you act on it.

**What Decoded explicitly is NOT:**
- A clinical diagnostic tool
- A therapy replacement
- A quiz (we use the word "assessment" deliberately — validated instruments, not personality trivia)
- A replacement for professional mental health support
- A data harvesting operation (responses are never used for model training)

---

## 10. Gate 0 Checklist

- [x] Problem statement clear and validated
- [x] Competitors analyzed (Deep Personality, 16Personalities, TraitLab, Gallup)
- [x] Target audience defined (self-improvement market; 6 sub-segments)
- [x] Revenue model identified ($0 / $29yr / $69yr / $99mo / $349yr)
- [x] Key risks documented (clinical liability, licensing, coach readiness)
- [x] Technical feasibility confirmed (extends existing MasteryTV stack)
- [x] Product name decided: **Decoded** — `mastery.tv/decoded` — tagline: *"You, decoded."*
- [x] Assessment instrument licenses researched (see §12 below)
- [x] Commercial permission obtained / alternatives confirmed for restricted instruments *(resolved May 19, 2026)*
- [ ] User approved discovery findings

---

## 12. Instrument License Research (Completed May 18, 2026)

> [!IMPORTANT]
> All four flagged instruments require action before commercial use. None are freely usable without permission as-is. See recommended path for each.

### 12.1 ECR-R — Experiences in Close Relationships Revised

| Field | Detail |
|:---|:---|
| **Authors** | R. Chris Fraley, Niels Waller, Kelly Brennan |
| **Commercial use** | 🔴 **Requires explicit permission** |
| **Non-commercial** | ✅ Free for academic research |
| **Contact** | [R. Chris Fraley — University of Illinois](https://internal.psychology.illinois.edu/~rcfraley/measures/ecrr.htm) |
| **Permission process** | Email request to Fraley's lab; no public fee schedule |

**Recommended Path:** Contact Fraley directly with a description of Decoded. His lab has historically been responsive. In parallel, **use ECR-S (12-item short form) as the default** — NovoPsych distributes it under an open-source license for research/clinical use. Validate whether that open license extends to commercial applications before launch.

**Alternative if permission is denied:** The **Adult Attachment Scale (AAS/RAAS)** by Collins & Read (1990/1996) is an 18-item alternative in wide use. Same contact-the-author process but different rights holder.

---

### 12.2 DERS-16 — Difficulties in Emotion Regulation Scale (Short Form)

| Field | Detail |
|:---|:---|
| **Authors** | Bjureberg et al. (2016), derived from Gratz & Roemer original DERS |
| **Commercial use** | 🔴 **Requires explicit permission from Dr. Kim Gratz** |
| **Non-commercial** | Generally permitted with attribution |
| **Contact** | Dr. Kim L. Gratz (primary DERS author) |
| **Permission process** | Written request; describe intended commercial use |

**Recommended Path:** Contact Dr. Gratz directly. This is a standard academic permission request — straightforward to send, and permission is commonly granted for non-clinical commercial applications with appropriate disclaimers.

**Alternative if permission is denied:** The instrument is in the Adaptive Layer (triggered only for high-Neuroticism users). If license is blocked, this section can be replaced with a **custom emotion regulation screener** based on publicly documented DERS constructs — asking about the same underlying behaviors without using the copyrighted item phrasing. This is the safest long-term path.

---

### 12.3 WEIMS — Work Extrinsic and Intrinsic Motivation Scale

| Field | Detail |
|:---|:---|
| **Authors** | Tremblay et al.; managed by Center for Self-Determination Theory (CSDT) |
| **Commercial use** | 🟡 **Formal process exists — most actionable of the four** |
| **Non-commercial** | ✅ Permitted with terms agreement |
| **Contact** | [selfdeterminationtheory.org](https://selfdeterminationtheory.org) |
| **Permission process** | Download form → select "commercial license" option → submit; case-by-case fee |

**Recommended Path:** This is the easiest to resolve. Go to selfdeterminationtheory.org, access the WEIMS questionnaire page, and select "I need a commercial license" during the terms agreement step. The CSDT has an established process for this. Fees are case-by-case but typically reasonable for small commercial applications.

**Alternative if fees are prohibitive:** The **SWEIMS (Short Work Extrinsic and Intrinsic Motivation Scale)** may be published under a Creative Commons license depending on its validation paper. Verify before using.

---

### 12.4 CAM-R / CAT-Q — Camouflaging Autistic Traits

| Field | Detail |
|:---|:---|
| **Correct name** | **CAT-Q** (Camouflaging Autistic Traits Questionnaire) — "CAM-R" appears to be an error in our earlier docs |
| **Authors** | Laura Hull et al. (2019), University College London |
| **Commercial use** | 🔴 **Requires explicit permission** |
| **Non-commercial** | Generally permitted with attribution |
| **Contact** | Dr. Laura Hull, UCL (contact via original validation paper) |
| **Publisher** | Springer Nature (Journal of Autism and Developmental Disorders) — check Rights & Permissions section |

> [!CAUTION]
> Note the naming correction: the instrument is **CAT-Q**, not CAM-R. Update all internal references accordingly. This is a Depth Layer instrument (optional, paid tier only) so it is lower priority than the Core/Adaptive Layer instruments above.

**Recommended Path:** Contact Dr. Hull at UCL. Given this is a Depth Layer instrument shown only to paid tier users, frame the request accordingly — limited deployment, non-clinical, growth-oriented framing. Also check the Springer Nature permissions portal for the original article.

**Alternative if permission is blocked:** This section can be dropped from the Depth Layer entirely with minimal product impact. The IFS-adjacent Parts Inventory and Moral Injury items (both custom or public domain) provide sufficient Depth Layer content.

---

### 12.5 Action Items — License Resolution

| Priority | Instrument | Action | Who |
|:---|:---|:---|:---|
| 🔴 High | **WEIMS** | Go to selfdeterminationtheory.org and initiate commercial license request | Thomas (10 min task) |
| 🔴 High | **ECR-R / ECR-S** | Email Fraley lab; simultaneously verify ECR-S open license scope | Thomas (email + research) |
| 🟡 Medium | **DERS-16** | Email Dr. Kim Gratz with description of Decoded and intended use | Thomas (email) |
| 🟢 Low | **CAT-Q** | Contact Dr. Hull at UCL; or deprioritize — Depth Layer only | Thomas (after above resolved) |

**Gate 0 Unblocked when:** WEIMS license obtained (or alternative confirmed) + ECR-R/ECR-S license confirmed. DERS-16 and CAT-Q can resolve in parallel with Sprint 0.1.

---

## 11. References

> See [DECODED_INDEX.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_INDEX.md) for the full document map. **Rule: if two documents disagree, DECODED_PRD.md wins.**

| Document | Location |
|:---|:---|
| Strategy Research Report | [mastery_personality_strategy_report.md](file:///Users/thomaswood/.gemini/antigravity/brain/90fc8f11-cc73-4046-bc1d-80dc98e9a320/mastery_personality_strategy_report.md) |
| Coach App DISCOVERY.md | [directives/DISCOVERY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DISCOVERY.md) |
| Coach App PRD.md | [directives/PRD.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/PRD.md) |
| Feature Backlog (F01–F10) | [directives/DECODED_FEATURES.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_FEATURES.md) |
| Report Structure (free/locked) | [directives/DECODED_REPORT_STRUCTURE.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_REPORT_STRUCTURE.md) |
| Competitive Analysis (Deep Personality) | [directives/COMPETITIVE_ANALYSIS_DP_REPORT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COMPETITIVE_ANALYSIS_DP_REPORT.md) |
| Brand & Design System | [directives/BRAND.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/BRAND.md) |
| Competitor Assessment Questions | [Deep Personality Assessment.md](file:///Users/thomaswood/Library/Mobile%20Documents/com~apple~CloudDocs/Downloads/Deep%20Personality%20Assessment.md) |

> **Next Phase:** Decoded PRD — formal feature requirements, user journey map (assessment → free report → upgrade → coach), acceptance criteria, and explicit "not in V1" scope list.

---

## 13. Report Architecture (Finalized May 18, 2026)

> [!NOTE]
> **These sections (§13–§17) are session notes from the May 18, 2026 design session.** For the canonical specification, see **DECODED_PRD.md**. If the PRD and these notes disagree, the PRD wins. These notes are preserved for design rationale and decision context.

> Full spec: `DECODED_REPORT_STRUCTURE.md`

### 13.1 Free vs. Locked Sections

The report has two structural layers: a **narrative layer** (AI-written) and a **data visualization layer** (charts/scores).

**Narrative Layer — 7 Free Sections:**
1. You at a Glance (TL;DR table)
2. Your Top 3 Superpowers
3. Your Top 3 Growth Edges (Kryptonite equivalent — growth framing, not shame)
4. Who You Are — Big Five narrative
5. Your Attachment Blueprint
6. Your Career Alignment (RIASEC)
7. Your Mastery Blueprint (coaching action plan — our differentiator)

**Narrative Layer — 4 Locked Sections (upgrade required):**
- Life Satisfaction (SWLS narrative)
- Resilience & Stress Response
- Emotional Regulation (DERS-16 narrative)
- Relationship Satisfaction (CSI-4 narrative)

> **Why these four?** They are the highest coaching-value segments — the ones where a coach has the most leverage. Locking them creates upgrade incentive tied to real value, not arbitrary paywalls.

**Data Visualization Layer — Mostly Free:**
- Big Five radar chart (free)
- Attachment style quadrant (free)
- RIASEC hexagon (free)
- Locked visualizations for the 4 locked sections

### 13.2 Gate UX (Locked Section Copy)

Each locked section shows a teaser paragraph, then a blur gate with a prompt like:
> *"This section shows how your emotional regulation patterns affect your relationships and work. Unlock to see the full analysis."*

The gate copy is section-specific — it describes what the user is missing, not just "upgrade to see more."

### 13.3 Bottom-of-Report CTA (Conversion Strategy)

**Key competitive finding:** Deep Personality has no CTA at the bottom of the report. Users finish reading and have nowhere to go. This is our primary conversion opportunity.

Decoded's report ends with a 3-part coaching CTA:
1. **Personalized coach opener** — pre-generated first message from the coach referencing specific findings from *this* user's report
2. **Sharing tools** — Share Your Card (F06) and Compare/Invite (F03) buttons
3. **Check-in reminder** — "Want me to check in with you in a week?" opt-in to Email 7 of the onboarding sequence

---

## 14. Viral Feature Architecture (Finalized May 18, 2026)

> Full specs: `DECODED_FEATURES.md` (F03, F06, F07, F08)

### 14.1 Compare / Profile Invite (F03) — Primary Growth Engine

This is **not** a comparison tool. It is the primary viral acquisition mechanic.

**The flow:**
1. User A creates an invite → names the recipient → selects a Relationship Preset (Partner/Friend/Colleague/Family) → generates a unique link
2. Person B receives the link → sees "User A has already shared their full profile with you" → must complete Decoded to access it
3. Person B completes assessment → becomes a Decoded user → comparison unlocks
4. User A is notified → returns → sees Person B's profile → AI Compatibility Report generated

**The hook:** *"Someone you know has shared their personality profile with you. Complete your assessment to see it."* — social pressure + curiosity is far more powerful than any ad.

**Decoded's upgrade on Deep Personality:** The comparison payoff is an **AI Compatibility Report** (attachment overlay, Big Five interaction map, communication gap analysis, conflict prediction, shared growth edges). Not just a side-by-side data view.

**Tier:** Free (create invite, basic compare) / Insight ($29yr) gets AI Compatibility Report
**Priority:** ✅ MVP — this IS the growth loop.

### 14.2 Share Your Card (F06)

Visual archetype card generator. Formats: Story (9:16), Feed (1:1), Landscape (16:9).

**Card contents:** Archetype name, user's first name, tagline, Top 3 Superpowers, Top 3 Growth Edges, `mastery.tv/decoded` watermark.

**Design mandate (BRAND.md §14):** Cards must be premium quality — glassmorphism, Decoded visual identity. People share things that make them look good. No AI-aesthetic sparkles or clipart.

**Priority:** ✅ MVP — pure viral surface area.

### 14.3 Share Your Type (F07)

Secondary entry point to F06. A callout banner at two points in the report (post-Archetype section + report footer). No additional dev — reuses the F06 modal.

### 14.4 Referral URL (F08)

Pre-populated unique referral link with meaningful incentives:
- **Referrer:** When friend completes assessment → unlock one free Insight section OR 1 month of coach messages
- **Recipient:** Same bonus on completion
- **Milestone:** 3 referrals = Insight tier free for 1 month; 5 referrals = Growth tier trial

> **Deep Personality's mistake:** Their referral incentive is brand-facing (newsletter feature). Ours is product-facing (more of the product). Conversion difference will be significant.

---

## 15. Email Marketing System (Added May 18, 2026)

> Full spec: `DECODED_FEATURES.md` (F10) | Skill: `email-marketing`

### 15.1 Onboarding Sequence (8 Emails)

Every user who completes the assessment is auto-enrolled.

| # | Day | Trigger | One Job |
|:---|:---|:---|:---|
| 1 | 0 | Report complete | Open the report |
| 2 | 1 | Time | Surface top insight (personalized with `{{archetype_name}}`) |
| 3 | 3 | Time | Introduce the coach feature ("Your coach already read your report") |
| 4 | 7 | Time | Drive share/invite (virality) |
| 5 | 14 | No coach session opened | Re-engagement |
| 6 | 21 | Free tier only | Upgrade nudge |
| 7 | 30 | Time | Milestone + review ask |
| 8 | 60 | Time | Retake prompt + growth delta |

**Tone:** Coach voice, not marketing voice. No emoji in subject lines. No AI-aesthetic sparkles (BRAND.md §14). 150–300 words max.

### 15.2 Infrastructure (Sprint 1 Foundation)

Stack: Resend + React Email + Supabase (pg_cron sequence runner).

New tables required: `email_preferences`, `email_sequence_enrollments`, `email_sends`.

Reuse from Project Profound: `email_campaigns` table, `BroadcastEmail` template (restyled), admin compose UI, unsubscribe logic.

**Sprint placement:** Email infrastructure = Sprint 1 (alongside auth + DB schema). Sequence content = Sprint 2.

---

## 16. Post-MVP Features (Added May 18, 2026)

### F09 — Dating Profile Generator (Post-MVP)

AI-generated dating bios using assessment data. Platform selector (Hinge, Bumble, Tinder, etc.), tone selector (Witty/Sincere/Adventurous/Vulnerable), length selector.

**Key differentiator:** Attachment-aware bio language — suggests compatible relationship signals without being clinical.

**Tier:** Growth ($69/yr)
**Priority:** 🟢 Post-MVP. Younger demographic (under 35). Build after core report + Compare are stable.

---

## 17. Design Mandate (Added May 18, 2026)

> Full spec: `BRAND.md §14 — Visual Anti-Patterns`

Decoded must not look like a generic AI product. Deep Personality's design is the cautionary tale — ✨ sparkles, colorful emoji section headers, multiple bright accent colors per screen.

**Permanently banned in all Decoded UI:**
- ✨ Sparkle / magic star icons
- Emoji used as section headers
- Colorful 3D/illustrated icons
- Gradient blob decorations
- Brain, target, lightbulb clipart

**What premium looks like instead:**
- Typography hierarchy (weight, size, contrast) carries all visual structure
- Data visualizations (radar charts, sliders, scores) are the "graphics"
- Numbered sections ("01.") or all-caps category labels
- Structural directional gradients — never decorative floating shapes
- Voice and restraint over decoration

**The test:** Would this appear in *The Economist* or a McKinsey report? If not, remove it.

