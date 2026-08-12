# ORIENT — Start Here (single-file briefing)

> **Purpose:** the *one* file a new session reads to get oriented. Stable map, not a changelog.
> For volatile "what changed this week" state, see the **`relatti-open-state`** auto-memory (the rolling log).
> Last reviewed: 2026-07-16.

---

## 1. What this is (30 seconds)

**Relatti** (`relatti.com`) — a **relationship-coaching** product where the hero is *the couple's relationship*, not a personality type. It's **Stage 1** of the platform roadmap (Relationship → **Money** → Career → White-Label — money became Stage 2 and career was deferred, founder decision 2026-07-17; see [MONEY_DISCOVERY.md](MONEY_DISCOVERY.md) / [MONEY_BUILD_HANDOFF.md](MONEY_BUILD_HANDOFF.md)) built on **one reused engine**: the *Decoded* assessment (ECR-R attachment + Big Five + satisfaction) + the *Mastery Coach* (LLM coach with memory, voices, guardrails).

The retention thesis: coaching products die at the ~3-week cliff because solo self-improvement has no external stake. Each stage attaches the product to a stake the user can't quietly ghost — **Stage 1's stake is the partner.**

## 2. Status (as of 2026-07-09)

| | |
|---|---|
| **Branch** | **`main` = PRODUCTION, live on `relatti.com`.** Working branch stays **`staging`**: build → verify (`npm run gate` + preview) → commit → push → founder merges main. |
| **Phase** | Phase 4 (Build) → **beta RECRUITING**. The acquisition funnel is COMPLETE + verified with a real couple: landing CTAs → `/beta?code=…` (offer page; code rides the link; before check-in pre-signup; access auto-applies post-assessment) → partner auto-enroll → day-14 after check-in → `/admin/beta` cockpit (funnel, CSI-delta marketing stats, consented testimonials). Live share link: `relatti.com/beta?code=BETA826`. Copy + runbook: [`BETA_LAUNCH_COPY.md`](BETA_LAUNCH_COPY.md). |
| **Review** | Full independent code/product/business review (P0 leak found+fixed, prioritized roadmap): [`docs/FABLE_REVIEW_2026-07-02.md`](../docs/FABLE_REVIEW_2026-07-02.md). |
| **Next up** | **Marketing: recruit beta testers** (friends/family now; Reddit once founder ships `support@`/`privacy@` forwards + LLM DPAs). Housekeeping: sweep test data (partner1/partner2/relatti20 rows + TESTLOOP9 code) before quoting real stats. Deferred by decision: Stripe (tier upgrades stay free via alpha-upgrade), attorney/clinician review, SMS/E6. |

## 3. Stack & key infra

- **Next.js (App Router) + TypeScript strict + Tailwind v4 + Framer Motion.** ~185 TS/TSX files in `src/`.
- **Supabase** project `masterytv-website`, ref **`lwmadssysqcwbsoiaokc`**. **Edge functions deploy via the Supabase CLI, NOT Vercel.**
- **Vercel** project `mastery-tv` (Hobby) — hosts the Next app; `staging` branch → `staging.relatti.com`.
- Migration history is unreliable (44 remote vs few committed); baseline snapshot at `supabase/migrations/20260616000000_baseline_pre_relatti.sql`. See `migration-history-gap` memory.
- **Multi-vertical by design:** one modular app → many domains, verticals-as-config (5-layer: workspace · program · surface · module · theme). Brand resolves from host / `?brand=` (`relatti` vs `masterytv`).

## 4. The polymorphic spine (the technical mandate)

One data spine serves all three future products. Five concepts (full detail in [RELATIONSHIP_ARCHITECTURE.md](RELATIONSHIP_ARCHITECTURE.md)):

1. **`workspace`** (tenant) — `workspace_id` on every user-data table now, defaulted to one MasteryTV workspace. Cheap-now / expensive-later seed for white-label.
2. **`program`** — `relationship | career | white_label`. Selects assessment battery, coach persona, funnel, content.
3. **`engagement`** — the container a user is coached within. Relationship = 2-participant dyad; career = 1 + cohort; white-label = 1 + coach.
4. **`participant`** — links accounts to an engagement with a role (`self | partner | coachee`). Coaching context hangs off the **engagement**, not the user.
5. **`accountability_link`** — the external stake as first-class data (`partner | cohort | human_coach | deadline`).

Plus **`entry_segment`** — maps a marketing slug (`/married`, `/laidoff`) → program + framing + content (funnels are data, not hardcoded pages).

> **Rule for every new table:** include `workspace_id`, attach to an `engagement` rather than directly to a `user` where relevant — and **categorize it in `scripts/check-tenancy.mjs`** (CI fails until you do).
>
> **The program axis is TYPED (tenancy T0–T7, 2026-07-16).** `ProgramId` is a union in `src/lib/platform/brand.ts` with a lockstep twin in `supabase/functions/_shared/packs/index.ts`; packs/modules/batteries are exhaustive `Record<ProgramId,…>` maps and `normalizeProgram` THROWS on an unregistered program. **New brand = add the slug to BOTH unions + the BRANDS/EDGE_BRANDS registries, then follow the compile errors** ([VERTICAL_PLAYBOOK.md](VERTICAL_PLAYBOOK.md) §5.0). Never write a brand/program ternary (`check:ternaries` blocks it — use `byBrand()` / `brandForProgram()`), and never read a program-scoped table by `user_id` alone (`check:tenancy` blocks it). Full story: [TENANCY_AUDIT.md](TENANCY_AUDIT.md).

