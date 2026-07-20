# **Strategy Direction — Coaching Platform Pivot**

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** June 16, 2026
> **Status:** 🟢 Direction committed — entering Phase 1 (PRD) for Relationship Coaching
> **Stage 1 brand:** **Relatti** (`relatti.com`) — acquired June 16, 2026
> **Supersedes:** the standalone "Mastery Coach + Decoded" B2C consumer framing for go-to-market purposes. The *engine* (Decoded assessment + Mastery Coach) is retained and repurposed.
> **Methodology:** BMAD + Antigravity Method. This doc is the Phase 0 (Discovery) artifact for the pivot; it consolidates a 6-model deep-research study + internal synthesis.
>
> **⭐ AMENDMENT (founder decision, 2026-07-17):** **Stage 2 is now Money-Psychology coaching (mechanic: MoneyTraits™), and career is DEFERRED.** New order: Relationship → **Money** → Career → White-Label. Rationale + full discovery: [MONEY_DISCOVERY.md](MONEY_DISCOVERY.md); experience spec: [MONEY_EXPERIENCE.md](MONEY_EXPERIENCE.md); build brief: [MONEY_BUILD_HANDOFF.md](MONEY_BUILD_HANDOFF.md). The §1 sequence table below is updated. **Everything else in this doc — the external-stake retention *mechanism* (§2) and the polymorphic spine (§3) — is unchanged and still governs; money rides the same engine.** (Money's external stake = the user's goal/decision + a defined "enough" number; for entrepreneurs specifically, the psychological *edge* with money.)

---

## 1. The Decision (founder's words)

> "White label is the best exit, but most expensive to build. The relationship angle is the easiest to start with. New strategy: **make the DB architecture adaptable** so the same engine flexes from **Relationship Coaching** → **Career Transition Coaching** → **White-Label Platform**, each with multiple marketing entry pages on its own domain. Start by planning the Relationship Coaching product."

**Committed sequence:**

> *(Table updated by the 2026-07-17 amendment above.)*

| Stage | Product | Domain pattern | External stake (retention engine) | Build cost on current stack | Role |
|:--|:--|:--|:--|:--|:--|
| **1 — LIVE** | Relationship Coaching (**Relatti**) | `relatti.com/{couples,engaged,married,…}` | **The partner** | Light–Moderate (compatibility/dyad plumbing already exists) | Beachhead + retention-thesis test (live) |
| **2 — NOW** | Money-Psychology Coaching (**MoneyTraits™**) | `moneytraits.com` (decided 2026-07-20; ex-moneymaps.masterytv.com stays as a 301 alias) | **The goal/decision + a defined "enough"** (for founders: the psychological *edge*) | Moderate (mostly reuse; new = instrument + reveal + Decision Room) | Founder-audience beachhead; chronic, high-retention demand |
| **3 — Deferred** | Career Transition Coaching | `mycareercoach.com/{laidoff,downsized,…}` | **The deadline / job search** | Moderate (cohort grouping + aggregate dashboards) | Build-to-sellable B2B revenue (deferred 2026-07-17 — episodic demand; see MONEY_DISCOVERY.md §4) |
| **4 — Exit** | White-Label Platform | `growyourcoachingbusiness.com` | **The human coach** | Heavy (full multi-tenancy) | Sellable/acquirable asset |

---

## 2. The Core Insight (why this works)

Across six independent deep-research models (Opus 4.8, GPT-5.2, Arena, Gemini, Perplexity, Grok), the strongest signal was not a market — it was a **mechanism**:

> **Coaching products die at the ~3-week cliff because solo self-improvement has no external stake. The fix is to attach the product to a stake the user cannot quietly ghost.** Proactive push, voice, memory, and privacy are *table stakes*, not the wedge.

Each stage of our roadmap is defined by a **different external stake** — partner → deadline → human coach. This is deliberate: the retention engine is built into the product structure, not bolted on as notifications.

