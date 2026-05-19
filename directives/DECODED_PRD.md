# Product Requirements Document — Decoded

> **Author:** Thomas Wood + Antigravity Orchestrator
> **Date:** May 18, 2026 | Updated: May 19, 2026
> **Version:** 1.1
> **Status:** 🟡 Draft — Pending Gate 1 Approval
> **Product:** Decoded (`mastery.tv/decoded`)
> **Tagline:** *"You, decoded."*
> **Methodology:** BMAD + Antigravity Method (Phase 1 — PRD)
> **Source:** [DECODED.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED.md) (Discovery ✅) | [DECODED_FEATURES.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_FEATURES.md) | [DECODED_REPORT_STRUCTURE.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_REPORT_STRUCTURE.md)
> **Design Authority:** [BRAND.md §14](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/BRAND.md) — Visual Anti-Patterns enforced on all UI
> **Document Map:** [DECODED_INDEX.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_INDEX.md) — if two docs disagree, this PRD wins

---

## 1. Executive Summary

### 1.1 Problem

The self-improvement market is filled with motivated people who lack a coherent, science-backed starting point. Existing tools fail in two directions:

- **Too shallow:** 16Personalities, Enneagram, Myers-Briggs — entertainment-grade, not validated, no actionable output
- **Too clinical:** GAD-7, PHQ-9 — accurate but designed for clinicians; consumers get scores with no context, framing, or pathway forward

**Deep Personality** (deeppersonality.app) proved the market is real — #3 Product Hunt March 2026 — but stops at *understanding*. No coaching, no transformation, no "what now?" Users finish their report and have nowhere to go.

### 1.2 Solution

Decoded combines 15+ validated psychological instruments into a single adaptive assessment delivering:

1. A free ~30-page AI-written personalized report (web + PDF)
2. A viral sharing mechanic that turns every user into an acquisition channel
3. An AI coach pre-loaded with the user's full profile — ready to coach from Day 1

The report captures attention. The coach creates retention. The sharing mechanic drives growth.

### 1.3 Product Vision

> *"The only personality assessment that doesn't leave you alone with a PDF."*

Decoded's moat: no competitor currently combines validated multi-domain assessment + free personalized report + AI coach who already knows you. Deep Personality stops at step 2. We go to step 3.

### 1.4 Relationship to Mastery Coach App

Decoded is the **top-of-funnel** for Mastery Coach. It is also a standalone product with its own pricing ladder. Users who upgrade to the coach tier skip conversational onboarding — their Decoded profile IS the onboarding. This is the "wow" moment no competitor can replicate.

---

## 2. Success Criteria

### 2.1 User Success

| Criterion | Measurement | Target |
|:---|:---|:---|
| **Assessment completion** | % of users who start and finish | >60% |
| **Report resonance** | Post-report survey: "This felt accurate and useful" | >80% agree |
| **"Wow" moment** | User reads coach's personalized opener and feels understood | Within 30 seconds of reaching CTA |
| **Share rate** | % of report completers who share a card or send a Compare invite | >15% |
| **Coach activation** | % of Decoded users who open ≥1 coach conversation | >25% |

### 2.2 Business Success

| Criterion | 3-Month | 6-Month | 12-Month |
|:---|:---|:---|:---|
| **Monthly assessments completed** | 500 | 1,500 | 3,000 |
| **Free → Insight conversion (5%)** | $725/mo | $2,175/mo | $4,350/mo |
| **Free → Growth conversion (2%)** | $580/mo | $1,740/mo | $3,480/mo |
| **Free → Mastery Annual conversion (3%)** | $1,748/mo | $5,250/mo | $10,500/mo |
| **Total new MRR/month** | ~$4,000 | ~$12,100 | ~$24,200 |
| **Viral coefficient** | Compare invite → new user conversion | >30% |

### 2.3 Technical Success

| Criterion | Target |
|:---|:---|
| **Assessment load time** | <1s per question render |
| **Report generation time** | <60 seconds end-to-end |
| **Report page load** | <2s (cached) |
| **Email sequence delivery** | Within ±10 min of scheduled time |
| **Share card generation** | <3 seconds |

### 2.4 Make-or-Break Metric

