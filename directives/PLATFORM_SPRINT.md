# **Sprint Plan — The Coaching Platform (Multi-Vertical Frontend)**

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** June 22, 2026
> **Status:** 🔄 DRAFT — BMAD Phase 3 (Sprint Planning). **Gate 3 needs founder approval before build.**
> **Parents:** [STRATEGY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/STRATEGY.md) · [PLATFORM_ARCHITECTURE.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/PLATFORM_ARCHITECTURE.md) ✅ **Gate 2 approved (June 22, 2026).**
> **Relatti product epics this interleaves with:** [RELATIONSHIP_SPRINT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/RELATIONSHIP_SPRINT.md) (E5–E13). The Relatti DB spine + dyad coach (E1–E4) are **LIVE**.

---

## 0. How to read this

This sprint turns today's **single-brand, fragmented** app into the **modular platform** from PLATFORM_ARCHITECTURE.md, with **Relatti as the first themed vertical**. Epics are ordered by **dependency**. Each story is **≤ 1 day** with explicit **Done** criteria.

The work splits in two tracks that converge:
- **Track P (Platform groundwork)** — PA epics. Foundation: consolidate, resolve brand, theme, gate modules, scope the coach. Each step **defaults to current behavior** (zero user-visible change) until a second brand exists — so it's low-risk.
- **Track R (Relatti vertical)** — the remaining Relatti product epics (E5–E13), which now sit *on* the platform layer instead of being bolted onto the solo app.

**Legend:** 🟥 blocking dependency · 🧪 has automated test · 🔒 touches RLS/consent/auth · 💵 external cost · 🎨 design-heavy

---

## 1. Critical path (one glance)

```
PA1 Consolidate app tree ─▶ PA2 Host→brand resolver ─▶ PA3 Theme tokens ─▶ PA4 Module registry/gate
                                      │                                            │
                                      └────────────────▶ PA5 Coach program-scope   │
                                                                 │                 │
                                  ┌──────────────────────────────┴─────────────────┘
                                  ▼
                        PB1 Relatti brand+domain ─▶ PB2 Dyad surface (E12) ─▶ PB3 Blueprint (E5)
                                                              │
                                                              ▼
                                                    PB4 Relatti landing/funnels (E11)
                                                              │
        ┌─────────────────────────────────────────────────────┼───────────────────────────┐
        ▼                          ▼                            ▼                           ▼
  E7 Safety/DV 🔒          E10 Dual-seat billing 💵     E6 SMS scheduler 💵        E8 Ritual / E9 De-escalator
  (launch blocker)
```

**Sprint 1 = PA1 → PA5** (the platform foundation). **Sprint 2 = PB1 → PB4** (Relatti on the platform). **Sprint 3 = retention + commerce + safety.**

---

## 2. Environment & setup (do once)

| Item | Action | Done when |
|:--|:--|:--|
| Canonical tree decision | Confirm `/dashboard` is the keeper vs `/coachapp` (PA1 deletes the other). | Founder/dev confirm; one tree chosen. |
| Relatti domain | Point `relatti.com` (+ `staging.relatti.com`?) DNS at the `mastery-tv` Vercel project. | Domain attached, resolves to the app. |
| Brand asset set | Relatti logo, OG image, color/type tokens (BRAND.md-compliant). | Assets in repo; token values defined. |
| Feature-flag convention | Reuse the `RELATTI_DYAD_ENGINE` pattern for per-program/per-surface dark launches. | Convention documented. |
| SMS provider 💵 | (Carried from RELATIONSHIP_SPRINT §2) pick Twilio/Telnyx/MessageBird — blocks E6 only. | Provider + test number + secret. |

---

## 3. Epics → Stories

### Track P — Platform foundation

#### PA1 — Consolidate the app tree  🟥🧹  *(= Relatti epic E13)*
*Goal: one canonical frontend tree to evolve; kill maintenance debt.*

| Story | Done |
|:--|:--|
| **PA1.1** Choose canonical tree (`/dashboard`); inventory what `/coachapp` has that it doesn't. | Diff documented; nothing unique lost. |
| **PA1.2** Migrate any unique `/coachapp` logic into `/dashboard`, then delete `/coachapp`. | App builds; routes intact; duplicate gone. 🧪 |
| **PA1.3** Delete dead landing variants (`decoded/landing-noir*`, unused `decoded/landing`). | Only live landings remain. |

