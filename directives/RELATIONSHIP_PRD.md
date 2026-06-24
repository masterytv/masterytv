# **PRD — Relatti** (Relationship Coaching, Stage 1)

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** June 16, 2026
> **Status:** 🔄 DRAFT — Phase 1. Defaults below marked *(proposed)* pending founder confirmation. **Gate 1 needs explicit approval before Architecture/build.**
> **Parent:** [STRATEGY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/STRATEGY.md)
> **Brand note:** all UI work must comply with [BRAND.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/BRAND.md) (type scale tokens, CSS vars, Lucide icons). Applies at build, not planning.

---

## 1. Vision & Positioning

**Brand:** **Relatti** — `relatti.com` (acquired June 16, 2026). A dedicated consumer brand; the Decoded assessment + Mastery Coach engine runs underneath. *To-do: secure typo variant `relati.com` + run a USPTO/EU trademark check on "Relatti" in coaching/software classes.*

**A relationship coach that knows *both* of you.** Not a quiz, not a journaling app, not couples therapy — an always-on coach grounded in each partner's validated psychology (attachment, emotion regulation, values) that mediates real issues, runs proactive "us" check-ins, and helps in the moment a fight is happening.

**Positioning line (proposed):** *"Stop having the same fight. Start having the last one."*
**The wedge competitors can't copy:** a coach that holds **both** partners' profiles. Calm, BetterUp, Replika, generic ChatGPT — none do dyadic compatibility coaching.

---

## 2. The Retention Thesis (why this product exists *first*)

This product is the **cheapest test of the company's core hypothesis:**

> **Does an external stake (the partner) break the 3-week retention cliff?**

It's a clean natural experiment: same engine, **dyad vs. solo**, measure the retention delta against our known (~0) solo baseline. If dyad retention clears consumer norms, we've validated the thesis *and* have a business. If not, we learned it for a few weeks' build. **This metric gates everything downstream.**

---

## 3. Target Segments & Entry Funnels

Multiple entry pages → one engine. **Stake strength varies by segment** — lead with intact dyads.

| Segment / slug | Dyad intact? | Stake strength | V1? | Notes |
|:--|:--|:--|:--|:--|
| `/couples`, `/married` | ✅ Yes | 🟢 Strong | **V1 (proposed)** | Core retention test |
| `/engaged`, `/premarital` | ✅ Yes | 🟢 Strong | **V1 (proposed)** | High intent, clear trigger (wedding) |
| `/newparents` | ✅ Yes | 🟢 Strong | V2 | Top relationship stressor; expansion of couples |
| `/dating`, `/single` | ❌ Solo | 🟡 Weak | V2 | Solo = weak stake → convert to "invite a partner" or pattern-coaching |
| `/gettingdivorced` | ⚠️ Often adversarial | 🟡 Mixed | V2 | Viable as **co-parenting / conscious-uncoupling** dyad; not adversarial split |

> **Decision (proposed):** V1 = **dyad-intact only** (`/couples` + `/engaged`). Solo & divorce funnels are V2 — they reintroduce the solo-avoidance problem we're trying to escape.

---

## 4. Personas

- **The Initiator** (28–45, often the more relationship-invested partner): wants the relationship to work, willing to spend, drives sign-up, invites the partner. *Primary buyer.*
- **The Invited Partner:** lower initial motivation — **the retention weak link.** Must be hooked fast with low-effort, high-insight value (their own archetype, "how to be understood by you").
- **The Couple (the unit):** the real customer is the **dyad**, billed as one.

---

## 5. Core User Journey

1. **Entry funnel** (`/couples`) → free "What kind of partner are you?" archetype quiz (reuses Decoded + cards).
2. **Share = invite:** result card is built to be sent to the partner → partner takes it → **dyad linked** (reuses invite flow).
3. **Relationship Blueprint:** shared compatibility report (attachment dynamics, conflict patterns, "your loop").
4. **Dyad coach:** chat/SMS coach that knows both profiles, takes a mediator stance.
5. **Proactive "us" check-ins** (SMS): weekly ritual; "your partner just reflected on X."
6. **Fight De-Escalator:** in-the-moment mode (open mid-conflict → regulated next step / "translate this before you send it").

---

## 6. MVP Feature Set

**Reuse (exists):** assessment, archetypes/cards, compatibility/invite linkage, coach engine, memory, voices, guardrails.

