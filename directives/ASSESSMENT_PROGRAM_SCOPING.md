# PC2.1 — Program-scoping the assessment spine

> **Status:** 🟢 **a–g BUILT + verified 2026-07-16** (founder approved: "proceed… don't backfill the assessment for tom on Relatti, but give that account the ability to take the new assessment"). **PC2.1h (invite surfaces) DEFERRED — see §6.**
> **Acceptance PASSED:** `tom@masterytv.com` on relatti.com `/assess` → **HTTP 200, 3-instrument relationship battery ("8–12" min)**; on masterytv.com → still 307 → /dashboard (he has a general one). His 5 Decoded assessments untouched. Gate green (274 tests), executive prompt byte-identical.
> **Epic:** [PLATFORM_SPRINT.md](PLATFORM_SPRINT.md) → Track P → **PC2.1** (specced 2026-06-24, never built).
> **Implements:** ADR-P02 (per-domain data isolation). The *conversation* half shipped 2026-07-15 (`conversations.program`, migration `20260715120000`). This is the assessment half.
> **Written:** 2026-07-16, after the founder asked "shouldn't tom@masterytv.com have two assessments and two reports?"

---

## 1. The finding (evidence, not theory)

**The founder's hypothesis is right as a requirement and false as reality.** `tom@masterytv.com` has **5 assessments, every one a full Decoded battery** (all carry `riasec` + `weims`). There is no Relatti assessment — including the 2026-07-13 one, taken 11 days *after* relatti.com went live.

The battery selector is **not** the problem. `/assess` does `getBattery(brand.programSlug)` → relatti.com correctly resolves the 3-instrument `RELATIONSHIP_BATTERY` (`IPIP50, ECR_R_SHORT, CSI4`). The problem is he can never reach it.

| # | Fact | Evidence |
|---|---|---|
| 1 | **No assessment table records its program.** `assessments`, `assessment_reports`, `assessment_scores`, `assessment_progress`, `assessment_profiles` — zero scoping columns. `conversations` has all three (`workspace_id, engagement_id, program`). | `information_schema` |
| 2 | **Not one of 37 read sites is brand-scoped.** | `grep` over `src/` |
| 3 | **A completed assessment in ANY program bounces you out of `/assess`.** No program filter → redirect `/dashboard`. This is why Tom has no Relatti assessment. | `src/app/assess/page.tsx:72` |
| 4 | 🔴 **Finishing an assessment supersedes every other completed assessment the user has, across all programs.** | `src/app/decoded/assess/AssessmentEngine.tsx:399` |
| 5 | **The coach loads the latest assessment across brands**, ignoring `program` (which is already in scope one line up). | `supabase/functions/_shared/prompt-assembler.ts:85` |
| 6 | `isRelationshipReport` infers program from instruments (`!riasec && !weims`) — **a heuristic standing in for the missing column**, duplicated in the viewer *and* the generator. | `ReportViewer.tsx:666`, `decoded-generate-report/index.ts:827` |

### 1.1 The trap in the obvious fix

Fact 4 is the dangerous one, and it means **"just let Tom take the Relatti assessment" is actively destructive today**:

```ts
// AssessmentEngine.tsx:399 — on completion
.update({ current_layer: "superseded" })
.eq("user_id", userId)              // ← no program filter
.not("completed_at", "is", null)
.neq("id", assessmentId);
```

A dual-brand user completing their *first Relatti* assessment **silently supersedes their MasteryTV assessment**. Their executive coach then loses career/wellness/ADHD context, `/assess` on masterytv.com sends them to a dashboard reading off a 3-instrument profile, and nothing errors. **Story 2 must ship before any user is allowed a second program.**

## 2. Why this outranks the report cosmetics