## 5. Where to read next — the router

Read **only** what the task needs. (⭐ = current source of truth.)

| If you're doing… | Read |
|---|---|
| **Anything — orient** | This file → then `relatti-open-state` memory for rolling state |
| Strategy / roadmap / why | ⭐ [STRATEGY.md](STRATEGY.md) |
| Product reqs (relationship) | ⭐ [RELATIONSHIP_PRD.md](RELATIONSHIP_PRD.md) |
| DB spine / schema / ADRs | ⭐ [RELATIONSHIP_ARCHITECTURE.md](RELATIONSHIP_ARCHITECTURE.md) |
| Multi-vertical frontend/identity | ⭐ [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md) |
| What to build next / sprint | ⭐ [RELATIONSHIP_SPRINT.md](RELATIONSHIP_SPRINT.md) + [PLATFORM_SPRINT.md](PLATFORM_SPRINT.md) |
| The couples *experience* (report/coach/ritual) | ⭐ [RELATTI_EXPERIENCE.md](RELATTI_EXPERIENCE.md) |
| Launching a NEW vertical | ⭐ [VERTICAL_PLAYBOOK.md](VERTICAL_PLAYBOOK.md) (research experience FIRST) |
| **Integration coaching** (proposed Stage 3 — transformational/anomalous-experience) | ⭐ [INTEGRATION_SPRINT.md](INTEGRATION_SPRINT.md) (build order, Gate 3 pending) → [INTEGRATION_EXPERIENCE.md](INTEGRATION_EXPERIENCE.md) (✅ Gate 0.5 approved) → [INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md) (research + risk). Rides the Project Profound corpus (separate Supabase project). |
| **Any UI/CSS/.tsx work** | ⭐ [BRAND.md](BRAND.md) — **mandatory before touching styles** (§14 bans hardcoded hex, emoji, Sparkles icon) |
| Coach behavior / safety | [COACHING_BRAIN.md](COACHING_BRAIN.md), [COACHING_GUARDRAILS.md](COACHING_GUARDRAILS.md) |
| Assessment internals | [DECODED_SCHEMA.md](DECODED_SCHEMA.md), [DECODED_SCORING.md](DECODED_SCORING.md), [DECODED_ARCHETYPES.md](DECODED_ARCHETYPES.md), [DECODED_REPORT_STRUCTURE.md](DECODED_REPORT_STRUCTURE.md), [DECODED_CARD_DESIGN_SPEC.md](DECODED_CARD_DESIGN_SPEC.md) |
| Engine tech-stack (pre-detour product framing is dead) | [ARCHITECTURE.md](ARCHITECTURE.md) — engine sections only |

**Superseded / on-hold pre-detour docs live in [`archive/`](archive/)** — do not read them for current work (old B2C direction, paused not deleted).

## 6. Decisions owed by founder (Tom, tom@masterytv.com)

These block the beta / launch:
- **Beta admission mechanics** (NEW 2026-07-02): self-serve feedback pledge (current — uncapped) vs invite-code/manual approval for the 20-tester cohort. Decide before Reddit.
- **relatti.com email aliases:** create/forward `support@relatti.com` + `privacy@relatti.com` (referenced by /science, /why-ai, and the legal docs). `tom@relatti.com` confirmed receiving 2026-07-02.
- **LLM no-train confirmation + DPAs** (E15.2) — verify OpenAI/Anthropic org settings match the privacy policy. See `LLM_DATA_HANDLING.md`.
- **Stripe + pricing** → unblocks **E10** (deferred past the free cohort).
- ~~SMS provider~~ → Twilio (decided 2026-06-30), deferred until beta runs. ~~Production go-ahead~~ → **live 2026-07-02**. ~~Resend mail.relatti.com~~ → **verified 2026-07-02** (escalation + brand email on it; confirm `RESEND_API_KEY_RELATTI` is in Vercel env).
- Post-beta: attorney + clinician sign-off (E15.6), Vercel Pro (Hobby bans commercial use), Supabase Pro (+ leaked-password protection).

## 7. Durable gotchas (learned the hard way)