**New for V1:**
- [ ] **Dyad engagement model** — promote `decoded_invites` linkage to a persistent `engagement` with 2 `participants` + shared coaching thread *(Architecture phase)*
- [ ] **Dyad-aware coach** — `prompt-assembler.ts` layer injecting both profiles + mediator framing
- [ ] **Relationship Blueprint** — reframed compatibility output (content/prompt work)
- [ ] **SMS channel + proactive scheduler** — *shared dependency, build against `engagement`*
- [ ] **Fight De-Escalator** coach mode
- [ ] **Shared ritual / streak** visible to both partners (the partner-as-nudge)
- [ ] **Consent layer** — what each partner shares vs. keeps private (extends existing invite consent)
- [ ] **Dual-seat billing** — one couple subscription, two seats (Stripe)
- [ ] **`workspace_id` on all new tables** *(per STRATEGY.md mandate)*

---

## 7. Retention Design (the whole point)

- **The partner is the stake:** when one drifts, the other pulls them back. Retention becomes social, not solo.
- **Shared streaks & rituals:** logging off feels like letting *them* down.
- **Proactive, gentle openings:** the coach reaches toward the couple so neither faces a blank box (lowers the cost of facing hard things).
- **Visible "us" progress over time:** "3 weeks ago you both flagged the same fight; this week neither did." (The thing free ChatGPT can't do.)

---

## 8. Pricing & Grand-Slam Offer *(proposed)*

- **Price:** **$199 / year per couple** (one shared sub, two seats) or **$24/mo**. Pro tier **$349/yr** (live-conflict support, quarterly deep-dives). Anchored *far below* couples therapy ($150–250/session).
- **Grand-slam offer:** **"Feel closer in 30 days — or it's free."** Value stack: dual Decoded + Relationship Blueprint + dyad coach + weekly "us" check-ins + Fight De-Escalator + monthly "State of the Union." Full refund within 30 days, *keep the Blueprint.*
- **Scarcity:** "Founding couples — price locked for life," capped cohort.
- **Refund risk is structurally low:** two engaged people rarely both bail in 30 days.

---

## 9. Marketing & Acquisition

- **Built-in viral loop:** the archetype quiz + shareable card **is** the partner invite — the share mechanic is the acquisition mechanic. Reuses what exists.
- **Channels:** relationship creators on TikTok/IG (where this content already goes viral), Reddit (r/relationships, r/marriage), premarital/wedding ecosystems.
- **Multi-funnel:** each entry slug gets tailored copy → same engine (per `entry_segment` model).

---

## 10. Safety & Ethics (duty of care)

- **Abuse / DV screening:** relationship coaching carries real risk. Must detect disclosures of abuse/coercive control and route to appropriate human resources — never "mediate" an abusive dynamic. Extends existing crisis guardrails.
- **Scope boundaries:** coaching, not couples therapy / not clinical. Clear disclaimers.
- **Consent & privacy:** neither partner sees the other's private reflections unless explicitly shared.

---

## 11. Success Metrics

| Metric | Target | Why |
|:--|:--|:--|
| **Dyad 30-day retention vs. solo baseline** | Materially > current ~0 | **THE gate. The whole thesis.** |
| Activation: both partners assessed | ≥ 60% of started dyads | Tests the invited-partner weak link |
| Founding-couple → paid conversion | TBD on cohort | WTP validation |
| Week-4 "us" check-in completion | TBD | Ritual stickiness |

---

## 12. MVP Scope — Explicitly NOT in V1

- ❌ White-label / multi-tenant UI (architecture *prepared*, not built)
- ❌ Career-transition product
- ❌ Solo & divorce funnels (V2)
- ❌ Native mobile app (web + SMS only)
- ❌ Human-coach marketplace / group / family
- ❌ Complex tiering (one couple plan + one Pro)

---

## 13. Open Questions (founder)

1. ✅ **Brand/domain decided:** Relatti / `relatti.com`.
2. Confirm V1 = `/couples` + `/engaged`, dyad-only.
3. Run a **closed founding-couples cohort** (e.g., 50 couples) before public funnels? *(Recommend yes.)*
4. Comfortable with the dual-seat $199/couple/yr + 30-day-guarantee offer as the first test?

---

## 14. Next Steps

1. **Founder reviews & approves this PRD (Gate 1).**
2. → `RELATIONSHIP_ARCHITECTURE.md`: formal schema for `workspace` / `engagement` / `participant` / `accountability_link` / `entry_segment`, mapped onto current `decoded_invites`.
3. → `RELATIONSHIP_SPRINT.md`: ordered build, starting with the SMS/proactive shared dependency + dyad engagement model.