> **Month 3 report-to-coach-activation > 20%.** If users read the report but don't talk to the coach, the handoff is broken. Fix before scaling.

---

## 3. User Journeys

### 3.1 Journey 1: The Self-Aware Seeker — First Contact (Primary, Happy Path)

**Persona:** *Maya, 29, marketing manager. Tried therapy twice, reads self-improvement content, frustrated that personality quizzes feel like horoscopes.*

**Scene:** Maya sees a friend's personality card on Instagram — clean, premium design showing their archetype and top 3 superpowers. She taps the `mastery.tv/decoded` watermark.

**Rising Action:** She lands on the Decoded landing page. One CTA: "Start Your Assessment — Free." She creates an account (Google OAuth or email). Assessment begins — the Core Layer takes ~15 min. Based on her High Neuroticism score, the system adds the GAD-7 and DERS-16 adaptively without telling her why — it just flows naturally. Every response is saved as she answers — if she closes the tab, nothing is lost.

**Climax:** The report loads — beautifully designed, no clipart, no sparkles. The first section (RS01: "You, Decoded") gives her a TL;DR she instantly recognizes as accurate. She scrolls through 7 free sections. Five sections are gated with blur + specific, honest copy: *"This section reveals how your emotion regulation patterns affect your relationships at work. Unlock to see the full picture."*

At the bottom: a pre-generated coach message:
> *"Maya — I've read your full profile. Your secure-leaning attachment style combined with high Neuroticism and a strong RIASEC Social profile suggests you're someone who genuinely cares about people, but internal noise keeps you from showing up as fully as you want to. I'd suggest we start with Emotional Regulation — want to dig in?"*

**Resolution:** Maya clicks "Talk to my coach." She's coached within 60 seconds of finishing the report, by a coach who already knows her. She also sends a Compare invite to her partner.

**Capabilities Revealed:** Account creation, adaptive assessment, per-question state persistence, free report (7 sections), locked sections (5), coaching CTA with personalized opener, Compare invite, Share Card.

---

### 3.2 Journey 2: The Conversion Path — Free → Paid

**Persona:** *Maya, Day 7 after completing Decoded.*

**Scene:** She receives Email 3 of her onboarding sequence ("Your coach has already read your full report"). She hasn't opened the coach yet. The email surfaces her top insight from the report, references her archetype by name, and has one CTA: "Talk to your coach."

She clicks. Has her first coaching session. The coach references her Decoded profile immediately — she feels seen. Three sessions in, she wants the locked sections. She upgrades to Insight ($29/yr).

**Capabilities Revealed:** Email onboarding sequence, behavioral trigger (no coach session), upgrade nudge, Insight tier unlock.

---

### 3.3 Journey 3: The Viral Loop — Compare Invite

**Persona:** *James, Maya's partner. Has never heard of Decoded.*

**Scene:** James receives a link from Maya: *"I've already shared my full personality profile with you. Take the assessment to see it."* He has no idea what Decoded is, but curiosity and social pressure are irresistible. He completes the assessment (15 min — Core Layer only, no Neuroticism adaptations). He sees Maya's profile and their AI Compatibility Report.

**Capabilities Revealed:** Compare invite UX (sender flow), unique link generation, recipient landing ("someone shared their profile with you"), forced assessment completion to unlock, AI Compatibility Report generation (F03).

---

### 3.4 Journey 4: Coach Handoff — The "Wow" Moment

**Persona:** *Maya, upgrading from Insight to Mastery tier.*

**Scene:** Maya clicks "Unlock full coaching" from her dashboard. She's taken to Stripe checkout ($99/mo or $349/yr). After purchase, she's redirected to the coaching interface. The coach's opening message is already there — generated from her Decoded profile. It references specific findings: her attachment style, her top growth edge, her RIASEC primary type. It suggests a starting framework. She didn't have to type a single word about herself.

> *"This is the first app that's ever skipped the 'tell me about yourself' part."*

**Capabilities Revealed:** Stripe upgrade, coach pre-loading from `assessment_profile`, personalized first coach message, skip of standard onboarding.

---

### 3.5 Journey 5: Admin — Email & Metrics

**Persona:** Thomas (product owner).