- **Edge functions can't import from `src/`** → some logic (e.g. ECR→relationship-style derivation) is **duplicated** across `supabase/functions/_shared/*` and `src/lib/*`. Edit both, keep in lockstep.
- **Coach dyad context lives in 2 paths** — the spine (behind `RELATTI_DYAD_ENGINE` flag) and the legacy `decoded_invites` fan-out (`prompt-assembler.ts`, default-on). Edit both or know the flag.
- **Dyad-interpretive LLM output:** compute cross-person comparison in *code* and feed it as ground truth — never let the model infer who-is-what from personality/voice (two per-person renders will contradict).
- **Brand-aware everything:** copy, metadata, theme tokens, email all branch on resolved brand. CSS uses `var(--color-primary)`; `data-brand=relatti` must resolve on the route (rose vs blue).
- **`deno run` does NOT type-check** — edge modules and coach-lab scripts execute happily with type errors in them, so `tsc` (which excludes `supabase/functions` and `scripts/coach-lab`) was the only gate and it never saw them. **`npm run check:deno` now covers both**, in the gate right after `typecheck`. Two traps it caught on the way in: a **`.select()` string built with `+`** types every returned row as `GenericStringError` — supabase-js parses the select list at the *type* level, so it must be ONE literal, and those 26 errors propagated to every file importing it — and an **extensionless relative import**, which Deno needs as `.ts` and which a type-only import hides until someone makes it a value import. Function *entrypoints* stay out of scope: they use `EdgeRuntime` globals `deno check` doesn't know about.
- **Never `npm run build` to verify while `next dev` runs** — it corrupts shared `.next`. Use `tsc --noEmit`. (`no-prod-build-during-dev` memory.)
- **Report→spine sync is latest-tracking** — `syncMyReportToSpine` keeps `decoded_invites.{inviter,recipient}_report_id` + `participant.report_id` on the user's *current* report (runs on dashboard load), so a **retake** propagates to the dyad. Compatibility reports detect staleness off `decoded_invites.compatibility_generated_at` vs each partner's `assessment_reports.generated_at`, and offer a manual **Regenerate**. (`relatti-open-state` memory, 2026-06-30.)
- **Assessment item text is canonical** — the 13 instruments were audited line-by-line vs published sources (2026-06-30); DERS-16 was re-fielded to the canonical Bjureberg set. `src/lib/decoded/scoring/engine.ts` is the only scorer. Changing item text invalidates stored responses → users retake. See [DECODED_SCORING.md](DECODED_SCORING.md).
- **The `layout.tsx` inline head script is a TEMPLATE LITERAL** — regexes need `\\/` (a bare `\/` collapses and the whole script dies as a SyntaxError; this silently killed brand+theme+favicon resolution 06-22→07-02). And **never remove Next-managed `<head>` nodes** from it — Next then silently fails to commit soft navigations (the "two-click" bug); mutate attributes / append foreign nodes only.
- **New SECURITY DEFINER functions are PostgREST-callable by anon/authenticated by default** — service-role-only RPCs need `REVOKE … FROM PUBLIC, anon, authenticated` in the same migration (the 2026-07-02 P0 leak class; swept again 2026-07-09 in `20260709000000_lock_internal_rpcs`, which locked 4 more fns). Do **not** lock RLS-helper RPCs (`get_auth_user_role`, `is_engagement_participant`) — they run inside policies as the querying role and must keep EXECUTE. Run the Supabase security advisors after DDL.
- **`calculateCost(usage, isFallback)`: `isFallback=true` = Claude/Sonnet rates** (GPT-4o-mini is primary; the relationship coach forces Claude). Pre-2026-07-02 `cost_tracking` rows are mispriced ~20× both directions.
- 🔥 **Safety state does not survive the turn it was detected on — in ANY vertical** (found 2026-08-11 while building `integration`'s I3.5). Both tiers write `crisis_flags`, and the only readers are the admin queue and the escalation-dedup check. Nothing carries a prior detection into the next prompt, so after a crisis or DV response fires, the following turn is assembled as though it never happened. That is the continuation-after-detection shape INTEGRATION_SPRINT §3/I11.4 names as the harm theory in *Garcia* and *Raine*. Not fixed — it is a cross-vertical change and wants its own decision. Anything relying on "the conversation changed state" must check whether it actually did.
- **A new PROGRAM is cheap; a new BRAND is expensive.** Adding a `ProgramId` produced 5 bounded `Record<ProgramId,…>` errors; adding a `BrandId` compile-errors 9 `Record<BrandId,…>` files and `check:brand-tokens` demands a full identity token set in both themes. A vertical can therefore be built out on the program axis (coach, safety, memory, battery) while its brand is undecided — but the dashboard/sidebar/topbar/middleware branches are **brand**-keyed and cannot be written until the name exists. See VERTICAL_PLAYBOOK §5.0.
- **Brand CSS tokens lose to the later `[data-theme="light"]` block at equal specificity** — light-mode brand values need the combined `[data-brand="relatti"][data-theme="light"]` selector.
- **The money vertical's public brand is "MoneyTraits" (one word) on moneytraits.com** (2026-07-20). The interim name "Money Maps"/"MoneyMaps" is a **third party's registered mark** — banned from all user/model-facing text and **gate-enforced** (`check:brand-terms`). Storage identifiers deliberately keep the old spelling (`money_maps`, `sections.money_map` — locked contracts, never surfaced in copy); `moneymaps.masterytv.com` hosts are transition aliases. Vocabulary: the four **traits**, "your trait profile", "the Challenge", "the Fear". See BRAND.md §1.1 + `MONEY_TRAITS_RENAME.md`.
