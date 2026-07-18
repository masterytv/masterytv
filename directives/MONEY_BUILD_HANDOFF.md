# **Money Vertical — Build Handoff**

> **Purpose:** the single prompt/brief to start the **build** conversation for the money vertical (brand **Momatti** / mechanic **Money Maps™**). Phases 0–0.5 are done and founder-approved; this hands off to Phase 4 (Build). **Paste the §0 prompt into a fresh Claude Code session** (the build reads a lot of source — start it clean).
> **Date:** July 17, 2026 · **Author:** Claude Code (Orchestrator)
> **Why this doc exists:** the last brand build (Relatti) taught us that a new vertical silently inherits the *wrong* vertical's behavior at dozens of seams unless every one is handled. We since built a **typed program axis + CI gates** that turn most of those silent errors into loud compile/gate failures. This handoff makes sure the build *leans on that machinery* instead of freelancing around it.

---

## 0. The pasteable kickoff prompt

Copy everything between the fences verbatim into a fresh build session. (Hardened by a 4-agent review pass, 2026-07-17 — grounded in the actual gate chain, the 7 scoring tests, and §5.10.)

```
You are building the MONEY vertical on the MasteryTV multi-vertical platform. This
runs against a LIVE production engine already serving Relatti (relationship) and
executive-coach users. A silent cross-brand error ships the wrong vertical's coach,
skin, or briefing to real users. Your job is to build money WITHOUT moving any
existing vertical by a single byte.

━━━ READ FIRST (in this order, only what your current phase needs) ━━━
1. directives/ORIENT.md            — project briefing, stack, the DB spine
2. directives/VERTICAL_PLAYBOOK.md — §5 launch checklist + §5.10 verification sweep
3. directives/MONEY_BUILD_HANDOFF.md — the build brief (§3 sequence, §4 founder
   decisions, §5 hard stops, §7 mode + the per-phase loop)
4. The money specs: MONEY_EXPERIENCE.md, MONEY_MAPS_INSTRUMENT.md, MONEY_DISCOVERY.md
5. directives/BRAND.md — READ FULLY before ANY .tsx/.jsx/.css. Type-scale tokens
   only, no hardcoded hex, Lucide icons only, metadata via brand-metadata.ts.

━━━ STEP ZERO — do this ALONE, first, before any other work ━━━
Add the "money" slug to BOTH ProgramId unions:
  • src/lib/platform/brand.ts
  • supabase/functions/_shared/packs/index.ts
Also register it in BRANDS / EDGE_BRANDS. Then FOLLOW THE COMPILE ERRORS through
every Record<ProgramId,…> map (Coach-Pack registry, PROGRAM_MODULES, BATTERIES) and
every byBrand() call. Resolve the cascade as ONE connected type graph — the compiler
hands you the next edit. normalizeProgram THROWS at runtime on an unregistered
program, so an unwired path is a loud error, not the executive coach in disguise.
Do NOT let a parallel agent touch this cascade — semantic collisions here compile
clean and behave wrong.

━━━ WORKFLOW — a DIAMOND, not a fan ━━━
Governing test for every unit: "Does it touch a shared type surface, the shared coach
kernel, or the live DB schema?" YES → keep it on THIS single coherent agent,
sequentially. NO → safe to parallelize AFTER the trunk compiles green.

TRUNK (sequential, one agent, in order — never parallelize):
  T1. Step-zero typed-axis cascade (above).
  T2. Money Coach Pack (money-pack.ts) + the reveal first-message builder + the
      shared-kernel boundary. HARD INVARIANT: exec + relationship prompt goldens stay
      BYTE-IDENTICAL; only a new `money` golden may be added. If either incumbent
      golden moves, you touched a shared surface — revert, re-scope to money-pack.ts.
  T3. resolve-program + new money cases in check:resolve + memory-extraction taxonomy
      (must land inside the live memory_facts_category_check).
  T4. Proactive sender program→brand wiring (shared code, known wrong-brand-at-8am scar).
  T5. The clickable-chip CONTRACT (chip shapes + coach output) — spec here; UI is a leaf.

LEAVES (parallelize freely after the trunk is green; each merges through the gate):
  scoring engine + the 7 boundary tests · 16-item bank + 12 archetype copy · card art +
  OG (money palette) · chip UI build (against T5) · Decision Room surface (bespoke) ·
  Money OS UI (bespoke) · briefing/cron content + referral ladder · waitlist landing.

LIVE-DB MIGRATIONS (strictly sequential, ONE hand, HARD STOP): Money OS table,
  memory_facts category extension, any SECURITY DEFINER RPC (needs REVOKE … FROM
  PUBLIC, anon), program seed, pre-existing-row backfills. Never two agents on the pen.

FINAL PHASE — adversarial silent-error sweep (the BEST fan-out, read-only): run
  §5.10 in order, one agent per seam hunting a cross-brand leak (dual-brand isolation,
  crawler/OG, proactive gate, consent, coach context, webhook probes).

━━━ FOR EACH PHASE: plan → RED-TEAM YOUR OWN PLAN → execute → self-verify ━━━
BEFORE code: write the plan, then run bmad-adversarial-review on YOUR OWN plan —
attack it: Which Record<ProgramId,…> / byBrand() am I leaving defaulted to another
vertical? Could any edit move the exec/relationship coach one byte? Am I about to
self-decide a §4 founder call? Which still-silent seam does this touch? Am I re-skinning
a default surface where the spec calls for bespoke? Revise, THEN build.

AFTER code, run ALL FIVE before you commit:
  1. `npm run gate` GREEN (tsc · vitest · safety · isolation · check:metadata ·
     check:colors · check:brand-tokens · check:ternaries · check:tenancy ·
     check:resolve · snapshot:prompts). Red gate = STOP.
  2. `node scripts/money-maps-scoring.mjs` prints `All 7 passed.` (TS scorer's vitest
     reproduces the same 7 cases).
  3. `npm run snapshot:prompts` → exec + relationship goldens BYTE-IDENTICAL, only a new
     `money` golden added.
  4. Preview-verify the surface (curl|grep og: on shareable pages). NEVER `npm run build`
     while `next dev` runs — use tsc --noEmit.
  5. Self-audit the still-silent seams this phase touched (below).
Then REPORT the phase result (what shipped, gate output, the `All 7 passed.` line,
byte-identical confirmation) before starting the next phase.

━━━ HARD STOPS — halt and report; NEVER proceed on your own authority ━━━
  • Any §4 founder decision still unpinned (V1 spine, brand/domain, roadmap call) —
    founder-only; do NOT pick a default.
  • `git push` · any edge-function deploy · any prod DB migration (apply_migration /
    Supabase CLI writes straight to the LIVE engine DB — stage the file, query live
    pg_constraint first, apply ONLY on a founder "go", commit same step, run security
    advisors after).
Commit freely on `staging`. Push, deploy, and migrate ONLY on an explicit founder go.

━━━ HIGHEST-RISK HAND-CHECK SEAMS — a green gate does NOT prove these safe ━━━
  1. src/app/layout.tsx inline <head> script — TEMPLATE LITERAL, allowlisted from
     check:ternaries. Add money's data-brand/theme/favicon BY HAND; regexes need \\/;
     don't remove Next-managed <head> nodes.
  2. Email HTML (invite-email.ts) + OG palette (api/og/route.tsx) — allowlisted from
     check:colors. Set the money palette by hand; proactive defaults to masterytv chrome
     when no brand is passed.
  3. Marketing / legal / answer-engine copy (/science, /why-ai, (legal), /privacy, tier
     labels, tab+OG titles) — no gate reads prose; must be money-voiced.
  4. DB backfills for pre-existing rows — check:tenancy proves the column exists, never
     that historical rows carry the right program value. Backfill explicitly.
  5. Prod-only config not in git — Resend from-domain + inbound, Vercel env, supabase
     secrets, pg_cron Vault auth, DNS→Vercel, edge CORS per new origin, the live
     memory_facts_category_check (query pg_constraint — baseline lacks it).
  6. Webhook-shaped fns deploy --no-verify-jwt; redeploy every fn whose _shared imports
     changed; probe after (POST-no-auth returns the fn's OWN error, not gateway JSON).
  Also (partially gated): proactive zero-role='user' gate; briefings never reference
  session content; names from users.name never invited_email; consent needs explicit
  Accept + honored revocation; cross-brand reads keyed by engagement_id / conversation_id
  / ?c= / inviter_id are MANUAL review (check:tenancy only keys on user_id).

Start now with STEP ZERO.
```