#### PA2 — Host→brand resolver  🟥
*Goal: every request knows its brand; defaults to MasteryTV (no visible change).*

| Story | Done |
|:--|:--|
| **PA2.1** `resolveBrand(host)` + domain→brand map (seeded from `entry_segment.domain`). | Known hosts map to a brand; unknown → default. 🧪 |
| **PA2.2** Wire into `src/middleware.ts` before `updateSession()`; expose via `x-brand` header. | Header present on every request; auth still works. 🧪 |
| **PA2.3** Typed `getBrand()` server helper for layouts/components. | Components can read brand server-side. |

#### PA3 — Theme tokenization  🟥🎨
*Goal: brand = a swappable token set over one design system.*

| Story | Done |
|:--|:--|
| **PA3.1** Extract current `@theme` into a `masterytv` token set; switch via `data-theme` on `<html>` from `getBrand()`. | MasteryTV renders identically to today. |
| **PA3.2** Add a `relatti` token set (BRAND.md-compliant). | `data-theme="relatti"` restyles without component changes. 🎨 |

#### PA4 — Module registry + gating  🟥
*Goal: features toggle by `program.config.modules`, not hardcoded routes.*

| Story | Done |
|:--|:--|
| **PA4.1** Define `program.config.modules` shape + a `getEnabledModules()` helper. | Active program's module set readable. |
| **PA4.2** Gate route + nav rendering for `commitments`/`progress`/`coaching-letter`/`compatibility` on module flags. | MasteryTV = all on (unchanged); a program with them off hides them. 🧪 |
| **PA4.3** Seed module sets: MasteryTV (all) + Relatti (relationship set, the others **off**). | Relatti program shows no commitments/progress/letters. |

#### PA5 — Coach program-scoping  🟥🔒  *(ADR-P02)*
*Goal: coaching context is bounded to the active program/engagement; shared profile still loads.*

| Story | Done |
|:--|:--|
| **PA5.1** Add `programId`/`engagementId` scope to the coach runtime; bound `messages`/`memory_facts`/`commitments`/summaries loading to scope. | Career-context query never returns relationship memory. 🧪🔒 |
| **PA5.2** Keep the shared Decoded profile layer loading regardless of program. | Archetype present across verticals; conversations isolated. 🧪 |

> **PA exit = Sprint 1 done.** Platform foundation in place, MasteryTV behaves exactly as before, Relatti brand/theme/modules ready to light up.

### Track R — Relatti as the first vertical (on the platform)

#### PB1 — Relatti brand + domain wiring
| Story | Done |
|:--|:--|
| **PB1.1** Create the Relatti `program` row + brand config (theme id, domain `relatti.com`, module set, surface id). | `relatti.com` resolves → Relatti brand + program. |

#### PB2 — Relationship dyad surface  🎨🔒  *(= Relatti epic E12)*
*The bespoke primary screen (per ADR-P03) reading the live dyad spine.*
| Story | Done |
|:--|:--|
| **PB2.1** Register `relationship_dyad` surface; resolve the user's active dyad engagement. | Chat header shows the dyad, not just "you". |
| **PB2.2** Dyad-aware chat (post-E4 assembler) + mediator framing in UI. | Coaching reflects both partners. 🔒 |
| **PB2.3** Consent controls (what each shares) — extends invite-consent UI. | User can see/adjust `share_level` in-app. 🔒 |

#### PB3 — Relationship Blueprint productized  *(= Relatti epic E5)*
| Story | Done |
|:--|:--|
| **PB3.1** Read Blueprint from `engagement_artifact` (not invite JSONB) in app + coach. | Both source the artifact. |
| **PB3.2** Reframe content to relationship language; both-partner visibility via engagement RLS. 🔒 | Either partner opens it; non-participants 403. 🧪🔒 |

#### PB4 — Relatti landing + funnels  🎨  *(= Relatti epic E11)*
| Story | Done |
|:--|:--|
| **PB4.1** Rebrand root landing → Relatti positioning, `entry_segment`-driven. | Reads as Relatti, not solo Decoded. |
| **PB4.2** `/couples` + `/engaged` funnel pages from `entry_segment` rows; share/invite CTA wired to the viral loop. | Slugs render tailored copy → same engine. |

> **PB exit = Sprint 2 done.** Relatti is a live, branded vertical on the platform — humans can learn about, sign up, link a partner, and be coached as a couple.

### Track R — retention, commerce, safety (Sprint 3)