**Scene:** Admin logs in, sees Decoded dashboard: 847 assessments this week, 12% email open rate on Email 1, 6% Compare invite conversion. Clicks into Email panel → sees sequence health → Email 5 (re-engagement) has 40% open rate, suggests the subject line is working. Composes a broadcast to all free-tier users for a product update. Sends. History tab logs it.

**Capabilities Revealed:** Admin metrics (assessments, conversions, viral stats), email sequence monitoring, broadcast compose + send, history.

---

## 4. Core Features & Acceptance Criteria

### 4.1 Assessment Engine (F01)

| Feature | Acceptance Criteria |
|:---|:---|
| **Account creation** | User creates account (Google OAuth or email + magic link confirmation) BEFORE beginning assessment. Persistent login via Supabase refresh token. |
| **Multi-step form** | One question at a time, progress bar, section labels; no back-button regression mid-section |
| **Per-question persistence** | Every response saved to `assessment_progress` (JSONB) on each answer. If user closes tab, nothing is lost. |
| **Abandonment recovery** | If user abandons for >24 hours, system sends "Pick up where you left off" email with magic-link auth URL + redirect to resume at exact question |
| **Resume flow** | On return, persistent login auto-authenticates; system loads exact position (layer, instrument, item number) |
| **Core Layer (mandatory)** | IPIP-50, RIASEC, ECR-R Short, SWLS, SCS-SF, DERS-16, WEIMS, Flourishing Scale, Decoded Wellness Check — ~113 items, ~25–30 min; all users complete the same battery |
| **Optional add-ons (user selects)** | After Core, user is offered: GAD-7 (recommended if high Neuroticism), ASRS (recommended if low Conscientiousness), CSI-4 (if in a relationship), ACE-3 (opt-in, sensitive). User decides — no auto-branching. |
| **Depth Layer** | IFS-adjacent, CAT-Q short, Moral Injury, ACE Full — optional unlock for Mastery tier |
| **Response validity check** | Before scoring, system checks for straight-lining (all same value) and contradictory reverse-scored pairs. If invalid, flag for review and warn in report. |
| **Scoring engine** | TypeScript scoring functions per instrument; all scoring keys implemented and unit-tested (see DECODED_SCORING.md) |
| **Storage** | Raw responses → `assessment_responses`; computed scores → `assessment_scores`; linked to authenticated user |
| **License compliance** | Only licensed or public domain instruments used (see DECODED.md §12 for license action items — resolved) |
| **Safety gateway** | Suicidal ideation items trigger immediate crisis resource display; assessment paused |

**Done:** User creates account, completes assessment (~25–35 min depending on add-ons) with per-question state persistence. Scores computed and stored. Abandonment recovery email sent if needed.

### 4.2 Report Generator (F02)

> **Canonical section list.** All other documents reference these IDs. If any doc disagrees, this table wins.

#### Free Sections (7)

| ID | Section Name | Key Instruments | Contents |
|:---|:---|:---|:---|
| **RS01** | You, Decoded (Summary Dashboard) | Composite | Summary table (6 dimensions), Top 3 Strengths, Top 3 Growth Edges, Decoded Score (0–100) |
| **RS02** | What the Data Shows | Multi-instrument synthesis | 5 named cross-instrument insight bullets, "finding that might surprise you most" callout |
| **RS03** | Your Decoded Archetype | Big Five + RIASEC + full profile | Base type name + AI sub-label + tagline, 2–3 paragraph narrative, 3 named sub-themes, closing coach question |
| **RS04** | How You're Wired | Big Five cross-trait | 3 named interaction patterns (1 strength, 1 tension, 1 blindspot), radar chart, Pattern Alert callout |
| **RS05** | Your Trait Profile | IPIP-50 | Per-trait: percentile + 3 Gifts + 3 Challenges + interaction note, closing coach question |
| **RS06** | Your Attachment Map | ECR-R/ECR-S | Anxiety × Avoidance quadrant plot, style in romantic/friendship/work, cross-instrument note, Compare tease |
| **RS07** | Your Inner System | Custom IFS-adjacent | Protector parts named, exile glimpse, score gaps, Groundedness score, closing coach question (peak emotional resonance) |