**Corollaries (high consensus):**
- The 110-item assessment is a **conversion tax, not a moat** → shorten / use progressive profiling; keep depth where it's decision-relevant (attachment for relationships, RIASEC for careers).
- The real moat = **longitudinal data + memory + trust + the dyadic compatibility engine** (which no competitor has).
- Privacy-first is a **trust tie-breaker**, not a primary purchase driver (except institutional buyers).
- **Killed:** broad B2C "self-improvement," founder/achiever coaching (worst retention — no stake), and agent-to-agent (real infra trend, wrong frame as "coaching," wrong DNA, ~zero market today — revisit in 18–36 months as optionality only).
- **Market-size numbers in the research are unreliable** (definitions vary 5–10×). Decisions here rest on the mechanism + buildability, not TAM figures.

---

## 3. The Adaptable Architecture Principle (the technical mandate)

The whole strategy hinges on **one polymorphic data spine** that serves all three products. Design it now, default it to the simple case, and each later stage becomes config + content rather than a migration.

**The spine — five concepts:**

1. **`workspace` (tenant)** — top-level isolation. Add `workspace_id` to every user-data table *now*, defaulting to a single "MasteryTV" workspace. B2C ignores it; white-label (Stage 3) turns it on with near-zero migration. *This is the cheap-now / expensive-later decision.*
2. **`program`** — `relationship | career | white_label_vertical`. Selects which assessment battery, coach persona/prompt layer, funnel, and content a user sees.
3. **`engagement`** — the **container the user is coached within**, belonging to a program. Polymorphic by participant count + stakeholder:
   - Relationship → **2 participants** (the dyad)
   - Career → **1 participant** + optional `cohort_id` (employer)
   - White-label → **1 participant** + `coach_id` (the human)
4. **`participant`** — links accounts to an engagement with a role (`self | partner | coachee`). Coaching context (memory, commitments, messages) hangs off the **engagement**, not just the user — so the coach can hold a dyad or a cohort.
5. **`accountability_link`** — the **external stake, modeled as first-class data**: `partner | cohort/employer | human_coach | deadline`. This is the retention mechanism made queryable, and the one thing that varies cleanly across all three products.

**Plus `entry_segment` (funnels):** maps a marketing slug (`/married`, `/laidoff`) → a program + coach framing + content. Multiple entry pages and domains become **data-driven**, not hardcoded pages.

**Seed already exists:** `decoded_invites` + the compatibility view already model two linked, consenting users — that is the embryo of `engagement` + `participant` for the relationship dyad. We are *promoting an existing concept*, not inventing from scratch.

> **Architecture rule for every new table from today forward:** include `workspace_id` and, where relevant, attach to an `engagement` rather than directly to a `user`. This keeps all three stages open at near-zero present cost.

---

## 4. What We Reuse vs. What's New

| Asset | Status | Notes |
|:--|:--|:--|
| Decoded assessment + scoring + report | ✅ Reuse | ECR-R attachment battery is *native* to relationships |
| 16 archetypes + shareable cards | ✅ Reuse | Becomes the viral **partner-invite** acquisition loop |
| Compatibility / `decoded_invites` (2-user, consent) | ✅ Reuse → promote to `engagement`/`participant` | The crown jewel; no competitor has it |
| Mastery Coach Edge Function + memory + voices + guardrails | ✅ Reuse | Needs a dyad-aware prompt layer in `prompt-assembler.ts` |
| Crisis detection / safety | ✅ Reuse + extend | Add relationship-abuse screening + escalation (duty of care) |
| **`workspace_id` on all tables** | 🔨 New (cheap now) | Multi-tenancy seed for Stage 3 |
| **`engagement` / `participant` / `accountability_link`** | 🔨 New (moderate) | The polymorphic spine |
| **SMS + proactive scheduler** | 🔨 New (Sprint 4/5, unbuilt) | **Shared dependency across all 3 stages** — build once |
| Billing (Stripe live) | 🔨 New | Dual-seat couple subscription first |

---

## 5. The Shared Dependency

