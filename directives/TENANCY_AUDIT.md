# Is this actually multi-tenant? — the brand-3 audit

> **Status:** ✅ BUILT 2026-07-16 (same day) — the founder overrode §0's defer recommendation: *"we need to fix everything before we continue any more testing or users."* Shipped: **T0** (`check:tenancy` — every table categorized, unscoped user_id reads of program-scoped tables fail CI), **T1** (`ProgramId` union, twin in `_shared/packs/index.ts`), **T2** (packs/modules/batteries → exhaustive Records; `normalizeProgram` throws on an unregistered program), **T3** (`check:ternaries`, ban-set derived from the unions; 16-ternary sweep via new `byBrand()`; sole allowlist entry = layout.tsx's inline script), **T4** (`_shared/brands.ts` EDGE_BRANDS + `brandForProgram`), **T5** (`surfaceId` KILLED — zero consumers; byBrand at DashboardLayoutClient is the exhaustive selection), **T6** (claim corrected in PLATFORM_ARCHITECTURE — `program.config` is future white-label config, NOT load-bearing; typed registries are), **T7/PC2.2** (program on memory_facts / coach_profiles / coach_profile_history + scoped reads + per-program match_memory_facts). Bonus find: `assessment_profiles` upsert had NO backing unique index — it had 42P10-errored on every report ever generated (0 rows); now onConflict assessment_id.
> Original verdict + evidence below, kept for the why.
> **Verdict: yes, you'd be here again — and the reason is one sentence long (§3).**

---

## 0. ⛔ Read this before acting on §4 — the correction

**T1–T2 would not have prevented a single bug that actually bit this project.** They are a *different class*, and the first draft of this doc blurred them:

| | The class that has bitten you **three times** | The class T1–T2 fixes |
|---|---|---|
| **What** | conversations (2026-07-15), assessments + reports (2026-07-16), invites (open) | career gets the executive persona / Core battery / MasteryTV email |
| **Cause** | **missing tenancy columns + unscoped reads** on *existing* brands | **ternaries defaulting an unknown program to the incumbent** |
| **Who it hurts** | dual-brand users **today** | **brand 3, on the day it ships** |
| **Fixed by** | a column + `.eq("program", …)` on every read — §4 **T7**, plus a *tenancy gate* that doesn't exist yet (§4.1) | T1–T2 |

So "do the architecture first" **does not stop you finding the next unscoped table.** T1–T2 buys insurance for a vertical that doesn't exist yet.

**Why defer:**
1. **It doesn't get more expensive.** The seams are concentrated and the ternary count grows slowly. T1+T2 is ~a day today and ~a day in three months.
2. **It's insurance on a vertical gated by something else.** Career is Stage 2, gated on beta CSI-delta proof that doesn't exist. If the beta fails, this work is never needed.
3. **The bottleneck is elsewhere.** signup→assessment ~3/5; **assessment→partner-invite 0/3**. Brand 1's dyad ask is unsolved.

**The one exception worth taking early: T3** (`check-brand-ternaries`, ~2h). It stops the count *growing* — the author of this audit added a ternary the same day (§5). Everything else waits.

**Trigger to revisit:** when career is actually scheduled — do T1+T2 *before* the first career line of code, not after.

### 0.1 The gap this audit originally missed

Nothing in T1–T7 systematically prevents the class that keeps biting. What would:

- **A tenancy gate** — the twin of `check:colors`, which already proves the pattern works. Assert that (a) every user-data table carries `program` or is on an explicit reviewed allowlist, and (b) no `.from("<tenant table>")` read filters by `user_id` alone. That's the mechanism that turns "the founder notices" into "CI notices". **It does not exist, and it's the highest-leverage item in this document.** Call it **T0**.
- **T7 / PC2.2** — finish the columns that are still missing (`memory_facts`, `coach_profiles`).

## 1. The answer

**It is neither "multi-tenant" nor "bolted on."** It's a **well-architected config spine with a case-by-case presentation layer nailed to the front of it.**

The good half is genuinely good: a polymorphic DB spine, token theming that needs no component edits, three build gates that **derive** their brand list (so brand 3 is auto-covered), and **11 exhaustive `Record<BrandId,…>` registries** that break the typecheck in 11 places the moment you add a brand — an accurate, self-maintaining checklist.