#### Locked Sections (5) — Upgrade Gate after RS07

| ID | Section Name | Key Instruments | Min Tier | Contents |
|:---|:---|:---|:---|:---|
| **RS08** | Your Emotional Landscape | DERS-16 | Insight ($29) | 6 regulation subscales, interaction with attachment + Neuroticism, coach exercise |
| **RS09** | Career & Motivation | WEIMS + RIASEC | Insight ($29) | Intrinsic vs. Extrinsic motivation, Holland Code roles, motivation gap analysis |
| **RS10** | Your Relationship Blueprint | ECR-R + CSI-4 | Insight ($29) | Attachment in specific relationship types, early experience patterns, compatibility preview |
| **RS11** | Wellbeing Dashboard | SWLS + Flourishing Scale + Decoded Wellness Check | Insight ($29) | Life satisfaction subscales, flourishing dimensions, 10-dimension wellness radar (exercise, sleep, nutrition, energy, stress, coping, social, purpose, screen time, vitality), wellbeing gap analysis |
| **RS12** | Your Growth Roadmap | AI synthesis | Growth ($69) | 3 prioritized growth edges with actions, coach starters, 90-day reflection questions |

#### Depth Layer (Optional — Mastery only)

| ID | Section Name | Key Instrument |
|:---|:---|:---|
| **RD01** | Neurodivergence Profile | CAT-Q |
| **RD02** | Moral Injury & Repair | MISS |
| **RD03** | IFS Deep Dive — Full Parts Map | Custom |
| **RD04** | Shadow & Integration | Custom Jungian |

#### Report Generation Requirements

| Feature | Acceptance Criteria |
|:---|:---|
| **AI generation** | GPT-4o, section-by-section via structured prompts; each section 600–1,200 words; coaching-framed language only (no clinical labels, no raw scores) |
| **Async generation** | Report generation runs asynchronously via Edge Function queue. On assessment completion: (1) user sees "Your report is being written" loading state with real-time section-by-section progress, (2) each section generated individually and streamed to frontend via Supabase Realtime subscription on `assessment_reports.sections` JSONB updates, (3) user can read early sections while later sections still generate. Fallback: if generation exceeds 2 min, send email with report link. |
| **Data visualizations** | Big Five radar chart, Attachment quadrant, RIASEC hexagon — all free. Locked sections have blurred chart previews |
| **Caching** | Report generated once, stored in `assessment_reports` (sections keyed by RS-ID); re-served from cache on subsequent visits |
| **PDF export** | Browser "Save as PDF" via `@media print` stylesheet + `window.print()` button. Print styles hide nav, remove blur gates for paid users, force page breaks between sections. Professional React-PDF deferred to Phase 2. |
| **Clinical framing** | All output growth-oriented; never diagnostic; prominent non-clinical disclaimer at top |
| **Bottom CTA** | Pre-generated personalized coach opener + Share Card button + "Check in with me in a week" opt-in |
| **Coach question** | Every section ends with a closing coach question: *"This is the question I'd open our first session with"* |
| **Archetype system** | ~16 recognizable base types (e.g., Architect, Explorer, Advocate) derived from Big Five cluster analysis + AI-generated sub-label from full assessment data. Format: `BASE TYPE — Sub-Label`. Example: "ARCHITECT — Designer with Compassion". See DECODED_ARCHETYPES.md. |

**Done:** Every user gets a free, accurate, beautifully designed 7-section report. 5 locked sections visible but blurred with upgrade prompts. Every section ends with a coach question.

### 4.3 Compare / Profile Invite (F03) — Viral Engine

| Feature | Acceptance Criteria |
|:---|:---|
| **Invite creation** | User names recipient + selects Relationship Preset (Partner/Friend/Colleague/Family) → unique link generated |
| **Recipient landing page** | Shows sender's first name and preset — "Maya shared her full personality profile with you. Complete Decoded to see it." No sender data shown until recipient completes |
| **Forced completion** | Recipient must finish assessment to unlock the comparison |
| **Comparison view** | Side-by-side key scores; AI Compatibility Report (Insight+ tier) |
| **AI Compatibility Report** | Attachment overlay, Big Five interaction map, communication gap analysis, conflict prediction, shared growth edges — generated on demand |
| **Sender notification** | Email to sender when recipient completes; deep link back to comparison |

