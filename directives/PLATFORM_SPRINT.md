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

#### PC3 — Executive coach stance parity ("the coach coaches, it doesn't lecture")  🟥  *(added 2026-07-13)*
*Goal: bring the validated Relatti understand-first stance to the executive/Decoded coach. Trigger: founder test 2026-07-13 — one message ("I'm hesitating on beta outreach") got a 5-bold-headers / 6-questions framework dump, and the post-processor birthed an OSKAR-assigned challenge from that single exchange. Root cause (per [COACH_ARCHITECTURE_AUDIT.md](COACH_ARCHITECTURE_AUDIT.md)): the good coaching craft was built as a relationship-only exception; the general coach still runs the full executive machine (framework curriculum + intervention menu + 1024 tokens on gpt-4o-mini — the model the Relatti lab already rejected for templated replies) with zero per-turn discipline. Principle: one-question-at-a-time is not relationship coaching, it's coaching — verticals differ in WHAT the coach knows and how fast it moves to action, not in conversational shape. This is pre-work for the audit's Coach Pack Phase 1: the Relatti prompt stack stays byte-identical.*

| Story | Done |
|:--|:--|
| **PC3.1** Executive persona rewrite (`prompt-assembler.ts` L1): understand-first + per-turn discipline (reflect briefly, ONE question, stop; no headings/bold labels/lists/steps; advice only after understanding, with permission, ONE move; exec flavor = help commit to one concrete step once the real issue is clear). | New persona live in the assembler; relationship prompt byte-identical. 🧪 |
| **PC3.2** Frameworks go invisible: Layer 2 renders challenges as *private continuity notes* (no framework names, no steps; stage only informs which single question fits); Layer 3 becomes an internal guide — ONE intervention per reply, never stacked, Catalytic default early. | No framework/process language can reach the user. 🧪 |
| **PC3.3** Model + token parity: executive forces Claude (the Relatti lab finding — gpt-4o-mini is the templated voice) and `max_tokens` 700 (was 1024). | `cost_tracking` shows claude-sonnet for executive replies. |
| **PC3.4** Post-processor calm-down: pass `program` into `postProcess()`; relationship conversations create NO challenges / AI-tool extractions (kills MI/OSKAR-on-grief — partial audit Phase 2); executive challenge creation gated on ≥3 user messages in the conversation. | A first message no longer births a framework challenge; relatti convs create none. 🧪 |
| **PC3.5** Coach-profile scale unification (canonical **0–10**) 🔒: migration (new column defaults ×10; backfill `source in ('default','behavioral')` rows ×10); `profile-updater.ts` clamps [0,10] with ×10 deltas; settings-page bar renders /10. Fixes: (a) default profiles read as ≤3 on every dial → "cold / risk-framed / challenge-first" (the opposite of neutral); (b) the updater's [0,1] clamp would crush a Decoded-seeded dial (warmth 9 → 1) after 5 messages. | Live rows consistent on 0–10; updater can no longer invert a profile. 🧪 |
| **PC3.6** Coach-lab executive battery: `scripts/coach-lab/exec-battery.mjs` (reuses `lib.mjs` + `assertions.mjs`) — scenarios incl. the exact 2026-07-13 test message; hard checks: no lists/headings, ≤1 question, no "you should", concise, no premature advice; Haiku judge rubric; old-vs-new / gpt-4o-mini-vs-Claude A/B mode. | Battery passes on the new prompt and fails on the old (proof, not vibes). 🧪 |
| **PC3.7** Deploy (coach edge fn + migration via Supabase CLI — **founder go required**, it's the live engine) + re-run the 2026-07-13 message against production; anneal docs (audit §8 status, memory). | Live coach answers the test message with one question and no list. |
| **PC3.9** Follow-up integrity (added 2026-07-13, founder test): the extractor never knew today's date, so "I'll ask him tonight" stored `due_date=null` — and `cron-accountability-checkins` only follows up on dated commitments (the coach's "I'll follow up" was unfunded). Fix: inject TODAY (user-timezone) + relative-date resolution rules into the post-processor prompt ("tonight"→today, "tomorrow"→+1; null when no time stated; never invent deadlines); backfilled the founder's live commitment as the end-to-end test. Delivery path confirmed live: 2h cron → `scheduled_messages` → email from coach@mail.masterytv.com per `preferred_channel`. | Dated commitments trigger emailed check-ins; founder received the live follow-up. ✅ SHIPPED 2026-07-13 (coach v83 batch). 🧪 |
| **PC3.8** Earned depth (added 2026-07-14 after the live "what happens in your body?" opener): rapport is ground truth, not inference — new Layer 2.5 `COACHING RELATIONSHIP STAGE` (NEW/DEVELOPING/ESTABLISHED from summaries/messages/trust_level; lightweight stand-in for the dormant COACHING_BRAIN §5 arc) + persona depth-matching rule ("user sets the depth; go half a step deeper, never three; somatic/inner-work questions are never openers — exec, not clinician") + no ask-to-ask/no question-restating tics. Battery: `noSomaticRegister` + `maxTwoQuestions` hard, `maxOneQuestion` soft. | 3× consecutive green battery runs; deployed coach v82 (+ email-inbound v24, telegram-webhook v21, test-guardrails v15). ✅ SHIPPED 2026-07-14. 🧪 |

> Scope guard: no Coach Pack interface yet (audit Phase 1 = PC4); crisis-kernel upgrade (audit Phase 0) unchanged and still priority-tracked elsewhere.
>
> **✅ SHIPPED 2026-07-13 (founder go: "deploy as-is").** Migration applied (default profiles now neutral 5/6/6/…, decoded rows untouched); `coach` v81 + `email-inbound` v23 + `telegram-webhook` v20 + `test-guardrails` v14 deployed (all four bundle the changed `_shared` modules — kernel version skew avoided). Live re-test of the exact founder message in the same conversation (old framework-dump reply in history): ONE question, no lists, `claude-sonnet-4-6`, 53 tokens out; post-processor promoted no challenge (gate held at 2 user msgs < 3).

#### PC4 — Coach Pack seam: per-vertical code isolation  🟥  *(added 2026-07-13 — founder-directed after PC3: "keep the coaching engines separate"; = audit Phase 1 + finish Phase 2/4)*
*Goal: eliminate cross-vertical edit risk at the SOURCE level — one shared kernel (transport, safety/crisis, memory plumbing, prompt-composition engine) + one pack file per vertical; editing `executivePack.ts` physically cannot change the relationship coach. Founder decision 2026-07-13: source-level isolation now; deploy-level split (separate edge functions per vertical over the shared kernel) deferred until the 3rd vertical, because N deployed copies of the SAFETY kernel that can drift is the bigger risk while there are only 2 verticals. Zero behavior change — snapshot-proven.*

| Story | Done |
|:--|:--|
| **PC4.1** ✅ *(shipped 2026-07-14)* Snapshot baseline: `scripts/coach-lab/prompt-snapshot.ts` runs the REAL `assemblePrompt()` against a fake in-process PostgREST serving fixed fixtures (`prompt-fixtures.ts`) — 4 scenarios (executive · relationship-solo · relationship-dyad · relationship-deescalate), goldens committed under `scripts/coach-lab/goldens/`, wired into `npm run gate` + CI (deno step). Coverage guards assert each layer renders + cross-vertical bleed substrings are absent; drift-detection and exit-code verified. Regenerate intentionally with `npm run snapshot:prompts -- --update`. | Gate fails on one byte of cross-vertical prompt drift. ✅ |
| **PC4.2** ✅ *(shipped 2026-07-14, staging `115e329`)* `CoachPack` defined in `_shared/packs/types.ts` (persona, layer recipe, guardrails, tool set, `recentMessageScope`, `forceClaudeOnToolContinuation`; post-processing hooks land with PC4.3); `packs/executive-pack.ts` + `packs/relationship-pack.ts` own their vertical's builders (moved verbatim); shared builders in `_shared/prompt-layers.ts`; `resolvePack()` in `packs/index.ts` is the ONE place `program` is interpreted. `prompt-assembler.ts`/`coach/index.ts` vertical-blind — zero `isRelationship` ternaries. Deployed: coach v85, email-inbound, telegram-webhook, test-guardrails. | Prompts byte-identical to PC4.1 goldens (4/4); no domain ternaries left. ✅ |
| **PC4.3** Pack-owned post-processing: extraction schema + memory taxonomy per pack (relationship = themes/patterns/attachment cues, not business facts) — completes audit Phase 2. | Relationship convs produce relationship-shaped memory. 🧪 |
| **PC4.4** Spine-based pack resolution (audit Phase 4): pack resolved from `engagement.kind`/workspace; client `program` string demoted to a validated hint (extends the P1 `resolveProgram` fix). 🔒 | No silent executive fallback path remains. 🧪 |
| **PC4.5** *(deferred trigger: 3rd vertical lands)* Split deploy units: thin `coach-executive` / `coach-relationship` / `coach-career` entrypoints over the shared kernel + a `deploy-all-coaches` script so kernel/safety changes always fan out together. | Deploying one vertical never redeploys another; kernel versions never skew. |

#### PC5 — Brand-aware Admin (hygiene)  🟦  *(added 2026-07-14, founder-directed)*
*Goal: ONE admin (an operator/platform tool — splitting it would duplicate shared views the same way separate engines would duplicate safety), but with **explicit scope everywhere**: nav grouped Platform vs per-vertical, shared views filterable by brand, vertical-only tools clearly labeled. Today [AdminNav.tsx](../src/app/admin/AdminNav.tsx) is a static list with zero brand awareness — Frameworks (executive-only machinery) renders on relatti.com/admin and Beta Cockpit (Relatti-only) renders on the MasteryTV admin. White-label later reuses this structure: tenant admins = same UI scoped by `workspace_id` via RLS; super-admin spans workspaces.*

| Story | Done |
|:--|:--|
| **PC5.1** ✅ *(shipped 2026-07-14)* Nav grouped **Platform** (Cost Dashboard, Crisis Flags, User Management) / **MasteryTV · Executive** (Frameworks) / **Relatti** (Beta Cockpit) in `AdminNav.tsx`; `.ad-scope` banner kit added to admin.css; Beta Cockpit banner: "Relatti beta program only — MasteryTV has no beta funnel." Verified light+dark in preview. | No admin page leaves its scope ambiguous. ✅ |
| **PC5.2** ✅ *(shipped 2026-07-14 eve)* User Management brand enrollment: per-user **brand chips** + filter (All/Relatti/MasteryTV) + brand-sort header. Durable stamp: `users.signup_brand` (migration `20260714200000`) — password signups carry it in signUp metadata → `handle_new_user` stamps at creation (live-verified with a throwaway user); OAuth/magic-link stamped by `/auth/callback` from the request host, guarded to rows &lt;15 min old so logins never relabel. Pre-stamp accounts: derived via `/api/admin/user-brands` (service-role; participant/decoded_invites/beta_access → relatti) and the chip reads softer + tooltip says "derived". | Can answer "which users are Relatti vs MasteryTV" from the table; brands sortable/hideable. ✅ |
| **PC5.3** ✅ *(shipped 2026-07-14)* Frameworks page self-explanatory: `.ad-explainer` block (post-processor auto-assigns via `assignFramework()` — category → default framework, trust-tier gated; **Active** removes from the pool, **Weight** biases selection), scope banner ("Executive (MasteryTV) engine only — Relatti runs stance-based coaching with no framework library, by design"), + **Engine** column (static "Executive" until PC4.3 domain-scopes `framework_config`). Also fixed a pre-existing ⚠️-emoji brand violation in the error state. | A new operator can read the page and know exactly what toggling/weighting does and which vertical it affects. ✅ |
| **PC5.4** ✅ *(shipped 2026-07-14 eve)* Crisis Flags brand attribution 🔒: `crisis_flags.program` stamped at write time — web coach passes the resolved program into Tier-1 (`runCrisisDetection`) and Tier-2 (`runSafetySweep`); channel-router stamps the sweep but NOT Tier-1 (keyword hard-stop runs before program resolution by design — those rows read "Unattributed" with a tooltip saying why). View gains a brand filter row (All/Relatti/MasteryTV/Unattributed) + Brand chip column; list stays UNIFIED. Zero-flag empty state now explains what appears here and from which verticals. Verified live with marked test rows (deleted after). | Flags attributable + sortable per brand; zero-flag state explains what would appear here and from which verticals. ✅ |
| **PC5.5** ✅ *(shipped 2026-07-14 eve)* Cost Dashboard per-brand breakdown 💵: `metadata.program` now stamped by ALL conversation-path writers — coach, channel-router (already), post-processor, embeddings (`logEmbeddingCost` gained a program param), search-facts. Dashboard: "Spend by Brand — Last 30 Days" (Relatti / MasteryTV / Unattributed / Platform Total; columns sum exactly to the total). Backfill decision: pre-stamp rows stay "unattributed" — cost_tracking has no conversation reference to join through, and guessing would corrupt the columns; ~all real spend predating 2026-07-14 is founder-testing anyway. | Costs read per-brand at a glance and sum to the existing totals. ✅ |

> Sequencing: PC5.1 + PC5.3 are copy/UI-only and can ship immediately; PC5.2/5.4/5.5 add light write-path stamps (each a small, independent change). Pairs naturally with PC4 (packs make "which vertical owns Frameworks" explicit in code; this epic makes it explicit to the operator).

#### PC6 — Commitment dedup/supersede  🟨  *(added 2026-07-14 — extractor created 3 overlapping commitments in ONE conversation, 7/13 19:36–19:40, as the plan evolved turn by turn)*
*Design (approved shape, not yet implemented): the extractor — not a post-hoc dedup job — decides supersession, because "the plan evolved" is a semantic judgment. (1) The post-processor's extraction prompt gets the conversation's existing ACTIVE commitments (id + description); instruction: if the user's new statement revises/replaces one, return `supersedes: <id>` instead of a parallel commitment. (2) Post-processor marks that row `status='superseded'` + `superseded_by=<new id>` (audit trail preserved; needs a migration for the status value + column). (3) Code-level backstop for extractor misses: same conversation + <30 min apart + embedding similarity >0.86 → auto-supersede the older. Accountability/check-in crons treat `superseded` like `completed` (never nag on it).*

| Story | Done |
|:--|:--|
| **PC6.1** Extractor supersede rule + `superseded` status + backstop, per design above. | Replaying the 7/13 19:36–19:40 transcript yields ONE active commitment; check-ins never reference a superseded row. 🧪 |

#### PV1 — New-Vertical Playbook + Experience Discovery (process)  🟦  *(added 2026-06-26)*
*Goal: institutionalize "research the experience FIRST" so every new domain gets a vertical-first flow/assessment/results/coach-voice — not the engine's defaults re-themed. Lesson from Relatti: plumbing is ~80% reusable, the felt experience is ~80% custom (`RELATTI_EXPERIENCE.md`).*
> Seed already written: `directives/VERTICAL_PLAYBOOK.md` (the standard) — adds a mandatory **Phase 0.5 — Experience Discovery** before a vertical's surfaces are built, producing `{VERTICAL}_EXPERIENCE.md`.

| Story | Done |
|:--|:--|
| **PV1.1** Formalize `VERTICAL_PLAYBOOK.md` from seed → standard (templates for `{VERTICAL}_EXPERIENCE.md`, the Gate-0.5 checklist, the reuse-vs-custom budget). | A repeatable SOP any vertical can follow. |
| **PV1.2** Wire Gate 0.5 into the methodology: cross-link from `CLAUDE.md §8` (BMAD phases) + `PLATFORM_ARCHITECTURE.md`; advisory gate "no surface build before `{VERTICAL}_EXPERIENCE.md` is founder-approved." | The gate is discoverable where work starts. |
| **PV1.3** First application — run Phase 0.5 for the **career** vertical *before* building it: produce `CAREER_EXPERIENCE.md` (research job-transition psychology; hero = the job search/deadline; battery = personality + RIASEC). | Career vertical starts from an experience spec, not a re-theme. |

> Not urgent — runs before the *next* vertical, not Relatti. Relatti's own experience overhaul is tracked in `RELATTI_EXPERIENCE.md` (§7 sequencing).

#### PD1 — Decoded-namespace teardown (internal hygiene)  🟦  *(added 2026-06-26)*
*Goal: finish getting everything off the `decoded` namespace. User-facing **URLs are already neutral** (commit dd26445 — PA1.2); this epic is the remaining **code locations**, the **API namespace**, and dead files. No user-facing behavior change — pure organization, so it can wait and should be done as one tested batch (not piecemeal).*
> Why batched, not now: zero user benefit (URLs done), and the API move has real external blast radius (Stripe webhook URL, the OG `/api/decoded/card` image baked into already-shared/cached social links). Better careful than quick.

| Story | Done |
|:--|:--|
| **PD1.1** Relocate the assessment components out of `src/app/decoded/assess/` (`AssessmentEngine`, `CompletedAssessment`, `actions.ts`) to a neutral home; update the `/assess` import; retire the redirected `/decoded/assess` route husk. | No assessment code under `/decoded`. |
| **PD1.2** Rename + relocate `src/app/decoded/DecodedNav.tsx` → a neutral `SiteNav`/`ReportNav` (e.g. `src/components/`); update its 3 importers (report, upgrade-success, CompletedAssessment). | No "DecodedNav" symbol; neutral shared nav. |
| **PD1.3** Neutralize `/api/decoded/*` → `/api/*` (or `/api/assessment/*`), updating every caller. ⚠️ **Keep long-lived aliases/redirects** for `/api/decoded/card` (cached in shared social links) and reconfigure the **Stripe webhook URL** in the Stripe dashboard. 🧪 | Generic API namespace; no broken webhooks/OG images. |
| **PD1.4** Delete dead `src/app/decoded/landing*` variants (folds in PA1.3) + orphaned `DecodedLanding.tsx`; confirm/remove `decoded/admin/backfill-v2` if spent. | `src/app/decoded/` holds only the legacy landing redirect + `/auth/callback` (intentionally kept). |
| **PD1.5** Fix the report OG **image** asset: `/api/decoded/card` still renders "DECODED" on the card art — make it brand-aware (the title/description already are, commit 8fa304a). | The shared card image isn't Decoded-branded on Relatti. |

> All non-urgent, non-user-facing. Sequence after the Relatti experience slices.

---

## 4. Sprint slicing (proposed)

| Sprint | Epics | Outcome |
|:--|:--|:--|
| **Sprint 1** | PA1 → PA5 | **Platform foundation.** One tree; brand resolver; theming; module gating; scoped coach. MasteryTV unchanged. |
| **Sprint 2** | PB1 → PB4 | **Relatti is a real branded vertical** on `relatti.com` — learn, buy-path, share, use, dyad-coached. |
| **Sprint 3** | PC1, PC2, PC3 ✅, PC4, PC5, E7, E10, E6, E8, E9 | Platform: multiple conversations + per-domain data isolation + executive-coach stance parity (PC3, ✅ shipped 2026-07-13/14) + Coach Pack seam (PC4) + brand-aware admin (PC5). Relatti: safety (launch blocker), dual-seat billing, SMS/proactive, retention mechanics → ready for the founding-couples cohort. |

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