**SMS + proactive outreach (current Sprint 4/5, unbuilt) is required by every stage.** It is the highest-leverage infrastructure investment regardless of product. Build it once, against the `engagement` model, and it serves relationship → career → white-label.

---

## 6. Phase / Gate Status (BMAD)

- ✅ **Phase 0 — Discovery:** complete (6-model study + synthesis, captured here).
- 🔄 **Phase 1 — PRD:** in progress → see [RELATIONSHIP_PRD.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/RELATIONSHIP_PRD.md). **Gate 1 requires founder approval before Architecture.**
- ✅ **Phase 2 — Architecture:** approved June 16, 2026 — polymorphic spine in [RELATIONSHIP_ARCHITECTURE.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/RELATIONSHIP_ARCHITECTURE.md) (Gate 2 cleared, D1–D6 + ADRs R01–R04).
- 🔄 **Phase 3 — Sprint:** DRAFT — ordered build in [RELATIONSHIP_SPRINT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/RELATIONSHIP_SPRINT.md). **Gate 3 requires founder approval before build.** Sprint 1 = spine DDL → backfill → dual-write → dyad-coach cutover.

---

## 7. Open Strategic Questions (pending founder input)

1. ✅ **Brand: DECIDED** — **Relatti** (`relatti.com`, acquired June 16, 2026): a dedicated consumer brand separate from MasteryTV/Decoded, shared engine underneath.
2. **V1 entry segments:** which 2–3 launch first? *(Recommend: dyadic-first — `/couples` + `/engaged` or `/married`; defer solo funnels.)*
3. **Dyad-only vs. solo in V1:** *(Recommend: dyad-only, to cleanly test the retention thesis. Solo dilutes the experiment.)*
4. **Validation gate:** closed founding-couples cohort before public funnels? *(Recommend: yes.)*

---

## 8. Doc Map — How to Read the Existing `directives/` Docs

The repo predates this detour. Treat the existing docs as follows (each superseded doc also carries a banner at its top pointing back here):

**🟢 Current (source of truth):**
- `STRATEGY.md` (this doc), `RELATIONSHIP_PRD.md`, `RELATIONSHIP_ARCHITECTURE.md` (Phase 2 ✅ approved — the DB spine, LIVE), `RELATIONSHIP_SPRINT.md` (Phase 3 draft, awaiting Gate 3)
- `PLATFORM_ARCHITECTURE.md` (Phase 2 ✅ approved June 22, 2026) — the **multi-vertical frontend + identity** layer on top of the spine: one modular app → many domains, verticals-as-config (5-layer model: workspace · program · surface · module · theme). Read this for how Relatti/career/white-label/future sites are built from one codebase. Build sequenced in `PLATFORM_SPRINT.md` (Phase 3 draft, awaiting Gate 3).

**✅ Reusable engine reference (still valid — the engine is retained):**
- `COACHING_BRAIN.md`, `COACHING_GUARDRAILS.md`
- `DECODED_SCHEMA.md`, `DECODED_SCORING.md`, `DECODED_ARCHETYPES.md`, `DECODED_REPORT_STRUCTURE.md`, `DECODED_CARD_DESIGN_SPEC.md`
- `BRAND.md` (design system — Relatti layers its own brand on top)
- `ARCHITECTURE.md` — **engine/tech-stack sections only**; its product framing is superseded

**⛔ Superseded / ON HOLD (pre-detour B2C direction — NOT the current plan; paused, not deleted):**
Moved to **`directives/archive/`** on 2026-06-29 to keep the working set lean (see `archive/README.md`):
- `archive/SPRINT.md`, `archive/PRD.md`, `archive/DISCOVERY.md`, `archive/MARKETING.md`
- `archive/DECODED_PRD.md`, `archive/DECODED_FEATURES.md`, `archive/DECODED_INDEX.md`, `archive/DECODED_NARRATIVE_VOICES_*`
- `archive/COMPETITIVE_ANALYSIS_DP_REPORT.md`

> **New-session entry point:** [`ORIENT.md`](ORIENT.md) is the single-file briefing + router. Read it first; it points here for strategy depth.