---

## 1. The north star — make silent errors loud

**The mechanism (do this FIRST — most of the launch checklist falls out of it):** add the `money` program slug to **BOTH** `ProgramId` unions — `src/lib/platform/brand.ts` **and** `supabase/functions/_shared/packs/index.ts` (lockstep twins; the edge runtime can't import `src/`) — plus the `BRANDS` + `EDGE_BRANDS` registries. Then **follow the compile errors**: every `Record<ProgramId,…>` map (Coach-Pack registry, `PROGRAM_MODULES`, `BATTERIES`) and every `byBrand()` call site becomes a compile error until money is handled. `normalizeProgram` **throws** on an unregistered program — a missing pack is a visible crash, not the executive coach silently impersonating the money coach.

**The gates are the net — `npm run gate` must stay green** and includes: `tsc` · `vitest` · safety · isolation · **`check:resolve`** (program resolution precedence) · **prompt-snapshot goldens BYTE-IDENTICAL for the existing verticals** · **`check:colors`** (no incumbent brand-color literal in shared surfaces) · **`check:brand-tokens`** (the new brand overrides the full identity token set, both themes) · **`check:ternaries`** (no behavior ternaries on brand/program literals) · **`check:tenancy`** (new tables categorized; no `user_id`-only read of a program-scoped table) · **`check:metadata`** (no bare page `title`). Treat a red gate as a stop, not a nuisance.

**The seams the gates CAN'T see — hand-check these (§5's still-silent list):**
- The `layout.tsx` inline head script is a **template literal** — regexes need `\\/` (a bare `\/` collapses and silently kills brand/theme/favicon), and never remove Next-managed `<head>` nodes (causes the two-click nav bug). Extend its brand lists **by hand**.
- Marketing/legal copy · email HTML + the OG image palette · **DB backfills for pre-existing rows** · cron *content* quality · and anything living in **prod config** (Resend domains, Vercel env, pg_cron) rather than the repo.