**Done:** User A invites User B → B must complete Decoded → both see comparison → A gets AI Compatibility Report (Insight+ tier).

### 4.4 Pricing & Upgrade Tiers (F04)

| Tier | Price | Included | Coach Messages |
|:---|:---|:---|:---|
| **Free** | $0 | Full assessment + 7-section report (web + print PDF) | 5/day |
| **Insight** | $29/year | + 5 locked sections (RS08–RS12) + AI Compatibility Report | 50/week |
| **Growth** | $69/year | Insight + Growth Roadmap (RS12) + Compare AI analysis | 300/month |
| **Mastery** | $99/mo or $349/yr | Everything + full framework library + Depth Layer (RD01–RD04) | Unlimited |

| Feature | Acceptance Criteria |
|:---|:---|
| **Stripe integration** | Products/prices created: `insight_annual`, `growth_annual`, `mastery_monthly`, `mastery_annual` |
| **Upgrade modal** | Shown after free report with clear tier comparison; upgrade CTA in locked section gates |
| **Webhook handling** | Stripe webhooks update `users.subscription_tier` in real-time |
| **Annual savings callout** | Mastery Annual: "$349/year — save $849 vs. monthly" prominently displayed |
| **Message enforcement** | Rate limits enforced per tier: Free=5/day, Insight=50/week, Growth=300/month, Mastery=unlimited |

**Done:** All tiers purchasable via Stripe. Locked sections unlock immediately on upgrade. Message limits enforced.

### 4.5 Coach Handoff (F05)

| Feature | Acceptance Criteria |
|:---|:---|
| **Assessment profile schema** | `assessment_profile` JSON: key scores, narrative labels, identified coaching priorities, suggested starting framework |
| **Prompt injection** | Coaching engine reads `user.assessment_profile` and injects as context layer before first coach message |
| **Personalized first message** | Generated from assessment data; references archetype, top growth edge, suggested framework; poses one sharp opening question |
| **Onboarding bypass** | Decoded users skip website/LinkedIn scraping onboarding — profile IS the onboarding |
| **Quality bar** | 10 test profiles reviewed; coach opening feels specific, not generic |

**Done:** Coach starts knowing the user. First message references their actual results. No "tell me about yourself."

### 4.6 Share Card / Share Your Type (F06, F07)

| Feature | Acceptance Criteria |
|:---|:---|
| **Card generation** | Archetype name, first name, tagline, Top 3 Superpowers, Top 3 Growth Edges, `mastery.tv/decoded` watermark |
| **Format options** | Story (9:16), Feed (1:1), Landscape (16:9) |
| **Design standard** | Premium glassmorphism, Decoded visual identity — **zero clipart, zero sparkles, zero AI aesthetic (BRAND.md §14)** |
| **Download / share** | Download as PNG; native share sheet on mobile |
| **Entry points** | Post-archetype callout banner + report footer (F07 reuses F06 modal) |

**Done:** Users can generate and download a premium-quality shareable card. Cards make people look good — not like they used a free app.

### 4.7 Referral URL (F08)

| Feature | Acceptance Criteria |
|:---|:---|
| **Unique link** | Pre-populated referral URL per user |
| **Referrer reward** | Friend completes → referrer unlocks 1 Insight section OR 1 month of coach messages |
| **Recipient reward** | Same bonus on completion |
| **Milestones** | 3 referrals = Insight tier 1 month free; 5 referrals = Growth tier trial |
| **Tracking** | `referral_events` table: referrer_id, recipient_id, completed_at, reward_granted |

### 4.8 Email Marketing System (F10)