The bad half is the one that bites:

> **Brand-keyed code fails LOUDLY. Program-keyed code fails SILENTLY. And a new vertical arrives through the *program* door.**

`BrandId` is a union type → `Record<BrandId, …>` is exhaustive → adding `"career"` is 11 compiler errors.
`programSlug` is a bare `string` → every consumer is a ternary or a `?? default` → adding a career program is **0 compiler errors and ~38 silently wrong answers.**

## 2. Evidence

### 2.1 The database — 26 of 41 user-data tables have no tenancy at all

| Columns present | Tables |
|---|---|
| `workspace_id` + `program` + `engagement_id` | **1** — `conversations` (fixed 2026-07-15, after a founder bug report) |
| `program` only | **3** — `assessments`, `assessment_reports` (both 2026-07-16, after a founder bug report), `crisis_flags` |
| `workspace_id` only (the E1 spine) | ~11 — `engagement`, `participant`, `program`, `ritual_*`, `feedback`, `beta_surveys`… |
| 🔴 **NEITHER** | **26** — `messages`, `memory_facts`, `coach_profiles`, `coach_profile_history`, `assessment_scores`, `commitments`, `coaching_agenda`, `cost_tracking`, `onboarding_state`, `user_entities`, `share_unlocks`… |

**The pattern is the finding.** Every table that has `program` got it *reactively, after a founder-reported bug*, one at a time: conversations (7/15, cross-brand chat bleed) → assessments + reports (7/16, this session). ORIENT's rule — *"every new table includes `workspace_id`"* — is honored only by tables created during the Relatti spine work. The whole pre-detour engine predates it and was never retrofitted.

**`memory_facts` and `coach_profiles` have no program.** That's PC2.2, specced 2026-06-24, still unbuilt: **a career user's coach memory would mix with their relationship coaching.** Known, tracked, not done.

### 2.2 The code — 38 silent-wrong ternaries across ~39 files

Adding a brand today: **~39 files, 11 typed registries (loud) + 4 untyped program-keyed maps (silent), and 38 binary ternaries that answer "MasteryTV" for anything they don't recognise.**

Top 5 that would break brand 3, all silently:

1. **The coach itself** — `packs/index.ts:23` is labeled "Coach Pack **registry**" but is `=== "relationship" ? relationshipPack : executivePack`. A career user gets the **executive persona and guardrails**. And the `programScope()` I added today (`:44`) has the same shape, so it reads the **wrong data** too — the two agree with each other, which is exactly what my own docstring demanded, and they'd be wrong *together*.
2. **Module leakage** — `modules.ts:82` `PROGRAM_MODULES[slug] ?? PROGRAM_MODULES.general` silently grants a career brand `commitments`, `progress`, `coaching_letters`, `coach_voices`, `compatibility`. This is the exact cross-brand-isolation class already shipped once — pre-armed for brand 3.
3. **All proactive email** — 6 edge ternaries (`cron-morning-briefings:137`, `cron-accountability-checkins:189,318`, `cron-process-scheduled:110`, `email-inbound:178`, `channel-delivery:192`) collapse program→brand as `=== "relationship" ? "relatti" : "masterytv"`. Career users get **MasteryTV-branded 8am briefings from masterytv.com**, off-platform where no gate can see it.
4. **The inline head script** — `layout.tsx:95-97` hardcodes `'relatti'|'masterytv'` as **string literals inside a template literal**. TypeScript cannot see it. Already silently killed brand+theme+favicon for 10 days once.
5. **The battery** — `batteries.ts:49` ternary → career candidates get the 66-item Core battery.

### 2.3 The 5-layer model — 1 of 5 delivered as claimed

| Layer | Reality |
|---|---|
| **Theme** | ✅ Delivered, + two derived gates |
| **Modules** | 🟡 Registry exists (best-designed piece) but sourced from a code map, not `program.config` |
| **Workspace** | 🟡 Table live; both brands hardcode `workspaceSlug: "masterytv"`. Untested. |
| **Program** | 🔴 **`program.config` exists in the DB and is never read.** The doc says it carries `battery` + `coach_persona_layer`; the code uses ternaries instead. The column that would make this config-driven is ignored. |
| **Surface** | 🔴 **Doesn't exist.** `brand.ts:31` declares `surfaceId`, sets it at `:43,:52` — **zero consumers**. Surface selection is `brand.id === "relatti" ? … : …` at `DashboardLayoutClient.tsx:129`. |

