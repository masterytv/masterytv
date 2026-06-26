# **Relatti Experience — The Relationship-First Spec**

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** June 26, 2026
> **Status:** 🟢 Direction approved — research synthesized, spec proposed, **founder decisions resolved June 26, 2026 (§8)**. Ready to build V1 (§7). No code changed yet.
> **Scope:** Every Relatti-facing surface — marketing, onboarding, assessment, report, dashboard, coach, shared artifacts, rituals, email/SMS.
> **Supersedes (for Relatti surfaces only):** the Decoded "discover your personality type" experience framing. The Decoded **engine** (assessment, scoring, archetypes, coach, report generator) is retained; this doc changes what the user *experiences and feels*, not the engine.
> **Read alongside:** `STRATEGY.md` (the pivot), `PLATFORM_ARCHITECTURE.md` (verticals-as-config), `RELATIONSHIP_ARCHITECTURE.md` (the dyad spine), `BRAND.md` (visual system).

---

## 0. The reframe, in one sentence

> **Today the hero is *your personality type*. For Relatti the hero must be *the two of you and the relationship between you* — and personality + attachment become the *instruments* the coach uses to help you reach each other, not the destination.**

Everything below follows from that single shift.

---

## 1. The problem (grounded diagnosis)

Relatti reuses the Decoded engine, which is correct — but it also inherited the Decoded **experience spine**: a personality-test product where the individual is the protagonist, the collectible type card is the centerpiece, and the coach is a solo self-improvement coach. Relationship content was layered *on top* of that spine rather than *becoming* it. The result, in the founder's words: "it's feeling like a personality test."

The pattern is consistent — **the surface chrome is Relatti; the content engine is still Decoded. The deeper a user goes, the more it reverts to "discover your type."**

| Surface | Current framing | Severity |
|---|---|---|
| Landing / login | Relationship-framed, brand-aware (rose, Heart, "relationship coach") | ✅ Mostly right |
| Relatti dashboard (`RelattiDashboard.tsx`) | Dyad panel, "talk to your coach," de-escalator — good bones; but the assessment card is "**Your archetype** / your full personality report" | 🟡 Good, archetype-centric |
| Assessment intro (`AssessmentEngine.tsx`) | "Discover What Kind of Partner You Are" (ok) + an "invite someone" viral screen + a "What You'll Explore" **personality** dimensions grid | 🟡 Half-relationship, half test |
| **The first report** (`ReportViewer.tsx`) | Opens with the **archetype name + the collectible "THE DIPLOMAT" card**, then sections **S1 You at a Glance → S2 Your Personality → S3 Your Inner World → S5 Your Relationships → S8 Growth Map**. The *only* relationship section is **4th**, behind three personality sections. | 🔴 The reframe failure, concentrated |
| **Coach first message** (`coaching/first-message.ts`) | A solo self-improvement letter: "how you think, what drives you," Big-Five tensions about *finished work*, *leadership*, *burnout*; attachment framed as it affects *professional relationships*; "coaching priorities" | 🔴 A career/personality coach, not a relationship coach |
| **"Coaching question" → coach** (`dashboard/chat/page.tsx:161`) | Hardcoded `"I was just reading my **Decoded** report — the {section} section…"` | 🔴 The word "Decoded" leaks to the user |
| Coaching questions / section names | Decoded section vocabulary ("You at a Glance") drives the prompts the user sees | 🔴 Test vocabulary surfacing |

**Key insight:** none of this is a copy-typo problem. It's an *architecture-of-attention* problem — what we put first, who we make the subject, and what we ask the user to feel and do.

---

## 2. The evidence base (why this works — the research foundation)

The relationship-first design is grounded in established relationship science + validated digital-intervention findings, not invention. Five pillars:

### 2.1 Gottman — what actually predicts relationship success
- **Bids for connection & "turning toward."** Relationships are built (or eroded) in thousands of tiny moments where one partner reaches and the other turns toward, away, or against. The accumulation is the "emotional bank account."
- **The Four Horsemen** that predict breakdown: **criticism, contempt** (most corrosive), **defensiveness, stonewalling** — and their antidotes.
- **Repair attempts.** Stable couples aren't conflict-free; they *repair* faster. The ability to say "that came out wrong, can we start over?" is the skill.
- **Love Maps.** Knowing your partner's inner world — and keeping the map current.
> **Implication for Relatti:** the product should manufacture *bids and turning-toward*, teach *repair*, name the *Four Horsemen* without jargon, and continuously deepen each partner's *love map* of the other.

### 2.2 EFT / Sue Johnson — the attachment engine of love
- Couples get trapped in a **negative cycle** that distresses the attachment bond; the cycle, not the partner, is the enemy ("you and me vs. the pattern").
- Underneath every fight are three attachment questions — **A.R.E.: Are you Accessible? Responsive? Engaged?**
- Gold-standard, validated across 20+ outcome studies.
> **Implication:** the coach and de-escalator should externalize "the cycle," speak to the attachment need beneath the complaint, and help each partner answer *yes* to A.R.E. This is also exactly where the attachment data earns its keep.

