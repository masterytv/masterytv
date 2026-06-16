# Decoded — Feature Specifications & Competitive Analysis

> ⛔ **SUPERSEDED / ON HOLD — June 16, 2026.** The project has taken a strategic **detour to Relatti** (relationship coaching). Current direction lives in [`STRATEGY.md`](STRATEGY.md) + [`RELATIONSHIP_PRD.md`](RELATIONSHIP_PRD.md). The Decoded **assessment engine** is reused, but the **feature roadmap and tier pricing (Free/Insight/Growth/Mastery) below are superseded**. **Do not treat them as the current direction.**

> **Version:** 1.1
> **Date:** May 18, 2026 | Updated: May 19, 2026
> **Status:** ✅ Active — Detailed feature specifications and competitive analysis per feature. See DECODED_PRD.md for acceptance criteria.
> **Source:** Competitive analysis of Deep Personality (app.deeppersonality.app) + Thomas's additions
> **Tier Names:** Free / Insight ($29/yr) / Growth ($69/yr) / Mastery ($349/yr)

---

## How to Read This Document

Each feature entry includes:
- **What Deep Personality does** — sourced from screenshots
- **What Decoded does** — our version, differentiated where possible
- **Tier** — Free / Insight ($29yr) / Growth ($69yr) / Mastery ($349yr/coach)
- **Priority** — MVP (must ship at launch) or Post-MVP

---

## F01 — Download Report

### What Deep Personality Does
Single button: **"Download Report PDF"**. Downloads the full long-form report as a branded PDF. No customization — user gets everything.

### What Decoded Does
**"Download Your Decoded Report"** — PDF download of the full report, Decoded-branded, with the user's name and completion date on the cover.

**Decoded Improvements:**
- Cover page: User name, archetype/identity label, date completed
- Table of contents with page numbers
- "Next Steps" final page with CTA to upgrade or start coaching
- PDF is printer-optimized (not just a web dump)

**Tier:** Free (full report access)
**Priority:** MVP

---

## F02 — Share Profile

### What Deep Personality Does
Modal: **"Share Profile"** with granular section-level privacy controls.

Observed features:
- Toggle each section on/off individually (14 sections shown)
- "All | None" quick-select
- **Sensitive Information Warning** — consent checkbox before sharing ("This profile contains personal mental health and psychological information. Once shared, recipients can screenshot or save this data.")
- **Password Protection** — optional toggle to require a password to view
- **Link Expiry** — dropdown selector (30 days default, presumably other options)
- "Create Share Link" button generates a unique URL

Sections available to share: Identity & Convergence, Big Five Personality, Values, Attachment Style, Emotional Regulation, Mental Health, ADHD/Focus, Wellbeing, Resilience, Early Experiences, Career & Motivation, Relationships, Physical Health, Neurodivergence, Interpersonal Patterns, Inner System, Shadow & Deeper Personality, AI Analysis

### What Decoded Does
**"Share Your Decoded Profile"** — same core mechanic, improved UX and framing.

**Decoded Improvements:**
- Section toggles mapped to Decoded's section names (not Deep Personality's)
- Pre-selected defaults: Core sections on, Depth sections (Mental Health, Neurodivergence, Shadow) off — safer default
- Sensitive Information Warning retained — it's the right call legally and ethically
- **Expiry options:** 7 days / 30 days / 90 days / Never
- **Password protection** retained
- **Viewer tracking:** Optional "notify me when someone views this link" (email ping)
- **Partial share mode:** "Share only my strengths + archetype" quick preset for LinkedIn/professional contexts

**Tier:** Free (basic share link) / Insight tier (password protection + expiry control + view notifications)
**Priority:** MVP (basic), Post-MVP (advanced controls)

---

## F03 — Compare / Profile Invite (Viral Acquisition Engine)

### What Deep Personality Does — Corrected Understanding

This is **not** a comparison tool — it is the **primary viral acquisition channel** built into the product mechanic.

**Full flow observed in screenshots:**

