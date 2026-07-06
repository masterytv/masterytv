# ORIENT — Start Here (single-file briefing)

> **Purpose:** the *one* file a new session reads to get oriented. Stable map, not a changelog.
> For volatile "what changed this week" state, see the **`relatti-open-state`** auto-memory (the rolling log).
> Last reviewed: 2026-07-02.

---

## 1. What this is (30 seconds)

**Relatti** (`relatti.com`) — a **relationship-coaching** product where the hero is *the couple's relationship*, not a personality type. It's **Stage 1** of a 3-stage roadmap (Relationship → Career → White-Label) built on **one reused engine**: the *Decoded* assessment (ECR-R attachment + Big Five + satisfaction) + the *Mastery Coach* (LLM coach with memory, voices, guardrails).

The retention thesis: coaching products die at the ~3-week cliff because solo self-improvement has no external stake. Each stage attaches the product to a stake the user can't quietly ghost — **Stage 1's stake is the partner.**

## 2. Status (as of 2026-07-02)

| | |
|---|---|
| **Branch** | **`main` = PRODUCTION, live on `relatti.com`** (merged from `staging` 2026-07-02; not shared/announced). Working branch stays **`staging`**: build → verify → merge to main. |
| **Phase** | Phase 4 (Build) → **pre-beta hardening**. Current mission: a **20-person free test cohort** (friends/family, then Reddit); attorney/clinician review consciously deferred past it. |
| **Review** | Full independent code/product/business review (P0 leak found+fixed, prioritized roadmap): [`docs/FABLE_REVIEW_2026-07-02.md`](../docs/FABLE_REVIEW_2026-07-02.md). |
| **Next up** | Tests + CI gate (consent/isolation/billing) → dyad e2e run → `/admin/beta` funnel cockpit → mobile pass → tester welcome + Reddit copy. Founder: beta-admission mechanics, relatti.com email aliases, LLM DPAs. |

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

> **Rule for every new table:** include `workspace_id`, and attach to an `engagement` rather than directly to a `user` where relevant.

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
- **Never `npm run build` to verify while `next dev` runs** — it corrupts shared `.next`. Use `tsc --noEmit`. (`no-prod-build-during-dev` memory.)
- **Report→spine sync is latest-tracking** — `syncMyReportToSpine` keeps `decoded_invites.{inviter,recipient}_report_id` + `participant.report_id` on the user's *current* report (runs on dashboard load), so a **retake** propagates to the dyad. Compatibility reports detect staleness off `decoded_invites.compatibility_generated_at` vs each partner's `assessment_reports.generated_at`, and offer a manual **Regenerate**. (`relatti-open-state` memory, 2026-06-30.)
- **Assessment item text is canonical** — the 13 instruments were audited line-by-line vs published sources (2026-06-30); DERS-16 was re-fielded to the canonical Bjureberg set. `src/lib/decoded/scoring/engine.ts` is the only scorer. Changing item text invalidates stored responses → users retake. See [DECODED_SCORING.md](DECODED_SCORING.md).
- **The `layout.tsx` inline head script is a TEMPLATE LITERAL** — regexes need `\\/` (a bare `\/` collapses and the whole script dies as a SyntaxError; this silently killed brand+theme+favicon resolution 06-22→07-02). And **never remove Next-managed `<head>` nodes** from it — Next then silently fails to commit soft navigations (the "two-click" bug); mutate attributes / append foreign nodes only.
- **New SECURITY DEFINER functions are PostgREST-callable by anon/authenticated by default** — service-role-only RPCs need `REVOKE … FROM PUBLIC, anon, authenticated` in the same migration (the 2026-07-02 P0 leak class). Run the Supabase security advisors after DDL.
- **`calculateCost(usage, isFallback)`: `isFallback=true` = Claude/Sonnet rates** (GPT-4o-mini is primary; the relationship coach forces Claude). Pre-2026-07-02 `cost_tracking` rows are mispriced ~20× both directions.
- **Brand CSS tokens lose to the later `[data-theme="light"]` block at equal specificity** — light-mode brand values need the combined `[data-brand="relatti"][data-theme="light"]` selector.