| Feature | Acceptance Criteria |
|:---|:---|
| **Auto-enrollment** | On `assessment_reports` creation → auto-insert into `email_sequence_enrollments` |
| **8-email sequence** | See DECODED.md §15.1 for day/trigger/job spec for each email |
| **Personalization** | `{{first_name}}`, `{{archetype_name}}`, `{{top_insight}}` tokens populated per user |
| **Behavioral triggers** | Email 5 (re-engagement) only fires if no coach session opened; Email 6 only to free-tier users |
| **Unsubscribe** | One-click in every email; sets `email_preferences.subscribed = false`; confirmation page shown |
| **Admin panel** | Sequences tab (enrollment counts, positions, pause/resume); Broadcasts tab (compose/send/history) |
| **Tracking** | Resend webhooks → `email_sends` (opened_at, clicked_at, bounced_at) |
| **Brand compliance** | No clipart, no sparkles, no emoji subject lines; coach voice; 150–300 words per email (BRAND.md §14) |

---

## 5. Product Scope

### 5.1 MVP — Must-Have for Launch

- Adaptive assessment engine (Core + Adaptive layers; Depth Layer can be post-launch)
- Email gate (no credit card)
- Report generator: 7 free sections + 4 locked sections + data visualizations
- Bottom-of-report coaching CTA with personalized opener
- Pricing tiers: Free, Insight ($29), Growth ($69), Mastery ($99mo/$349yr) via Stripe
- Compare / Profile Invite mechanic (F03) — primary growth loop
- Share Card (F06) + Share Your Type callout (F07)
- Referral URL (F08)
- Coach handoff (F05)
- Email infrastructure + 8-email onboarding sequence (F10)
- Admin: assessment metrics, email panel, viral loop stats
- Legal: non-clinical disclaimer, GDPR delete-anytime, privacy policy
- Design: zero AI aesthetic (BRAND.md §14 enforced throughout)

### 5.2 Explicit "Not in V1" List

| Feature | Why Not V1 | Target |
|:---|:---|:---|
| **Dating Profile Generator (F09)** | Post-MVP growth feature; build after core is stable | Phase 2 |
| **Depth Layer assessments** | Optional paid add-on; Core + Adaptive sufficient for MVP | Phase 2 |
| **PDF export (paid sections)** | Free-section PDF is MVP; full PDF is an upsell | Phase 2 |
| **B2B organizational dashboard** | Validate B2C first | Phase 3 |
| **White-label team assessment** | Enterprise tier; Phase 3 | Phase 3 |
| **Progress tracking / reassessment** | Insight tier feature; requires 12-month data | Phase 2 (post-launch) |
| **Annual review email** | No data yet at launch | Phase 2 |
| **Mobile native app** | Web is sufficient; web share sheet handles mobile | Phase 3 |

### 5.3 Post-MVP Growth Features (Phase 2)

- Dating Profile Generator (F09) — Growth tier, under-35 demographic
- Full PDF export (all sections, paid tiers)
- Depth Layer assessments (IFS-adjacent, CAT-Q, Moral Injury)
- Reassessment flow + "You then vs. you now" report comparison
- B2B referral program (coaches, therapists as referring professionals)

---

## 6. Functional Requirements

### 6.1 Assessment

- **FR0:** User creates an account (Google OAuth or email + Supabase magic link) before beginning the assessment. Persistent login via Supabase refresh token.
- **FR1:** System presents one question at a time with progress indicator; no page reloads. Every response saved to `assessment_progress` JSONB on each answer.
- **FR2:** After Core Layer completion, system presents optional add-on instruments. System recommends specific add-ons based on Core scores (GAD-7 if Neuroticism ≥ 38; ASRS if Conscientiousness ≤ 20) but user decides whether to take them. No auto-branching.
- **FR3:** If user abandons assessment for >24 hours (`last_active_at < NOW() - INTERVAL '24 hours'` AND `completed_at IS NULL`), system sends a "Pick up where you left off" recovery email via Supabase magic link (auth + redirect to `/decoded/resume`). One email per abandonment.
- **FR4:** On resume, system auto-authenticates via refresh token and loads exact position (layer, instrument, item number) from `assessment_progress`. No re-login required.
- **FR5:** System detects suicidal ideation in ACE/trauma items and displays crisis resources; pauses assessment
- **FR6:** System uses only licensed or public domain instruments (license verification resolved — see DECODED.md §12)

### 6.2 Report

