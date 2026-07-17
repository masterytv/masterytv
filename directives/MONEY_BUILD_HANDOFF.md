# **Money Vertical — Build Handoff**

> **Purpose:** the single prompt/brief to start the **build** conversation for the money vertical (brand **Momatti** / mechanic **Money Maps™**). Phases 0–0.5 are done and founder-approved; this hands off to Phase 4 (Build). **Paste the §0 prompt into a fresh Claude Code session** (the build reads a lot of source — start it clean).
> **Date:** July 17, 2026 · **Author:** Claude Code (Orchestrator)
> **Why this doc exists:** the last brand build (Relatti) taught us that a new vertical silently inherits the *wrong* vertical's behavior at dozens of seams unless every one is handled. We since built a **typed program axis + CI gates** that turn most of those silent errors into loud compile/gate failures. This handoff makes sure the build *leans on that machinery* instead of freelancing around it.

---

## 0. The pasteable kickoff prompt

> Build the **money vertical** on the multi-brand coaching platform. Phases 0–0.5 are complete and founder-approved; specs are written. Build it **by the playbook and the gates** — this platform has hard-won discipline for turning silent cross-brand bugs into loud failures; do not work around it.
>
> **Read first, only what the task needs:** (1) `directives/ORIENT.md` — platform + the typed program axis; (2) `directives/VERTICAL_PLAYBOOK.md` — **MANDATORY**: §5.0 step-zero, the §5 launch checklist, the §5.10 verification sweep (every 🔥 = a real Relatti bug); (3) this file `directives/MONEY_BUILD_HANDOFF.md`; (4) the money specs — `MONEY_EXPERIENCE.md`, `MONEY_MAPS_INSTRUMENT.md`, `MONEY_VIRAL_GTM.md`, `MONEY_DISCOVERY.md`; (5) `directives/BRAND.md` before any UI; (6) the `relatti-open-state` memory for rolling state + scars.
>
> **First, pin the 3 founder decisions in §4 below. Then do §5.0 step-zero (the `money` slug into both ProgramId unions) and follow the compile errors.** Work on `staging`; keep `npm run gate` green; commit but **ask before any push or edge deploy**. Follow the sequence in §3.

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
- **Migrations:** MCP `apply_migration` **AND commit the file**; query live `pg_constraint` **before** touching any status/category vocabulary (the 44-vs-7 history gap — live CHECK constraints are absent from the committed baseline); new SECURITY DEFINER RPCs need `REVOKE … FROM PUBLIC, anon` in the same migration; run the security advisors after DDL.
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

## 4. Founder decisions to pin BEFORE building (`MONEY_EXPERIENCE.md` §15)

1. **V1 spine:** Decision Room (recommended) vs. daily-loop lead.
2. **Brand/domain:** grab **Momatti.com** now vs. build on `moneymaps.masterytv.com` interim vs. decide later.
3. **`STRATEGY.md` roadmap:** money is the active vertical — does **career defer to Stage 3, run parallel, or retire?** (Only the founder makes this; `STRATEGY.md` was left untouched pending it.)
4. (Context) audience size/channels — sizes the founding cohort + the manual-MVP recruit.

---

## 5. Flow & guardrails

- Work on **`staging`**; `npm run gate` green + preview-verify **before** commit.
- **Ask before pushing** (`git push`) and **before any edge deploy** (Supabase CLI — it's the live engine; founder go required).
- Run the **§5.10 verification sweep** (dual-brand pass · crawler pass · proactive pass · consent pass · coach-context pass · webhook probes · founder walkthrough) **before any public link**.
- **Self-anneal:** every cross-vertical bug that ships adds its prevention to `VERTICAL_PLAYBOOK.md` §5 **in the same session as the fix**.

---

## 6. Where the specs live
`MONEY_DISCOVERY.md` (viability + regulatory) · `MONEY_VIRAL_GTM.md` (funnel/pricing/virality) · `MONEY_EXPERIENCE.md` (⭐ the experience spec) · `MONEY_MAPS_INSTRUMENT.md` (⭐ the assessment + scoring) · `MONEY_EXPERIENCE_NOTES.md` (design rationale) · `scripts/money-maps-scoring.mjs` (the scoring reference + 7 tests) · this file (the build brief).