**Step 1 — User A creates an invite:**
- Clicks "Compare" → "New Invite"
- Names the recipient: "Who is this for?" (e.g. "Sarah, my boss")
- Selects a **Relationship Preset:** Partner / Friend / Colleague / Family
  - Each preset auto-configures which assessment sections are shared
  - "Partner" default: **Sharing 31 of 31 assessments** (full access)
  - Sections visible: Personality (3/3), Values & Interests (3/3), Wellbeing (4/4), Physical Health (5/5), Relationships & Attachment (5/5), Emotional Processing (6/6)
  - Can expand any category to toggle individual sub-assessments on/off
  - Note at bottom: *"Clinical data is only shared when you explicitly enable it above"*
- Clicks **"Create Invite Link"** — generates a unique shareable URL

**Step 2 — Person B receives the invite:**
- Gets a link (via text, email, wherever User A sends it)
- Clicks through to see that **User A has already unlocked their profile for them**
- To access it, they must complete the Decoded assessment
- The **curiosity gap** is the hook: *"Someone you know has shared their full personality profile with you. Complete your assessment to see it."*

**Step 3 — The loop closes:**
- Person B completes the assessment → becomes a Decoded user
- Both profiles are now linked → comparison view unlocks
- User A is notified → returns to the app → sees Person B's profile
- Side-by-side (or synthesized) comparison view appears

**Why this works:** The motivation to take the assessment isn't abstract self-improvement — it's *"someone I know has already shared their data with me and is waiting."* That social pressure + curiosity is far more powerful than any ad.

### What Decoded Does
**"Invite Someone to Decoded"** — same mechanic, with one major upgrade: the comparison payoff is an AI-synthesized relationship analysis, not just a side-by-side data view.

**Relationship Presets (matching Deep Personality):**
- **Partner** — shares everything (all sections, full depth)
- **Friend** — shares personality, values, wellbeing; withholds clinical/health
- **Colleague** — shares Big Five, career motivation, communication style only
- **Family** — shares values, personality, emotional processing; excludes physical/neurodivergence

**Decoded Improvements:**
- **The comparison payoff is a coaching product.** Once both profiles are linked, the AI generates a **Decoded Compatibility Report:**
  - Attachment style overlay (ECR-R scores for both — does anxious + avoidant dynamic apply?)
  - Big Five interaction map (where personalities align and clash)
  - Communication style gap analysis
  - Conflict pattern prediction ("Here's where friction is most likely to emerge")
  - Shared growth edges ("What you could work on together")
  - Coaching suggestion for the pair
- **Preset defaults are smarter:** "Colleague" preset auto-excludes mental health, physical health, and neurodivergence sections — users don't have to think about it
- **Recipient landing page** is Decoded-branded: *"[Name] has shared their Decoded profile with you."* Strong conversion page, not just a link dump
- **Expiry on invite links** (optional — default 14 days, configurable)
- **User A gets notified** when Person B completes their assessment

**Tier:** Free (create invite, access basic comparison) / Insight (AI compatibility report)
**Priority:** ✅ **MVP** — this IS the growth loop. Without it at launch, organic spread is minimal.

> **Why Compare is MVP, not Post-MVP:** The invite mechanic works even before Person B has a profile. User A can send invites on day one. Person B's motivation to take the assessment ("someone I know is waiting for me") is the strongest acquisition driver we have. This cannot wait for V1.1.

---

## F04 — Sections (Table of Contents)

### What Deep Personality Does
Sticky floating panel bottom-left: **"Jump to Section"**

Observed sections in TOC:
- You at a Glance
- What Your Data Revealed
- Your Identity
- How Your Traits Interact
- Your Trait Profile
- Your Inner System
- (More sections below — cut off in screenshot)

Behavior: Fixed panel that scrolls with the page; clicking a section jumps to that anchor. "Close" button collapses it.

### What Decoded Does
**Sticky Section Navigator** — same concept, Decoded-branded.

**Decoded Improvements:**
- Sections mapped to Decoded's report structure (see DECODED.md §4.2 for full section list)
- **Progress indicator** — small dot or checkmark per section as user scrolls through (shows "you've read 4 of 10 sections")
- **Section time estimate** — "~3 min read" per section
- On mobile: Bottom sheet drawer instead of floating panel
- **Highlight / bookmark** — user can flag a section ("this resonated") for later reference or to share with their coach