- **FR7:** System generates a 7-section free report (RS01–RS07) using GPT-4o with section-specific prompt templates; all language coaching-framed (never clinical)
- **FR8:** System presents 5 locked sections (RS08–RS12) as visible-but-blurred with section-specific upgrade prompts
- **FR9:** System caches report in `assessment_reports` (JSONB keyed by RS-ID); regeneration available but rate-limited
- **FR10:** System generates data visualizations (Big Five radar, Attachment quadrant, RIASEC hexagon) client-side from score data
- **FR11:** System generates a personalized coach opener (separate from the report) using assessment data; displayed at bottom-of-report CTA

### 6.3 Viral & Sharing

- **FR12:** Authenticated users can generate a unique Compare invite link with named recipient and Relationship Preset
- **FR13:** Recipients who receive a Compare link see a landing page revealing the sender's name and preset; cannot see profile data until they complete their own assessment
- **FR14:** On recipient assessment completion, system generates an AI Compatibility Report (available to Insight+ tier users) and notifies the sender
- **FR15:** Users can generate a Share Card in three aspect ratios; card is downloadable as PNG
- **FR16:** Users have a unique referral URL; system tracks completions and grants rewards per the milestone table (DECODED.md §14.4)

### 6.4 Subscriptions & Billing

- **FR17:** Users can purchase any paid tier via Stripe Checkout; subscription status reflected immediately via webhook
- **FR18:** Locked report sections unlock instantly on upgrade without page reload
- **FR19:** Users can manage, upgrade, downgrade, or cancel subscriptions from dashboard settings
- **FR20:** Annual pricing prominently shows savings vs. monthly equivalent

### 6.5 Coach Handoff

- **FR21:** On Coach tier activation, system generates `assessment_profile` JSON from scored instruments
- **FR22:** Coaching engine injects `assessment_profile` as a named context layer; coach first message is generated before user types anything
- **FR23:** Decoded users bypass website/LinkedIn scraping onboarding; `assessment_profile` replaces it

### 6.6 Email

- **FR24:** System auto-enrolls every user who receives a report into the `decoded_onboarding` sequence
- **FR25:** Sequence runner checks `email_sequence_enrollments` hourly; dispatches due emails via Resend
- **FR26:** Email 5 (re-engagement) dispatched only if no coach session recorded within 14 days of report completion
- **FR27:** Email 6 (upgrade nudge) dispatched only to users with `subscription_tier = 'free'`
- **FR28:** Every marketing email includes one-click unsubscribe; system honors immediately
- **FR29:** Admin can compose and send broadcast emails to segmented user lists

### 6.7 Administration

- **FR30:** Admin dashboard shows: assessments started/completed (daily/weekly), conversion by tier, email sequence health, viral loop stats (invites sent, completion rate)
- **FR31:** Admin can pause/resume individual user's sequence enrollment
- **FR32:** Admin can view per-campaign email stats (sent, opened, clicked, unsubscribed)

---

## 7. Non-Functional Requirements

### 7.1 Performance
- **NFR1:** Assessment question renders in <1 second
- **NFR2:** Report generation completes in <90 seconds; user sees per-section progress indicator with real-time streaming. Sections appear as they're generated (first section visible in <15 sec).
- **NFR3:** Cached report page loads in <2 seconds
- **NFR4:** Share card generates in <3 seconds

### 7.2 Security
- **NFR5:** RLS enforced on all tables — users access only their own data
- **NFR6:** Assessment responses are never used for model training (explicit in privacy policy)
- **NFR7:** Stripe webhooks verified by signature on every request
- **NFR8:** Orphaned `assessment_progress` records (no completion after 90 days) purged automatically

### 7.3 Privacy & Compliance
- **NFR9:** Non-clinical disclaimer displayed before assessment start and at top of every report
- **NFR10:** Users can request full data deletion (GDPR Article 17); deletion removes all assessment data, report, and sequence enrollments
- **NFR11:** GDPR-compliant cookie consent on landing page
- **NFR12:** Instrument licenses verified before commercial use (Gate 0 blocker)

### 7.4 Design
- **NFR13:** Zero clipart, zero sparkle icons, zero emoji section headers throughout all Decoded UI (BRAND.md §14)
- **NFR14:** "The Economist test" — every design element must feel editorial-quality
- **NFR15:** Share cards are premium enough that users want to share them; A/B test card designs before launch