### 2.3 Self-Determination Theory — why people *do the work*
- Three needs drive durable motivation: **Autonomy** (I chose this), **Competence** (I can do this, I'm progressing), **Relatedness** (this connects me to someone I care about).
- **Autonomous** motivation (value/enjoyment) sustains behavior far better than pressure, rewards, or guilt.
> **Implication:** never shame or nag. Offer choices (autonomy), make every step small and winnable (competence), and frame all of it as moving *toward your partner* (relatedness — which a couples product gets for free if it stays dyad-centered).

### 2.4 Behavior design (Fogg) — the mechanics of a habit
- **B = MAP**: behavior happens when Motivation, Ability, and a Prompt converge. The lever is usually **Ability** — make the first action *tiny*.
- Celebrate immediately; emotion creates habit.
> **Implication:** the "do the work" ask must be 2 minutes, not a curriculum. Prompted, tiny, celebrated.

### 2.5 Validated couples-app findings (peer-reviewed + market)
From the Paired mixed-methods evaluation (PMC12001865) and the broader landscape (Paired, Lasting, Relish):
- **Both partners must engage.** A 2025 study: app usage improved emotional intimacy **only when both partners actively participated**; one-sided use showed *no significant benefit*. → **This validates Relatti's entire dyad-first thesis** and makes "get the second partner in and active" the #1 product job.
- **Frequency > duration.** Daily light engagement beat intensive-but-infrequent; >3-month daily users scored **35.5% higher** relationship quality than new users.
- **The curiosity loop.** "I got a notification she answered — I wanted to see what she said, so I opened mine." Partner-response is the most powerful re-engagement trigger.
- **Neutral framing disarms hard topics.** Couples discussed money/conflict "more easily in the context of a question" — because the *app* raised it, not the partner. Removes "you're the one pushing this."
- **Blind reveal.** Answer independently, reveal together — low-pressure, asynchronous, honest.
- **Streaks help but can backfire.** Diverging streaks signaled "unequal commitment" and created tension. Use shared, forgiving streaks — never a leaderboard between partners.

---

## 3. Design principles (the rules every surface must satisfy)

Derived from §2. Use these as the review rubric for every page.

1. **The relationship is the subject.** Default the language to "you two," "between you," "your relationship." The individual's traits are described *as a partner*, in service of connection.
2. **Insight before effort, always.** Give a real, felt "they get us" moment before asking for any work (Fogg: motivation first; the Paired "visible benefit").
3. **Make the first action tiny.** One 2-minute thing, today. Never a curriculum wall.
4. **Manufacture bids + curiosity.** Every shared feature should create a reason for one partner to reach and the other to want to reach back (the curiosity loop).
5. **The app is the neutral third voice.** It raises the hard topics so neither partner has to be "the one pushing." Coaching never takes sides.
6. **Speak to the attachment need, not the surface complaint.** Externalize "the cycle"; answer A.R.E.
7. **Autonomy over pressure.** Offer choices, celebrate wins, never shame a missed day or a less-engaged partner.
8. **Personalize the voice** to each person's type + attachment (see §4).
9. **Privacy & safety are sacred.** Each partner controls what's shared (the existing consent model); DV screening is always on (E7); never expose one partner's private coaching to the other.
10. **Zero Decoded vocabulary; the on-ramp + its result are the "relationship profile."** Retire "Decoded," "You at a Glance," and "quiz / assessment / test / report" as Relatti-facing terms; "archetype" is never the headline.

---

## 4. The personalization model — *"once we know their type + style we can talk to them better"*

This is the founder's insight, operationalized. Every person in Relatti has two known dimensions after the assessment:

- **Attachment quadrant** (already warm-named): **Anchored** (secure), **The Devoted** (high need for reassurance), **The Independent** (high need for space), **The Guarded Heart** (high on both). Axes = **Need for Reassurance** / **Need for Space**.
- **Personality** (Big Five → archetype): the *register* — how much structure, metaphor, directness, or warmth lands best.

The coach and the copy should **adapt tone per person** (same content, tuned delivery):

| Person's profile | What they need to feel safe enough to engage | Voice the coach/copy should use |
|---|---|---|
| **The Devoted** / high reassurance | "I'm not too much. My partner is *there*." | Lead with warmth + explicit reassurance; name the fear gently; affirm the bid before the work. |
| **The Independent** / high space | "No one's going to engulf me. I stay in control." | Respect autonomy; low-pressure, opt-in; "you decide how much to share"; short, no over-processing. |
| **The Guarded Heart** / both high | "It's safe to want closeness *and* keep some distance." | Slow, safety-first, name the push-pull as normal; tiny steps; never corner them. |
| **Anchored** / secure | Ready for depth + action. | Go straight to the real work; can hold more challenge. |
| Register tuning (Big Five) | — | High openness → metaphor/exploration; high conscientiousness → clear steps/structure; high neuroticism → extra gentleness; low agreeableness → respect their directness. |

> **Build note (revised per founder, 2026-06-26):** the **Big-Five personality voice layer already exists in the coach — keep it; do NOT rebuild it.** The relationship work is to *optionally* add a light **attachment-style tint** on top (reassurance-first / autonomy-respecting / safety-slow), plus a few copy variants on the highest-value surfaces (the relationship-profile opener, the coach's first message, nudges). Treat the attachment tint as a small enhancement to validate — it may be overkill. Either way, knowing each partner's profile remains Relatti's durable edge over Paired/Lasting/Relish — *they don't know who each partner is; we do.*

---

## 5. The journey & per-surface specification

Reviewed in journey order. Each surface: **current → target**, with the principle(s) it must satisfy.

### 5.1 Marketing / landing (`/`, `/couples`, `/engaged`)
- **Current:** relationship-framed, decent.
- **Target:** lead with the *relationship outcome* ("understand each other, fight less, feel closer — in 5 minutes a day"), not the quiz. The quiz is the *on-ramp*, named as a way to *be understood by your partner*, never as a personality test. One clear CTA → `/assess`.
- Principles: 1, 2.

### 5.2 Signup (`LoginPanel.tsx`)
- **Current:** clean, brand-aware; invitee email now pinned. ✅
- **Target:** micro-copy reinforces the dyad ("Create your account — your partner can join after"). Minimal.
- Principles: 3.

### 5.3 The assessment (`AssessmentEngine.tsx`)
- **Current:** welcome ("Discover What Kind of Partner You Are" — keep), then an **"invite someone" viral screen** (now skipped for invitees), then a **"What You'll Explore" personality grid**.
- **Target:**
  - Reframe the items' wrapper as "so your coach understands how you love and connect," not "personality assessment."
  - Replace the "What You'll Explore" personality grid with relationship-outcome framing ("how you bond, how you handle conflict, what you need to feel close").
  - For **organic** (non-invitee) users, the "invite your partner" moment is *good* (it's the dyad job #1) but reframe it from "invite someone to take it too" (viral/share) to "**this works best with the two of you** — bring your partner in" (relatedness, not virality). For **invitees**, already skipped. ✅
  - Progressive insight: show a small "here's something we already see" beat at the end before the full report (insight-before-effort).
- Principles: 1, 2, 4.

### 5.4 ⭐ The first report (`ReportViewer.tsx`, `section-config.ts`, report generator) — **highest priority**
This is the worst offender and the highest emotional-stakes moment.
- **Current:** archetype name + big collectible card as the hero, then **S1 → S2 → S3 → S5 → S8** (three personality sections before the single relationship section).
- **Target — restructure to relationship-first:**
  1. **Open on the relationship, not the archetype.** The hero block becomes *"How you love & connect"* — your attachment pattern in warm, second-person language (Need for Reassurance / Need for Space), and what that means for closeness and conflict. This is the "they get us" moment.
  2. **Then personality *as a partner*.** Reframe S2/S3 as "what you bring to a relationship" + "the protective patterns that show up when you're hurt" — explicitly relational, not "your personality."
  3. **The collectible archetype card stays — but demoted from hero to *shareable artifact*.** It's a great identity anchor + viral loop; place it *after* the relational insight, framed as "your partner-type — share it / invite your partner to find theirs." (Keeps the acquisition loop without making the type the point.)
     - 🔨 **TODO — Relationship Style avatar (founder, June 26, 2026):** create a collectible *Relationship Style* avatar/card for each of the four styles — **The Anchor** (secure), **The Devoted**, **The Independent**, **The Guarded Heart** — exactly as the personality archetype has its illustrated card. This becomes the relationship-native shareable artifact (the hero of the relationship profile + the share/invite loop), so the relationship style — not the personality archetype — is the thing a couple shows off. Parallels the `/api/decoded/card` archetype-card pipeline; will want its own art + a brand-aware card route. Backlog (post the current report slices).
  4. **Close on a *together* growth map**, not a solo roadmap: 1–3 tiny, do-with-your-partner next steps (Fogg-tiny), and the single most important thing to try this week.
  5. **When the partner has joined:** the report gains a "**You two**" layer up top (the shared Blueprint preview) — the relationship becomes literally visible.
  6. ⭐ **Relational interpretation per section (founder, 2026-06-26):** every section carries a **"What This Means for You, Their Partner"** sub-block that translates this person's result — and, once shared, the partner's — into *what it means for the two of you together*. The profile reads as dyad-interpretive, not two solo reports. Governed by consent (type + attachment only); **private coaching is never surfaced.** State the privacy rule plainly in the share UI.
  7. **Rename:** this is the **"relationship profile,"** never "report" / "assessment" / "Decoded."
  - Personalize the opener's voice per §4 (leveraging the *existing* personality voice).
- Principles: 1, 2, 6, 8, 9, 10.

### 5.5 Dashboard home (`RelattiDashboard.tsx`)
- **Current:** good structure (dyad panel / invite-partner / coach / de-escalator). The assessment card reads "Your archetype / your full personality report."
- **Target:** reframe that card to "**How you love & connect**" → links to the (restructured) report. Add the **daily connection ritual** (see §6) as the primary recurring action. Keep the de-escalator. Surface the partner-curiosity loop ("[Partner] answered today — see what they said").
- Principles: 1, 3, 4.

### 5.6 ⭐ The coach (`first-message.ts`, `prompt-assembler.ts`, `dashboard/chat/page.tsx`) — **highest priority**
- **Current:** solo self-improvement coach; first letter is career/personality framed; deep-link says "my Decoded report."
- **Target:**
  - **Rewrite the first message** as a *relationship* coach who has read how *you* love and connect, and is here for *the relationship*. Reference attachment + how it shows up in closeness/conflict (not "finished work"/"leadership"). End with a relational question.
  - **Voice layer per §4** in the prompt-assembler (per-person tone by attachment + Big Five).
  - **Dyad awareness:** when the partner has joined and consented, the coach can hold *both* (it already scopes by engagement) — frame as "I know you both."
  - ⭐ **Solo value (founder, 2026-06-26):** a user whose partner hasn't joined still gets the **full** coach — they're often the one trying to fix the relationship alone, which is a real and important user (one wants to work on it, the other doesn't *yet*). Be a genuine resource for them. Encourage the partner; never gate coaching or shame the gap.
  - **Fix the deep-link copy** ("my Decoded report" → relationship-framed, brand-aware) and the **coaching-question** vocabulary (no Decoded section names).
  - Behaviors grounded in §2: name the cycle (EFT), teach repair + spot the Four Horsemen (Gottman), speak to the attachment need, stay neutral (never take sides).
- Principles: 1, 5, 6, 8, 10.

### 5.7 Shared Blueprint (`/dashboard/blueprint`)
- **Current:** relationship-framed (chemistry/friction/superpower/watch-out) — good direction.
- **Target:** make this the **centerpiece of the joined-couple experience** — the living artifact of "us." Add a clear "do this together" action and a coach hand-off ("talk to your coach about your friction point").
- Principles: 1, 4.

### 5.8 Compatibility (`CompatibilityHub.tsx`)
- **Current:** Decoded compatibility hub (legacy).
- **Target:** fold into the Blueprint / dyad surface; retire the Decoded chrome. (Nav still says "Compatibility" under Relatti — should become "Blueprint.")
- Principles: 1, 10.

### 5.9 Daily connection ritual (NEW — the retention spine)
- **Current:** none (streak table exists; no daily mechanic feeds it).
- **Target:** a **2-minute shared question, default 3×/week (user can switch to daily)** (blind reveal): both answer independently, reveal together, optional coach follow-up. This is the bid-manufacturing, curiosity-loop, neutral-third-voice engine validated in §2.5. Questions personalized by where the couple needs work (from the Blueprint). Mixes lighthearted + meaningful.
- Principles: 2, 3, 4, 5, 7.

### 5.10 Email / SMS (`_shared/resend.ts`, future E6)
- **Current:** brand-aware transactional email; the coaching-email HTML still has a ✦ sparkle (BRAND.md §14 violation, flagged).
- **Target:** the proactive layer (E6) is the **curiosity loop externalized** — "[Partner] just reflected on your relationship — your turn." Tiny, warm, autonomy-respecting (easy opt-down), never nagging. Remove the sparkle.
- Principles: 4, 7, 10.

---

## 6. The retention engine — mapping to what's already built

Relatti's retention thesis (external stake = the partner) maps cleanly onto the science and the existing `engagement` spine + E-features:

| Mechanism (from §2) | Relatti feature | Status |
|---|---|---|
| Both-partners-engaged is mandatory | Dyad spine + invite→claim→link (now fixed) | ✅ plumbing; ⚠️ activation copy in §5.3 |
| Bids / curiosity loop | Daily connection ritual (blind reveal) | 🔨 NEW (§5.9) — the missing spine |
| Frequency > duration | Tiny daily ritual + forgiving shared streak (E8) | 🟡 streak built, ritual missing |
| Externalize the cycle / repair / A.R.E. | Coach voice + de-escalator (E9) | 🟡 de-escalator built; coach brain needs §5.6 |
| Neutral third voice raises hard topics | Ritual questions + coach prompts | 🔨 NEW |
| Proactive bid ("[partner] answered") | SMS + nudges (E6) | 🔨 NEW — founder owes SMS-provider pick |
| Safety | DV screening (E7), consent model | ✅ |

> The single most important *new* build is the **daily connection ritual (§5.9)** — it's what turns Relatti from "a test + a chatbot" into a living shared habit, and it's what feeds every other retention mechanism.

---

## 7. V1 scope & sequencing

Rebuild in journey order of *emotional stakes*, worst offenders first:

1. **The report restructure (§5.4)** — relationship-first ordering + opener; demote the archetype card. *Highest visible impact.*
2. **The coach brain (§5.6)** — relationship first-message, the per-person voice layer (§4), fix the "Decoded" deep-link + coaching-question vocabulary. *Highest emotional stakes.*
3. **Dashboard + assessment copy (§5.3, §5.5)** — reframe the archetype card, the invite-partner moment, the "What You'll Explore" grid.
4. **The daily connection ritual (§5.9)** — the new retention spine. *Biggest new bet; do after 1–3 prove the reframe.*
5. **Blueprint as centerpiece + retire Compatibility chrome (§5.7–5.8).**
6. **Proactive layer (§5.10 / E6)** — gated on the founder's SMS-provider decision.

**Quick, do-regardless leaks** (can land immediately, independent of the larger overhaul): the hardcoded `"my Decoded report"` deep-link string, the ✦ sparkle in `resend.ts`, and the nav "Compatibility"→"Blueprint" label under Relatti.

**Explicitly NOT in V1:** human-coach marketplace, the career/white-label voice layers, gamification beyond a forgiving shared streak, video.

---

## 8. Decisions (resolved by founder, 2026-06-26)

1. **Partner visibility.** Type + attachment style are shareable *with consent* and framed as **helpful for each partner**; **private coaching is NEVER shared — state this explicitly in the UI.** ⭐ **New requirement:** each report/Blueprint section gets a relational sub-block — **"What This Means for You, Their Partner"** — explaining how this person's results *and* their partner's results affect **each other**. The profile becomes *dyad-interpretive*, not two solo reports. (See §5.4.6.)
2. **Archetype card:** keep it; demote out of the hero slot to a later section / shareable artifact. ✅ (as §5.4.3)
3. **Ritual cadence:** default **3×/week**, with an option to switch to **daily** (autonomy — §2.3). (See §5.9.)
4. **Solo / unpartnered users get the FULL product.** Do **not** gate coaching behind the partner joining. Often one partner wants to work on the relationship and the other doesn't *yet* — that person is a real, important user, and Relatti should be a genuine resource for them. Encourage the partner; never withhold value or shame the gap. (See §5.6.)
5. **Voice register:** the **existing personality-based voice layer (Big Five) stays as-is** — it already works in the coach; do **not** rebuild it. *Optionally* add a light **attachment-style tint** on top — but treat it as a small enhancement to validate, possibly overkill, not a big build. (See revised §4.)
6. **Naming:** the on-ramp + its result are the **"relationship profile."** Retire "quiz" / "assessment" / "report" / "Decoded" in all Relatti-facing copy. (Global rule — principle #10.)

---

## 9. Doc map

- **Source of truth for the Relatti *experience* (this doc).** Supersedes the Decoded experience framing for Relatti surfaces only.
- The **engine** specs remain valid: `COACHING_BRAIN.md`, `DECODED_*` (scoring/archetypes/report structure), `BRAND.md`.
- Sits on the **dyad spine** (`RELATIONSHIP_ARCHITECTURE.md`) and the **multi-vertical model** (`PLATFORM_ARCHITECTURE.md`).
- Build tracking will extend `RELATIONSHIP_SPRint.md` / `PLATFORM_SPRINT.md` once scoped.

---

## Sources (research foundation)

- Gottman Method — bids, turning toward, Four Horsemen, repair, Love Maps: [gottman.com](https://www.gottman.com/blog/the-two-gottman-ideas-you-should-be-talking-about/), [empathi.com](https://empathi.com/blog/what-is-the-gottman-four-horsemen/)
- EFT / Sue Johnson — negative cycle, A.R.E., Hold Me Tight: [psychotherapy.net](https://www.psychotherapy.net/perspectives/articles/sue-johnson-on-emotionally-focused-therapy/), [maritalintimacyinst.com (A.R.E.)](https://maritalintimacyinst.com/wp-content/uploads/A-R-E-Assessment.pdf)
- Self-Determination Theory — autonomy/competence/relatedness in behavior change: [urmc.rochester.edu](https://www.urmc.rochester.edu/community-health/patient-care/self-determination-theory), [lumiacoaching.com](https://www.lumiacoaching.com/blog/self-determination-theory-relatedness-autonomy-and-competency)
- Paired mixed-methods evaluation (both-partners engagement, frequency>duration, curiosity loop, neutral framing): [PMC12001865](https://pmc.ncbi.nlm.nih.gov/articles/PMC12001865/)
- Couples-app landscape (Paired/Lasting/Relish mechanics): [connectedcouples.app](https://www.connectedcouples.app/blog/best-couples-apps-2026), [whistleout.com](https://www.whistleout.com/CellPhones/Guides/paired-app-couples-relationship-questions)