The roadmap is **relationship → career → white-label**. Stage 2 *is definitionally* a user taking a second assessment on a second domain. **Career is dead on arrival until this lands** — the first tester who does relationship then career hits fact 3 (can't start) or fact 4 (silently destroys their first profile).

Today it bites exactly one person (Tom), because he's the only dual-brand user. That is the *only* reason this hasn't shown up in the beta.

## 3. Two corrections to the 2026-06-24 plan

PC2.1 as written says: *"backfill existing rows to the general program."*

1. 🔴 **That backfill is wrong.** It would mislabel `tester1`/`tester2` — real *relationship* assessments — as `general`, breaking the live dyad and the compat report. **Backfill from the instruments** (the same signal the current heuristic uses, so labels match today's rendering exactly): career instruments present → `general`; else → `relationship`. Do **not** use `users.signup_brand` — Tom is stamped `masterytv` but the rule must key off the assessment, not the person.
2. **The plan omits the supersede bug** (fact 4). It frames PC2.1 as *isolation* (a domain shouldn't see another's data). It's worse than that: it's **data destruction**. That reframing makes Story 2 a prerequisite, not a nicety.

## 4. The invariant

> **A user has at most one active assessment per program.** Every "the user's current assessment/report" read resolves within a program. A retake supersedes *within its program only*. A first assessment in a NEW program supersedes nothing.

Corollary (the durable rule from the conversations fix, restated): **`user_id` alone is not brand isolation.**

## 5. Design

### 5.1 Schema

```sql
ALTER TABLE assessments ADD COLUMN program text NOT NULL DEFAULT 'general';
CREATE INDEX idx_assessments_user_program ON assessments (user_id, program, completed_at DESC);
```

- **`assessments` only.** `progress`/`scores`/`profiles`/`reports` all key off `assessment_id` (unique indexes confirm), so the column cascades by join. Denormalizing onto `assessment_reports` is **optional** — take it only if a read needs report-by-program without the join (§6 Story 4 decides).
- **Mirror `conversations.program` exactly:** bare `text`, values `'general' | 'relationship'`, **no CHECK** (matching `20260715120000`). A CHECK would need editing per new vertical — the opposite of verticals-as-config.
- `DEFAULT 'general'` matches the incumbent, so any un-stamped write stays MasteryTV.

### 5.2 Backfill

```sql
UPDATE assessments a SET program = CASE
  WHEN EXISTS (SELECT 1 FROM assessment_scores s
                WHERE s.assessment_id = a.id
                  AND s.instrument_id IN ('riasec','weims'))
  THEN 'general' ELSE 'relationship' END;
```
Expected: Tom's 5 → `general`; tester1/tester2 + the 3 beta testers → `relationship`. **Verify counts against §7 before and after — if any row lands differently than the viewer renders it today, stop.**

### 5.3 Retake vs. new program

| Action | Supersedes |
|---|---|
| Retake (`?retake=1`) within program P | only completed assessments **where `program = P`** |
| First assessment in a NEW program | **nothing** |

One filter (`.eq("program", program)`) expresses both. No new flag needed.

## 6. Work breakdown

> Ordered by dependency. **Stories 1+2 must ship together** — the supersede filter needs a column to filter on, and shipping 1 without 2 leaves the destruction live.

| Story | What | Done when |
|:--|:--|:--|
| **PC2.1a** Migration: column + index + backfill (§5.1/5.2). | Counts match §7 baseline. |
| **PC2.1b** 🔴 Stamp + stop destroying. `AssessmentEngine.tsx:222` INSERT stamps `program`; `:399` supersede gains `.eq("program", program)`. `program` passed as a prop from `/assess` **and** `/decoded/assess`. | A second-program assessment leaves the first `completed`, not `superseded`. 🧪 |
| **PC2.1c** Unblock the entry. `/assess:60` (in-progress) + `:72` (completed) scope by program — hoist `getBrand()` above line 60. Same for `/decoded/assess:32,58`. | Tom can take the Relatti battery on relatti.com without a retake. 🧪 |
| **PC2.1d** Scope "the user's report": `dashboard/page.tsx:84,95`, `DashboardLayoutClient.tsx:43` (**also add the missing `.order()`** — it's `.limit(1).single()` with no ordering, non-deterministic the moment two exist). | Each domain's dashboard shows its own report. 🧪 |
| **PC2.1e** Coach: `prompt-assembler.ts:85` gains `.eq("program", program)` (already in scope); `lookup-assessment.ts:57` needs `program` plumbed through the tool dispatcher; `:386` partner-report-by-user_id scoped. | Relationship coach never cites the executive profile. 🧪 goldens |
| **PC2.1f** Retire the heuristic: `ReportViewer.tsx:666` + `decoded-generate-report:827` read the column instead of sniffing instruments. Kills the "Decoded Report" header + Career section on relatti.com. | One source of truth for program. 🧪 |
| **PC2.1g** ✅ The dyad spine. Two layers: PC2.1d's scoping means the `reportId` handed to `syncMyReportToSpine` is already this brand's, AND the function now **verifies** the report's program is `relationship` before stamping, rather than trusting the caller (the call is brand-gated, but `brandId` and `program` resolve via slightly different routes — the blast radius is the dyad coach reading the wrong person's world). | The dyad never points at a general-program report. ✅ |
| **PC2.1h** 🔨 **DEFERRED (2026-07-16).** Invite surfaces (`invite/route.ts:48,93`, `invite-consent:173`, `invite-notify:73`, `invite/[code]:98`, `claim-invites.ts:62,133`) still take latest-report-by-user_id. | A Relatti invite carries the Relatti report. |

### 6.1 Why PC2.1h is deferred (read before picking it up)

It is **not** a one-line repeat of the others. Those four files have **no brand context at all** (two have only `originFromHeaders`), so scoping them means plumbing `program` through the invite/claim call chain — which is the load-bearing dyad path and the exact funnel behind the 0/3 metric. Shipping that half-verified is worse than leaving it.

There's also a design question the others didn't have: **`decoded_invites` has no program column either**, and it spans BOTH brands (Decoded has its own compatibility-sharing hub, `CompatibilityHubDecoded`). So "scope the invite's report by program" first needs an answer to *which* program an invite belongs to — probably a `decoded_invites.program` stamped at creation from the resolved brand, mirroring what PC2.1a did for assessments.

**Live risk today: low and bounded.** It only misfires for a **dual-brand user who also uses invites**. Today that set is `{tom@masterytv.com}`, who has **0 invites**. And the reads take the *latest* report, so right after he takes the Relatti battery his newest report IS the relationship one — it would pick correctly by luck. The bug appears if he later retakes the general battery, or when the career vertical adds a second dual-brand cohort. **Do this before Stage 2 ships, not before the beta.**

**Open decisions (C-class — founder or explicit call):**
- `admin/beta/funnel.ts:130` — should the cockpit split per brand, or stay cross-brand?
- `delete-user-data:77` — cross-brand by design. **Confirm it stays all-programs** (it must: deleting the account means everything).
- `onboarding/page.tsx:658` — `assessment_scores.eq('user_id')` with **no assessment_id filter at all**. This is *already broken for retakes today* (Tom's 5 assessments' scores union). Fix here or spin out?
- `decoded-generate-report:1100` — `assessment_profiles` upsert with **no `onConflict`**; two programs = two profile rows. Check consumers.

## 7. Verification

**Baseline first** (record before the migration):
```sql
SELECT u.email, a.id,
       (SELECT count(*) FROM assessment_scores s WHERE s.assessment_id=a.id
          AND s.instrument_id IN ('riasec','weims')) AS career,
       a.current_layer, a.completed_at
FROM assessments a JOIN auth.users u ON u.id=a.user_id ORDER BY u.email, a.created_at;
```

- **Unit:** backfill CASE as a pure fn; retake-vs-new-program supersede matrix; `getBattery` per program. Mutation-check the supersede filter (drop `.eq("program")` → must fail).
- **Golden:** `npm run snapshot:prompts` — executive must stay **byte-identical**; a relationship-solo golden should now be provably free of executive scores.
- **Live e2e (the acceptance test):** as `tom@masterytv.com` on relatti.com → `/assess` serves the 3-instrument battery (no redirect) → complete → **assert his 5 Decoded assessments are still `completed`, not `superseded`** → he now has 2 reports → relatti.com renders the relationship profile, masterytv.com still renders Decoded → the executive coach still cites career, the relationship coach never does.
- **Advisors:** run Supabase advisors after the DDL.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Backfill mislabels a live user → dyad/compat breaks | Derive from instruments (mirrors today's rendering exactly); verify §7 counts; the only relationship rows are tester1/2 + 3 beta testers |
| `.single()` sites error (PGRST116) once two non-superseded rows exist | The triage lists every one; PC2.1c/d scope them in the same PR. **`generate.ts:38` and `DashboardLayoutClient.tsx:43` are the unguarded ones.** |
| Edge fns drift from `src/` (they can't share code) | `prompt-assembler`/`lookup-assessment`/`dyad-context` are edge-side; redeploy together, goldens catch drift |
| MasteryTV regression | `DEFAULT 'general'` + byte-identical executive golden |
| Migration history unreliable ([[migration-history-gap]]) | Query live constraints before DDL; live DB has CHECKs absent from the baseline |

## 9. Explicitly NOT in scope

- `memory_facts` / `coach_profiles` scoping → that's **PC2.2**, a separate story.
- Per-domain intake routing → **PC2.3**.
- Backfilling a Relatti assessment for Tom from his existing answers. His battery is a superset (`ipip50, ecr_r_short, csi4` all present), so it's *tempting* — but it fabricates an assessment he never took, on a product whose credibility rests on real instruments. He takes the 3-instrument battery like any user, once PC2.1c unblocks it.