---

## 2. Money-specific build rules

- **Scoring:** reproduce the **7 boundary tests in `scripts/money-maps-scoring.mjs`** as the production TS unit tests (tie-break `DRIVE>GUARD>SHADOW>MIRROR`, overclock `≥4.0`, LEAP bands `Low<2.75 / Mod / High≥4.0`, tilt `0.5` margin). **Item text is canonical once shipped** — changing it invalidates stored responses (`DECODED_SCORING.md`). Instrument items/archetypes/reveal are in `MONEY_MAPS_INSTRUMENT.md`.
- **Coach:** a new `_shared/packs/money-pack.ts` **over the shared kernel** — never fork safety/crisis (PC4.5). Editing the money pack must **not** change the executive or relationship coaches — prove it with **byte-identical prompt-snapshot goldens**. Add money to `resolve-program` + new cases in `check:resolve`. The first message IS the reveal off the Money Map (`MONEY_MAPS_INSTRUMENT.md` §6), not "Hi, I'm your coach."
- **Reveal + funnel:** entry = quiz-first → results-in-chat → **clickable answer chips + free-text** (`MONEY_EXPERIENCE.md` §6). Primary surface = the **Decision Room** (§8) + the **Money OS** living doc (§9), bespoke (ADR-P03), not a re-themed default.
- **Copy / legal:** FTC line — promise **process and felt change** (clarity, control, pricing power, "end the never-enough"), **NEVER wealth outcomes** (`MONEY_DISCOVERY.md` §6.2). **Coaching, not therapy; not financial/investment advice** — coach the psychology of a decision, refer out for finance; crisis kernel on; **anti-sycophancy is a spec'd behavior** (the coach must push back). **No bank linking in V1.**
- **Migrations — HARD STOP (§5), not a routine step:** `apply_migration`/CLI writes straight to the **live engine DB**. Stage + commit the file; query live `pg_constraint` **before** touching any status/category vocabulary (the 44-vs-7 history gap — live CHECK constraints are absent from the committed baseline); new SECURITY DEFINER RPCs need `REVOKE … FROM PUBLIC, anon` in the same migration; run the security advisors after DDL. **Apply only on an explicit founder go.**
- **Edge deploys:** webhook-shaped fns deploy `--no-verify-jwt`; **redeploy every fn whose `_shared` imports changed** (deno-info sweep) and probe after (POST-no-auth returns the fn's own error, not gateway JSON). Crons: Vault-based auth, brand-aware pack-authored content.
- **Proactive:** zero `role='user'` messages ⇒ **nothing proactive** (assessment-only signups get NOTHING at 8am); per-user program→brand resolution on every sender; `metadata.program` stamped on messages AND `cost_tracking` by every writer. Briefings LOW-DISCLOSURE (never reference session content; subject = greeting only).
- **Local dev:** never `npm run build` while `next dev` runs (corrupts shared `.next`) — use `tsc --noEmit`. Verify like a crawler, not a browser (`curl … | grep og:`).

---

## 3. Sequence (each a valid stopping point)

1. **§5.0 typed program axis** (`money` slug → follow the compile errors) + the **Money Maps assessment + scoring** (the 7 tests) + the **archetype card** (reuse the card/OG pipeline). → the shareable, testable top-of-funnel and the manual-MVP substrate.
2. The **money Coach Pack** + the **reveal** (first-message off the result) + memory wiring + the **clickable-chip chat UI**.
3. The **Decision Room** surface + the **Money OS** living document.
4. **Proactive / retention** + the referral ladder (`MONEY_VIRAL_GTM.md`).

Cheap validation in parallel (beats more building): a **waitlist landing** to the founder's audience, and the **manual-MVP loop** (founder runs the coaching loop by hand on himself + a few users).

---

## 4. Founder decisions — ✅ PINNED 2026-07-17 (`MONEY_EXPERIENCE.md` §15)

1. **V1 spine:** ✅ **the Decision Room** (daily/proactive layer supports, doesn't lead).
2. **Brand/domain:** ✅ **build on `moneymaps.masterytv.com` for now**; public brand name + domain still TBD (Momatti candidate). **Money Maps™** mechanic name is locked.
3. **Roadmap:** ✅ **career DEFERRED; money is Stage 2** — `STRATEGY.md` §1 amended.
4. *(Still open, non-blocking)* audience size/channels — GTM/founding-cohort sizing only; founder to provide when convenient.

---

## 5. Flow & guardrails

- Work on **`staging`**; `npm run gate` green + preview-verify **before** commit. **Commit freely on staging.**
- **HARD STOPS — halt and report, never self-authorize** (each is irreversible or ships to live users): (1) any **unpinned §4 founder decision** — don't pick a default; (2) **`git push`**; (3) **any edge-function deploy** (Supabase CLI — the live coach engine); (4) **any prod DB migration** — 🔥 *the one gap the harden pass caught: `apply_migration` writes to the live engine DB and is NOT a routine step.* Stage the file, query live `pg_constraint` first, apply ONLY on a founder go, run the security advisors after.
- Run the **§5.10 verification sweep** (dual-brand · crawler · proactive · consent · coach-context · webhook probes · founder walkthrough) **before any public link**.
- **Self-anneal:** every cross-vertical bug that ships adds its prevention to `VERTICAL_PLAYBOOK.md` §5 **in the same session as the fix**.

---

## 6. Where the specs live
`MONEY_DISCOVERY.md` (viability + regulatory) · `MONEY_VIRAL_GTM.md` (funnel/pricing/virality) · `MONEY_EXPERIENCE.md` (⭐ the experience spec) · `MONEY_MAPS_INSTRUMENT.md` (⭐ the assessment + scoring) · `MONEY_EXPERIENCE_NOTES.md` (design rationale) · `scripts/money-maps-scoring.mjs` (the scoring reference + 7 tests) · this file (the build brief).

## 7. Build mode + the per-phase loop (harden pass, 2026-07-17)

**Mode = a diamond, not a fan.** Governing test for every unit of work: *does it touch a shared type surface, the shared coach kernel, or the live DB schema?* **Yes → one coherent agent (Opus 4.8 Max), sequentially** — the typed-axis cascade, the Coach Pack + kernel boundary (incumbent goldens byte-identical), all live-DB migrations. **No → fan out (Ultracode)** — but only *after the trunk compiles green*, with every branch reconverging on `npm run gate`: the scoring engine/tests, item + archetype copy, card/OG, chip UI, the Decision Room + Money OS surfaces, content/config, and above all the **final adversarial §5.10 sweep** (one agent per seam = the best fan-out). Default if you want a single mode: **Opus-Max** — the live-engine + shared-types risk profile favors coherence over parallelism. Hybrid (Opus-Max trunk → Ultracode leaves + final sweep) is better.

**Per phase: plan → red-team your own plan → execute → self-verify** (the loop baked into §0's prompt). The red-team checks the *thinking* (`bmad-adversarial-review` on your own plan); the five-step verify checks the *work* (gate · the 7 scoring tests · byte-identical goldens · preview · seam self-audit); the §5 stops keep the human in the loop wherever a mistake is irreversible.