### 2.4 The gates protect the layer that was already safe

`check:colors`, `check:brand-tokens`, `check:metadata` all **derive** their brand list — brand 3 is auto-covered. Genuinely excellent. But they guard **tokens and metadata**, which were never the problem. **There is no `check-brand-ternaries`.** The 38 ternaries are invisible to CI.

### 2.5 VERTICAL_PLAYBOOK is not the problem — it's the compensation

§5's 46 checkboxes are **accurate**. Every registry found by grep has a checkbox. Its own meta-rule states this audit's thesis:

> *"the engine defaults to the EXISTING verticals everywhere… anything you skip doesn't break, it silently behaves like MasteryTV or Relatti."*

**It is a 46-item manual compensation for a missing type.** Institutional memory doing a type system's job — which works exactly as long as a human reads all 46 items, every time, forever.

## 3. Root cause, in one sentence

> **`BrandId` is a union type; `programSlug` is a bare `string`.**

Everything above follows. The team already knows how to do this right — `Record<BrandId, …>` is used 11 times and works. The same discipline was never applied to `program`, and `program` is the axis a new vertical actually arrives on.

## 4. What to do (proposed — needs founder approval)

> ⛔ **Read §0 first.** Recommendation is to **defer T1–T7** (T3 optionally early) and add **T0**, which this list originally missed. The table below is the menu, not the plan.

Ordered by leverage. **This is not a rewrite.** The seams are concentrated because the team kept them concentrated.

| **T0** 🔑 | **A tenancy gate** (the twin of `check:colors`): every user-data table carries `program` or is on a reviewed allowlist; no read of a tenant table filters by `user_id` alone. | **The only item that stops the class that has actually bitten you 3×.** Turns "the founder notices" into "CI notices". Missing from the original list. |

| # | Change | Effect |
|---|---|---|
| **T1** | `type ProgramId = 'general' \| 'relationship'` (mirror `BrandId`, `brand.ts:19`). Give `programSlug` that type. | The compiler starts seeing the program axis at all. |
| **T2** | Convert the 4 program-keyed maps to `Record<ProgramId, …>` **with an explicit throw on unknown**: `packs/index.ts:23,44` (the coach — highest severity), `modules.ts:82`, `batteries.ts:49`. | **~15 compiler errors instead of 46 checklist items.** Silent-wrong → build failure. |
| **T3** | `check-brand-ternaries.mjs` — fail CI on `=== 'relationship' ?` / `=== 'relatti' ?` in shared code, mirroring how `check:colors` derives its ban-set. Allowlist genuine two-brand copy. | The 38 stop multiplying. Catches `layout.tsx`'s template literal, which no typecheck can. |
| **T4** | Collapse the 6 edge program→brand ternaries into one shared `brandForProgram(program)` in `_shared/`. | One place, testable, no more MasteryTV emails to brand 3. |
| **T5** | Kill `surfaceId` or build the registry it promises. A declared field with zero consumers is a lie in the architecture doc. | Doc matches code. |
| **T6** | Make `program.config` load-bearing (battery + persona from the row, per PLATFORM_ARCHITECTURE §3) — **or** delete the claim. Today it's a DB column the code ignores. | Verticals-as-config becomes true, or stops being claimed. |
| **T7** | PC2.2 (`memory_facts`/`coach_profiles` program scoping) — already specced, still unbuilt. | Coach memory stops crossing verticals. |

**T1+T2 are the 80%** and are roughly a day. They convert the playbook from a memory test into a build error.

## 5. Honest caveat about this session

Three of the four `program` columns in the DB were added **reactively, after a founder noticed something wrong** — two of them by me, today. I also added `programScope()` in exactly the ternary shape this audit indicts (§2.2 item 1). It was the right local call (it mirrors `resolvePack`, and disagreeing with it would be worse) and the wrong global one. **T2 fixes both together, which is the point: they must keep agreeing — as a `Record<ProgramId,…>`, not as twin ternaries.**