These are the remaining Relatti product epics (details in RELATIONSHIP_SPRINT.md), now built on the platform:

| Epic | What | Notes |
|:--|:--|:--|
| **E7** Safety / DV screening 🔒 | Abuse/coercive-control detection → human resources; never mediate. | **Launch blocker** — must ship before public funnels. |
| **E10** Dual-seat billing 💵 | One couple sub, two seats; subscription on the engagement (ARCH §6.4). | First of the three billing topologies. |
| **E6** SMS + proactive scheduler 💵 | The shared dependency, engagement-scoped. | Blocked only by provider pick (§2). |
| **E8** Shared ritual / streak | The partner-as-nudge; visible to both. | |
| **E9** Fight De-Escalator | In-the-moment coach mode. | |

### Track P — platform epics (Sprint 3, shared across all verticals)

Added 2026-06-24. Both are platform-wide (every vertical benefits) and pair naturally — they're "organize the coaching space."

#### PC1 — Multiple conversations  🟥  *(was: one thread per user per domain)*
*Goal: users manage multiple named conversations per thread (like Claude's chat), instead of one timeout-based thread.*
> Foundation exists: `messages.conversation_id` + the 4-hour timeout already create separate conversations; what's missing is naming + a management UI. Layers on the engagement-scoping already shipped (conversations live within a thread).

| Story | Done |
|:--|:--|
| **PC1.1** `conversations` table (`id, user_id, engagement_id, title, created_at, updated_at, archived`); messages FK to it. | Schema + RLS (owner-scoped). |
| **PC1.2** Auto-title from first message; `resolveConversation` becomes explicit (client picks/creates) not timeout-based. | New chats get a name; switching works. |
| **PC1.3** Conversation list UI: New, switch, list within the active brand/thread. | User can run several conversations. |
| **PC1.4** Rename. | Phase 2. |
| **PC1.5** Search + group/archive. | Phase 3. |

#### PC2 — Per-domain data isolation 🟥🔒  *(implements the revised ADR-P02)*
*Goal: scope intake/profile + long-term memory by program, so each domain is its own world (shared identity only). Conversation + short-term-memory scoping already shipped (PA5).*

| Story | Done |
|:--|:--|
| **PC2.1** Add `program_id` to `assessments`/`assessment_reports` (+ scores); reads scoped by program; backfill existing rows to the general program. 🔒 | A domain only sees its own intake/profile. 🧪 |
| **PC2.2** Scope long-term `memory_facts` + `coach_profiles` by program in the prompt-assembler (extends PA5). 🔒 | Coach memory doesn't cross domains. 🧪 |
| **PC2.3** Per-domain intake routing: each program runs its own questionnaire (config-driven). | New domain → its own intake, no reuse. |

> ⚠️ Touches the live coach + assessment data; needs careful backfill (existing rows → general program) so MasteryTV is unaffected.

---

## 4. Sprint slicing (proposed)

| Sprint | Epics | Outcome |
|:--|:--|:--|
| **Sprint 1** | PA1 → PA5 | **Platform foundation.** One tree; brand resolver; theming; module gating; scoped coach. MasteryTV unchanged. |
| **Sprint 2** | PB1 → PB4 | **Relatti is a real branded vertical** on `relatti.com` — learn, buy-path, share, use, dyad-coached. |
| **Sprint 3** | PC1, PC2, E7, E10, E6, E8, E9 | Platform: multiple conversations + per-domain data isolation. Relatti: safety (launch blocker), dual-seat billing, SMS/proactive, retention mechanics → ready for the founding-couples cohort. |

> Public Relatti funnels wait on **E7 (safety)**. GTM choices (entry segments, cohort, pricing) are out of scope here and don't change build order.

---

## 5. Gate 3 checklist (BMAD)

- [x] Epics broken into stories (≤ 1 day each) — §3.
- [x] Stories ordered by dependency — §1 critical path, §4 slices.
- [x] Each story has Done criteria — §3.
- [x] First sprint identified — **Sprint 1 = PA1–PA5 (platform foundation)**.
- [x] Environment setup documented — §2.
- [ ] **Founder approval of this sprint plan (Gate 3).** ← required before build.

> **Decisions owed before build:** (1) confirm `/dashboard` as the canonical tree (PA1); (2) point `relatti.com` DNS at the Vercel project (PB1); (3) SMS provider for E6 (carried). None block starting Sprint 1.