---

## 8. Technical Constraints

| Constraint | Rationale |
|:---|:---|
| **Extends MasteryTV Next.js app** | New routes under `/decoded`; no separate infrastructure |
| **Supabase** | Auth (Google OAuth + magic link), DB, Edge Functions, pg_cron (sequence runner + abandonment check), Storage (card assets) |
| **GPT-4o for report generation** | Long-form, structured output; Claude 3.5 Sonnet for coach handoff message |
| **PDF export** | Browser "Save as PDF" via `@media print` stylesheet + `window.print()`. No server-side PDF generation in V1. |
| **Resend for email** | Existing relationship; simple API; good deliverability |
| **React Email for templates** | Type-safe; works with Resend; no template builder required |
| **Stripe** | Extends existing Mastery Coach Stripe integration; new price objects: `insight_annual`, `growth_annual`, `mastery_monthly`, `mastery_annual` |
| **Instrument licenses** | Resolved (May 19, 2026). All instruments cleared for commercial use. |

---

## 9. Resolved Questions

> [!NOTE]
> All open questions resolved during the May 19, 2026 review session.

1. **License gate:** ✅ Resolved. Thomas confirmed all instrument licenses are handled (May 19, 2026).
2. **Auth flow:** ✅ Resolved. Auth-first: user creates account (Google OAuth or magic link) before assessment begins. No anonymous sessions. Per-question state persistence. Abandonment recovery email after 24h.
3. **Report generation timing:** ✅ Resolved. Report generated immediately after scoring (post-authentication). No wasted generation on bounced users since authentication happens first.
4. **AI Compatibility Report:** On-demand (button click) — confirmed.
5. **Archetype system:** ✅ Resolved. Hybrid: ~16 recognizable base types from Big Five clusters + AI-generated sub-label from full assessment data. Format: `BASE TYPE — Sub-Label`. See DECODED_ARCHETYPES.md.
6. **PDF strategy:** ✅ Resolved. Browser print-to-PDF via `@media print` + `window.print()` for V1. React-PDF deferred to Phase 2.
7. **Timeline:** ✅ Resolved. Sprint 0 timeline adjusted to 10–12 weeks. Ship everything.
8. **Tier names:** ✅ Resolved. Insight / Growth / Mastery (replacing Refresh / Compatibility / Coach).
9. **Coach message limits:** ✅ Resolved. Free=5/day, Insight=50/week, Growth=300/month, Mastery=unlimited.

---

## 10. Gate 1 Checklist

- [x] **Core features defined with acceptance criteria** — Section 4: 8 features with measurable acceptance criteria
- [x] **User journeys mapped** — Section 3: 5 journeys covering assessment → report → upgrade → viral → coach handoff → admin
- [x] **MVP scope bounded** — Section 5.2: explicit "Not in V1" list with rationale and target phase
- [x] **Success metrics defined** — Section 2: user, business, and technical KPIs with 3/6/12-month targets
- [x] **License resolution** — Resolved May 19, 2026. Thomas confirmed.
- [ ] **User approved PRD**

---

## 11. References

| Document | Location |
|:---|:---|
| Decoded Discovery | [directives/DECODED.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED.md) |
| Feature Backlog (F01–F10) | [directives/DECODED_FEATURES.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_FEATURES.md) |
| Report Structure | [directives/DECODED_REPORT_STRUCTURE.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_REPORT_STRUCTURE.md) |
| Competitive Analysis | [directives/COMPETITIVE_ANALYSIS_DP_REPORT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/COMPETITIVE_ANALYSIS_DP_REPORT.md) |
| Brand & Design System | [directives/BRAND.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/BRAND.md) |
| Sprint Plan (Sprint 0) | [directives/SPRINT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/SPRINT.md) |
| Coach App PRD (format reference) | [directives/PRD.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/PRD.md) |
| Email Marketing Skill | [skills/email-marketing/SKILL.md](file:///Users/thomaswood/.gemini/antigravity/skills/email-marketing/SKILL.md) |

> **Next Phase:** Sprint 0.1 Build — Supabase schema + assessment engine. Gate 1 approval required first.