**Tier:** Free (all users)
**Priority:** MVP

---

## F05 — Chat (AI Coach)

### What Deep Personality Does
Floating chat bubble bottom-right. Opens an in-report AI chat interface. Appears to be context-aware (knows the user's profile). Positioned as "AI Analysis" companion.

This is their weakest feature — it's reactive. The user has to ask questions. The AI has no coaching agenda.

### What Decoded Does
**"Talk to Your Coach"** — the chat bubble is the gateway to the pre-loaded Mastery Coach.

This is the single most important differentiator. **The coach knows you before you say a word.**

**Decoded Implementation:**
- Same floating chat button placement
- On first open: Coach initiates with a personalized opener based on the user's top result
  > *"I've reviewed your Decoded profile. Based on your [attachment style] and [Big Five pattern], I'd like to start with something specific. Can I share what I noticed?"*
- The coach has full read access to all sections the user completed
- **Not a Q&A bot** — actively pursues a coaching agenda based on the profile
- **Session memory** — conversations persist; coach references past sessions
- **Upgrade gate:** Free tier gets 3 coach messages. Insight tier gets 10/month. Growth+ gets unlimited.

**Tier:** Free (3 messages) / Insight (10/month) / Growth (unlimited, no coaching frameworks) / Mastery (unlimited + full framework library access)
**Priority:** MVP (basic chat with profile context) — full coaching engine is ongoing

---

## F06 — Share Your Card (Visual Archetype Card Generator)

### What Deep Personality Does
A **"Share Your Card"** button appears within the hero/archetype section of the report. Clicking it opens an overlay with two format tabs and a live preview of a branded visual card.

**Observed features:**
- **Format selector:** Two tabs — **Story (9:16)** for Instagram Stories/TikTok, **Feed (16:9)** for Twitter/LinkedIn feed posts
- **Story card contents:** Archetype name ("The Radiant Wanderer"), user name, archetype tagline, Superpowers list — branded with "DEEP PERSONALITY" wordmark and sparkle icon
- **Feed card contents:** Same info + Kryptonite section added, landscape layout, "✨ Discover your archetype deeppersonality.app" watermark at the bottom
- **Actions:** "Download PNG" (saves the card as an image) and "Share" (native OS share sheet)
- Both cards use the Deep Personality brand colors (purple gradient) — the cards look great in feeds

**Strategic purpose:** Every person who shares a card is a walking Decoded ad. "The Radiant Wanderer" goes on someone's Instagram story → their followers ask "what is that?" → acquisition.

### What Decoded Does
**"Share Your Decoded Card"** — same mechanic, but the card is Decoded-branded and visually superior.

**Formats (matching Deep Personality):**
- **Story (9:16)** — Instagram Stories, TikTok, Reels
- **Feed (1:1)** — Instagram grid, Twitter/X
- **Landscape (16:9)** — LinkedIn, Twitter/X wide

**Card contents:**
- User's Decoded archetype name (our equivalent of "The Radiant Wanderer")
- User's first name
- Archetype tagline/description (1-2 lines)
- Top 3 Superpowers
- Top 3 Growth Edges (our version of "Kryptonite" — less self-deprecating framing)
- "mastery.tv/decoded" watermark + Decoded logo
- *Optional:* Include one key score visualization (e.g. attachment style badge, Big Five radar mini-chart)

**Decoded Improvements:**
- **Design quality** — Decoded's card should be noticeably more beautiful than Deep Personality's. Glassmorphism, richer gradients, the Decoded visual identity. People share things that look premium.
- **Instagram-native framing:** Card copy uses "I took the Decoded assessment" rather than "Deep Personality" — user voice, not brand voice
- **Seasonal/context variants** — optional future: different card backgrounds (e.g. a relationship-focused card when shared after a Compare invite)
- **Text customization:** Let the user edit the tagline before sharing ("This felt SO accurate" overlay)

**Tier:** Free (Story format, basic card) / Insight (all formats + customization)
**Priority:** MVP — this is pure viral surface area. Every share is a free ad.

---

## F07 — Share Your Type (Secondary Entry Point)

### What Deep Personality Does
A secondary callout banner below the hero section reads:
> **"You're The Radiant Wanderer"**
> *"Share your archetype card on Instagram or send it to a friend"*
> [Share Your Type] button

This appears to be a **second entry point to the same Share Your Card feature (F06)** — functionally identical, just triggered from a different location in the report scroll. It serves as a reminder/nudge mid-report for users who scrolled past the top CTA.

### What Decoded Does
Match this pattern — it's good UX. The report is long. Repeat the CTA.

**Decoded Implementation:**
- Identical callout card at the end of the first major report section (after the Archetype/Identity section)
- Phrasing: *"You're [Archetype Name]. Share it."* with a [Share Your Card] button
- Second instance at the very bottom of the report above the coach CTA
- No new feature required — same Share Your Card modal (F06), second trigger point

**Tier:** Free
**Priority:** MVP (no dev overhead — reuses F06 modal)

---

## F08 — Referral URL (Friend Referral with Incentive)

### What Deep Personality Does
A dedicated referral block embedded in the report:
> **"Share Deep Personality with a friend"**
> *"They get a free quiz. You get featured in our monthly personality insights."*
> Pre-populated URL: `https://app.deeppersonality.app/?ref=71cbb95a`
> [Copy] button

**Observations:**
- Unique ref code per user (`?ref=71cbb95a`) — standard UTM/referral tracking
- Incentive for referrer: "featured in monthly personality insights" — **weak incentive**. This is newsletter exposure, not a product reward.
- Incentive for recipient: "free quiz" — but everyone gets the free quiz anyway. This is not a real hook.
- The mechanic is sound; the incentives are poorly designed.

### What Decoded Does
**"Refer a Friend to Decoded"** — same mechanic, meaningfully better incentives on both sides.

**Referral incentives (replacing Deep Personality's weak version):**
- **Referrer reward:** When your friend completes the assessment → you unlock **one free Insight report section** (normally paid tier) OR **1 month of coach messages** — a real product reward
- **Recipient reward:** They complete Decoded → they get the same bonus section unlock → creates a mutual benefit loop
- **Milestone rewards:** 3 referrals = Insight tier for free for 1 month; 5 referrals = Growth tier trial

**UI Implementation:**
- Same pre-populated URL with unique ref code
- [Copy] button (clipboard) + [Share] button (native share sheet)
- Progress tracker: "You've referred 1 friend. Refer 2 more to unlock Insight free for a month."
- Displayed in report page AND in user account dashboard

**Tier:** Free (all users can refer)
**Priority:** MVP (the URL + Copy is trivial to build; incentive logic can be basic at launch and improved)

> **Note on incentive design:** Deep Personality's incentive is brand-facing (feature them in a newsletter). Ours should be product-facing (give them more of the product). The difference in conversion will be significant.

---

## F09 — Dating Profile Generator

### What Deep Personality Does
A self-contained tool embedded in the report (not gated — visible as a CTA block).

**Modal UI observed in screenshot:**
- **Platform selector:** Hinge ("For meaningful connections"), Bumble ("Confidence-focused"), Tinder ("Quick & catchy"), Any App ("Works everywhere")
- **Tone selector (pick 1–3):** Witty / Sincere / Adventurous / Intellectual / Laid-back — generates one bio per tone selected
- **Length:** Short (1–2 sentences) / Medium (3–4 sentences) / Long (full paragraph)
- **"Generate [N] Bio" button** — adapts label based on how many tones are selected
- **"What we'll highlight about [Name]:"** — shows which profile attributes it draws from: Openness, Extraversion, Agreeableness, Self-Direction, Stimulation, Attachment style

The bio is AI-generated from actual assessment data — not a generic template. The platform selector adjusts tone/length defaults. A Hinge bio is longer and depth-focused; Tinder is punchy and catchy.

### What Decoded Does
**"Decoded Dating Bio"** — same concept, with one meaningful improvement: we can explicitly surface attachment style in the bio in a way that attracts compatible partners.

**Decoded Implementation:**
- Same platform + tone + length selectors (match Deep Personality's UX — it's good)
- Add platforms: **Hinge, Bumble, Tinder, Hily, Coffee Meets Bagel, Any App**
- Add tone: **Vulnerable** (a Decoded-specific tone — leads with emotional honesty, appeals to secure/growth-minded daters)
- **"What Decoded highlights in your bio"** — same concept, but shows our instrument set: Big Five personality, Values, Attachment style, Career fit, Superpowers
- **Attachment style integration:** Option to include a subtle attachment-informed signal in the bio (e.g., "looking for depth, not just availability" = attachment-aware language without being clinical about it)
- **"Share Your Type" integration:** After generating, offer to create a profile card (F06 format) with the bio text + archetype name — shareable on Instagram before a first date

**Why this works for acquisition:**
- Dating app users are highly motivated to improve their bios — the tool is genuinely useful
- The bio output requires your Decoded data → motivates completion of the full assessment
- "Generated by Decoded" attribution in the bio or profile = exposure to matches

**Tier:** Growth ($69/yr)
**Priority:** 🟢 Post-MVP — low priority, younger demographic skew (under 35). Build after Core Report + Compare are stable.

> **Strategic note:** This feature has a natural demographic fit with users who are actively dating. It creates a unique acquisition channel (dating apps themselves) — anyone who sees a profile generated by Decoded might search for it. Low-priority but high-upside if executed well.

---

## F10 — Email Marketing System (Onboarding Sequence + Admin Infrastructure)

> **Skill:** `email-marketing` (created May 18, 2026)
> **Infrastructure reference:** Project Profound email CRM (conversation 005e8ecd) — simplify and port

### What This Is

Two related deliverables that must be built together:

1. **The email sequence** — an automated onboarding series sent to every enrolled user
2. **The email admin** — internal tooling to manage broadcasts, sequences, and unsubscribes

This is not a feature users see directly — it's the retention and activation layer under the product.

---

### The Decoded Onboarding Email Sequence (8 Emails)

Every user who completes the assessment is enrolled automatically.

| # | Day | Trigger | One Job | Subject Line Direction |
|:---|:---|:---|:---|:---|
| 1 | 0 (immediate) | Assessment complete | Get them to open the report | Curiosity gap: "Your results are in. One thing stood out." |
| 2 | 1 | Time | Surface their single most impactful insight | Personalized: "Tom — your [archetype] profile has a specific tension" |
| 3 | 3 | Time | Teach them how to use the coach | Feature education: "Your coach already read your report" |
| 4 | 7 | Time | Drive share/invite action (virality) | Social: "Who in your life should know this about you?" |
| 5 | 14 | Inaction (no coach session) | Re-engagement — coach has something to say | Re-engagement: "Your coach noticed something worth discussing" |
| 6 | 21 | Free-tier only | Upgrade nudge | Soft upgrade: "5 sections of your report are still locked" |
| 7 | 30 | Time | Milestone + review/upgrade ask | Milestone: "You've been Decoded for a month" |
| 8 | 60 | Time | Retake prompt + growth delta | Growth: "60 days later. Has anything changed?" |

**Key personalization tokens per email:**
- `{{first_name}}` — basic
- `{{archetype_name}}` — "The Radiant Wanderer" equivalent
- `{{top_insight}}` — the single most cross-instrument finding from their report (AI-generated, stored at report completion)
- `{{coach_opener}}` — pre-generated first coach message (stored at report completion)
- `{{days_since_signup}}` — computed
- `{{tier}}` — free vs. paid (for upgrade nudge conditional)

**Tone rules (from BRAND.md §14):**
- No emoji in subject lines
- No ✨ sparkle in body copy
- Coach voice — not marketing voice. Emails sound like they come from a thoughtful human, not a SaaS company.
- Second person, present tense
- 150–300 words max per email

---

### Admin Infrastructure Requirements

**What to build:**

| Component | Source | Action |
|:---|:---|:---|
| `email_campaigns` table | Project Profound (conversation 005e8ecd) | Port + simplify |
| `BroadcastEmail` React template | Project Profound | Port + restyle (no clipart icons — BRAND.md §14) |
| Admin compose + send UI | Project Profound | Port + add sequence management tabs |
| Unsubscribe logic | Project Profound | Reuse as-is |
| `email_preferences` table | New | One row per user — subscribed boolean + unsubscribed_at |
| `email_sequence_enrollments` table | New | Tracks where each user is in each sequence |
| `email_sends` table | New | Logs every individual send + open/click tracking |
| Sequence runner (Edge Function) | New | pg_cron hourly job — processes due sends |
| Resend webhook endpoint | New | Receives open/click events from Resend → writes to `email_sends` |

**Admin panel tabs:**
1. **Sequences** — view/pause/resume automated sequences; see enrollment counts and user positions
2. **Broadcasts** — compose, schedule, send manual campaigns to segments (all / free / paid / inactive)
3. **History** — per-campaign stats (sent, opens, clicks)
4. **Users** — search by email, view send history, manually unsub/resub

**Delivery stack:** Resend (primary) — same as existing Project Profound integration.

---

### Where This Lives in the Build

- **Sprint placement:** Email infrastructure = Sprint 1 (foundation, alongside auth + DB schema). Sequence content = Sprint 2 (can be written while app is being built).
- **Admin panel:** Part of the internal `/admin` route — same admin area as the assessment manager and user management.
- **Sequence enrollment trigger:** Fires from the same server action that marks a report as complete.

**Tier:** All tiers (operational, not user-facing)
**Priority:** MVP — retention without email is guesswork. Users who don't get an Email 3 ("your coach already read your report") won't know the coach feature exists.

---

## Feature Backlog (Thomas's Additions — TBD)

> Add your features below. I'll wordsmith and categorize them before the PRD.

- [ ] *[Thomas to add]*

---

## Feature Comparison Summary

| Feature | Deep Personality | Decoded | Decoded Advantage |
|:---|:---|:---|:---|
| **Download Report** | Full PDF download | Decoded-branded PDF with cover, TOC, next steps CTA | Stronger off-platform brand presence |
| **Share Profile** | Section toggles, password, expiry | Same + viewer notifications, safer defaults, pro presets | Better privacy UX, LinkedIn-ready preset |
| **Compare / Invite** | Relationship-typed invite → curiosity gap → viral acquisition | Same + AI-synthesized compatibility report as the payoff | **The growth loop IS the product — MVP** |
| **Sections (TOC)** | Floating panel, jump links | Same + read progress, time estimates, bookmarks | Reduces overwhelm, improves completion rate |
| **Chat** | Reactive AI Q&A | Pre-loaded coach with profile context, proactive coaching agenda | Night-and-day difference — this is the moat |
| **Share Your Card** | Story (9:16) + Feed (16:9) PNG download/share | Same formats + better design + user-voice framing + optional score badge | Every share is a free ad with Decoded branding |
| **Share Your Type** | Secondary CTA callout mid-report | Same — two trigger points (post-archetype section + report footer) | No dev overhead, doubles card share conversion |
| **Referral URL** | Weak incentive (newsletter feature) | Real product reward — unlock a section or coach messages for both referrer and recipient | Meaningfully higher referral conversion |

---

## Notes for PRD

- All eight features documented so far are MVP — none are Post-MVP except advanced controls within F02 (Share Profile)
- **Viral surface area priority:** F03 (Compare/Invite) > F06 (Share Card) > F08 (Referral URL) — these three are how Decoded spreads
- **Decoded moat:** F05 (Chat/Coach) — no competitor pre-loads a coaching session with the user's profile. This is the thing nobody else can copy quickly.
- **Design investment:** F06 (Share Your Card) cards must be beautiful. Deep Personality's are good but not great. Ours should be jaw-dropping — people share things that make them look good.
- Compare works day one — User A can send invites before Person B has a profile; the curiosity gap is the hook
- The viral loop: invite → recipient sees profile shared with them → takes assessment → loop closes → both get AI compatibility report
- Referral incentives must be product-facing (unlock something), not brand-facing (newsletter feature) — Deep Personality made this mistake
