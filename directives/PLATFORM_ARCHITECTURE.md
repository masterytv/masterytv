# **Architecture — The Coaching Platform (Multi-Vertical Frontend + Identity)**

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** June 22, 2026
> **Status:** ✅ APPROVED — BMAD Phase 2 (Architecture). **Gate 2 cleared June 22, 2026** (founder approved the approach + decisions P1–P6 / ADRs P01–P06). Build is sequenced in [PLATFORM_SPRINT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/PLATFORM_SPRINT.md) (Phase 3, awaiting Gate 3). Nothing here is built yet.
> **Parent:** [STRATEGY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/STRATEGY.md)
> **Sibling (the data spine this sits on):** [RELATIONSHIP_ARCHITECTURE.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/RELATIONSHIP_ARCHITECTURE.md) ✅ (the polymorphic DB spine — `workspace`/`program`/`engagement`/`participant` — is LIVE).
> **Engine reference (still valid):** `ARCHITECTURE.md` (§2 stack, §6 security), `BRAND.md` (design tokens).
> **Scope rule:** Design the platform so new verticals are **config, not codebases**. Build only what Relatti (Stage 1) needs now; everything else is designed-for and defaulted.

---

## 0. TL;DR for the founder

- **You do not choose between "one app" and "three domains."** One app serves unlimited domains. The real choice — made June 22 — is **one modular codebase with per-vertical configuration**, not three separate codebases. This is the only model that lets 1–2 devs + AI spin up `relatti.com`, `careercoach.com`, `mentalathletes.com`, `profoundcoach.com`, … quickly.
- A **vertical is a column of configuration** over a shared core, not a fork. It assembles from **five orthogonal layers**: `workspace` (tenant) · `program` (which vertical) · `surface` (the main logged-in screen) · `modules` (toggleable features) · `theme` (brand tokens + copy + domain).
- The **DB spine already supports this** (it's live). This doc adds the **frontend + identity** layer on top: a host→brand resolver, a surface registry, a module registry, and token-based theming.
- **Identity is one account, many programs:** a person assesses once; their profile/archetype is reused across products. **Coaching data is per-program** — your Relatti coach and your career coach share your *personality*, never your *conversations*. (This is the same "privacy by assembly" rule already proven in Relatti.)
- **What to build now:** consolidate the fragmented app tree, add the resolver + theming, make existing modules toggleable, and ship Relatti as the first themed vertical. Career/white-label/future verticals become config.

> **Decisions needing a 👍 at Gate 2:** (P1) one modular platform app, many domains; (P2) one account / many programs / shared profile + per-program coaching memory; (P3) pluggable **surfaces** (verticals can register a bespoke primary screen, default = coach-chat shell); (P4) token-based theming = the white-label mechanism; (P5) widen `program.kind` from a fixed enum to an open vertical slug; (P6) consolidate to one canonical app tree (absorbs Relatti sprint epic E13).

---

## 1. What actually exists today (ground truth)

Inspected live in `src/app/` + `src/middleware.ts` + `src/app/globals.css`.

### 1.1 The frontend is fragmented and single-brand
- **Duplicate app trees:** `src/app/dashboard/` (the live coach app) **and** `src/app/coachapp/` (a parallel auth/dashboard/admin/onboarding tree). One is dead weight. (Relatti sprint epic **E13** already flags this.)
- **Dead landing variants:** `src/app/decoded/landing`, `landing-noir`, `landing-noir-2` — multiple experiments; only some are live.
- **Modules are hardcoded always-on routes:** `dashboard/commitments`, `dashboard/progress`, `dashboard/coaching-letter`, `dashboard/compatibility`, `dashboard/chat`, `dashboard/settings`. Every user sees every module — there is no per-product gate. **Relatti explicitly must NOT show commitments/progress/coaching-letter** (founder, June 22), so these must become *toggleable*, not deleted.
- **One hardcoded brand:** `globals.css @theme` defines a single `--color-brand-*` ramp (oklch hue 270 / indigo) + semantic vars (`--color-primary`, etc.). No `data-theme` switching. Theming-per-brand does not exist yet.
- **No host/brand logic:** `src/middleware.ts` only calls `updateSession()` (Supabase auth refresh). Nothing reads the request host to decide brand/program.

### 1.2 The DB spine below is ready (live)
`workspace` · `program` · `engagement` · `participant` · `accountability_link` · `engagement_artifact` · `entry_segment` are live (see RELATIONSHIP_ARCHITECTURE.md). Identity is a single global `public.users` table. `program.config` (jsonb) already carries `battery`, `coach_persona_layer`, `default_entry_domain` — the seed of per-vertical config. **The platform layer in this doc is the frontend/runtime expression of that spine.**

### 1.3 Tech stack (inherited, unchanged)
Next.js 15 App Router · TypeScript strict · Tailwind v4 (CSS-first `@theme`) · Supabase (single project `masterytv-website`) · Vercel (single project `mastery-tv`, branches `main`→prod, `staging`→staging). No new platform introduced.

---

## 2. The five-layer model (the platform vocabulary)

Everything that "varies per vertical" is exactly one of these five orthogonal layers. This separation is the whole architecture — keep them independent and a new vertical is assembly, not engineering.

| Layer | Question it answers | Lives in | Stage-1 (Relatti) value |
|:--|:--|:--|:--|
| **1. Workspace** (tenant) | *Who owns it?* | `workspace` table | `masterytv` (one). White-label = one workspace per coach (Stage 3). |
| **2. Program** (vertical) | *What product is it?* | `program` table + `program.config` | `relationship`. |
| **3. Surface** | *What's the main logged-in screen?* | Surface registry (code) keyed by program | `relationship_dyad` surface (partner panel + Blueprint + chat). |
| **4. Modules** | *What can it do?* | `program.config.modules` (flags) → module registry (code) | coach + assessment + dyad + compatibility + partner-invite; **commitments/progress/letters OFF**. |
| **5. Theme** | *What does it look like?* | `program`/brand theme tokens + domain map | Relatti brand tokens, `relatti.com`. |

**A vertical = (workspace, program, surface, module-set, theme, domain[s]).** Defining a new product (`mentalathletes.com`) means: reuse the workspace, add a `program` row, pick/register a surface, toggle modules, set a theme, point a domain. Mostly config; new code only when it needs a genuinely novel module or surface.

---

## 3. Identity & cross-vertical data model (decision P2 — REVISED 2026-06-24)

**One account, many programs** — a single `public.users` identity. A person can hold engagements in multiple programs (Relatti + MasteryTV + career) under one login.

> **REVISION (founder, 2026-06-24):** the original P2 was *"shared profile, separate coaching."* On reflection it's revised to **full per-domain isolation: shared identity, but everything domain-specific is separate.** Same database, one login — but each domain is its own world. Rationale: privacy (Relatti's intimate data must never sit near career/employer coaching), purpose-built intake/profile per vertical (the batteries genuinely differ — attachment vs RIASEC vs sport-mindset, so there's little to reuse), white-label tenancy (each coach's client data siloed), and user expectation (a new product starts fresh). The cross-sell convenience of a shared profile loses to these.

**Shared (identity layer):** `users` (login, name, email, billing/subscription). One account.

**Separate per domain/program (everything else):**
- **Intake / profile / assessment** — `assessments`, `assessment_scores`, `assessment_reports`, archetype: scoped per program. Each domain runs its own intake; nothing is reused across domains by default. *(Build: tag these with `program_id`; reads scoped by program.)*
- **Coaching data** — `messages`, `conversation_summaries`, `commitments`, `coach_profiles`, and long-term `memory_facts`: scoped per program/engagement.

**Status:** the *conversation thread + short-term memory* slice is DONE (PA5 conversation-scoping, 2026-06-24 — `messages` carry `engagement_id`; the assembler scopes recent-message context). **Still TODO (Sprint 3 epic):** scope `assessments`/`assessment_reports` and long-term `memory_facts`/`coach_profiles` by program + backfill existing rows. See [PLATFORM_SPRINT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/PLATFORM_SPRINT.md) "Per-domain data isolation."

> **Implication:** the coach runtime + intake flow take a **program scope** that bounds *all* per-user data they read/write. Identity is the only cross-domain layer.

---

## 4. Host → brand resolution (the entry point)

A domain is just an input. `src/middleware.ts` (already on every request) gains a resolver **before** `updateSession()`:

```ts
// pseudocode — proposal, not applied
export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";        // relatti.com, careercoach.com, staging.…
  const brand = resolveBrand(host);                   // { workspaceSlug, programSlug, themeId, surfaceId }
  const res = await updateSession(req);               // existing Supabase auth refresh
  res.headers.set("x-brand", brand.id);               // hand brand to layouts/server components
  return res;
}
```

- `resolveBrand(host)` reads a **domain→brand map** (config/DB-backed; `entry_segment.domain` already exists). Unknown host → default brand (MasteryTV) or 404 per policy.
- Server layouts read `x-brand` (or a typed `getBrand()` helper) to choose theme, surface, enabled modules, copy, and the program to load.
- **Marketing slugs** (`/couples`, `/laidoff`) map to `entry_segment` rows → program + coach framing + content. Adding a funnel = a row, not a deploy.

Vercel: attach all custom domains to the one `mastery-tv` project. No new Vercel/Supabase project per brand.

> **🔴 Gotcha — page metadata does NOT follow the brand automatically (hit live 2026-07-14).** Next merges metadata per top-level key, so any page exporting a bare `{ title }` inherits the root layout's Mastery Coach `openGraph` + `icons` wholesale — and link-preview crawlers (iMessage/Slack) never run the client-side brand script that swaps favicons in the browser. relatti.com links previewed with the MasteryTV icon and title until every page went through `src/lib/platform/brand-metadata.ts`. Rule + patterns + crawler-style verification: **BRAND.md §15** (mandatory for every new page).

---

## 5. Theme layer = the white-label mechanism (decision P4)

Token-based theming over **one** design system (BRAND.md). Brands look distinct, share DNA.

- Today `globals.css @theme` hardcodes one ramp. **Proposal:** define brand token sets and switch via a `data-theme="relatti"` attribute on `<html>` (set from the resolved brand), each overriding the semantic CSS vars (`--color-primary`, brand ramp, fonts, radius). Components keep using BRAND.md tokens — only the *values* change per brand.
- **White-label (Stage 3) falls out for free:** a coach's brand is just another theme token set, loaded dynamically from their `workspace` row instead of a static map. Because every component already consumes tokens (BRAND.md mandate), no component changes — this is precisely why themed-variations was chosen over bespoke-per-brand.
- Per-brand assets (logo, OG images, copy) come from the brand/program config, not hardcoded.

---

## 6. Surface registry — pluggable primary screens (decision P3)

The logged-in experience is **not** one fixed shell. Each program can register its own **surface** (primary screen); the default is the shared coach-chat shell.

```ts
// pseudocode — proposal
type Surface = {
  id: string;                       // 'coach_chat' | 'relationship_dyad' | 'career_tracker' | …
  resolveEngagement(user): Engagement | null;
  Component: React.FC<SurfaceProps>; // the main logged-in screen
};
const SURFACES = registry<Surface>();   // programs reference a surface id in config
```

- **MasteryTV** → `coach_chat` (the default shell: chat + the modules it enables).
- **Relatti** → `relationship_dyad` (partner presence, Blueprint panel, dyad-aware chat). This is sprint epic **E12**.
- **Career** → `career_tracker` (job-search/deadline surface) — designed-for, built later.
- **Athletes / Profound** → their own surfaces when built.

Surfaces compose the same **shared chrome** (nav, profile menu, settings) and shared **modules**; they differ only in the *primary* workspace. A surface that needs nothing special just uses `coach_chat`.

---

## 7. Module registry — toggleable capabilities (decision via the matrix)

Features are **self-contained modules** gated by `program.config.modules`, not hardcoded routes. This is the discipline that keeps "one app" from rotting into `if (brand === …)` spaghetti.

```jsonc
// program.config.modules (proposal) — Relatti example
{
  "assessment": true, "coach": true, "report": true,
  "partner_invite": true, "dyad_compatibility": true, "blueprint": true,
  "commitments": false, "progress": false, "coaching_letters": false,
  "billing_model": "dual_seat_couple"
}
```

- Routes/nav/coach-layers check the active program's module flags. `dashboard/commitments` etc. render only when enabled.
- New capability = a new module + a flag, available to every vertical that wants it.
- The coach prompt-assembler already does a version of this (Decoded layer, dyad layer behind a flag) — generalize it to read the program's module set.

### 7.1 The vertical matrix (config, not code)

| Capability | MasteryTV | Relatti | CareerCoach | (future) |
|:--|:--|:--|:--|:--|
| Register / login / profile | ✓ | ✓ | ✓ (company-link) | ✓ |
| AI coach + memory (scoped) | ✓ | ✓ | ✓ | ✓ |
| Assessment / intake | full | shorter, relationship | career battery | per-vertical |
| Personality report | ✓ | relationship-framed | career-framed | ✓ |
| Invite + share results | ✓ | ✓ (partner) | — (company assigns) | config |
| Dyad / partner-aware coach | — | ✓ | — | — |
| Compatibility / Blueprint | — | ✓ | — | — |
| Commitments / progress / letters | ✓ | ✗ | design later | config |
| Billing model | individual | dual-seat couple | company / cohort | config |
| Data isolation | self | dyad (no cross-share) | cohort (+ employer aggregate) | config |

---

## 8. Schema refinements needed (proposals — not applied)

The DB spine is mostly ready; the platform needs small, additive changes:

1. **Widen `program.kind`** (decision P5). Today `CHECK (kind IN ('relationship','career','white_label_vertical'))` — too narrow for `general`, `sport_mindset`, `transformational`, etc. **DECIDED (founder, 2026-06-22): leave it open** — drop the fixed CHECK and use an open `vertical` slug (with a documented list maintained in this doc, not enforced in the DB), so any new vertical is a config row, never a schema change. No artificial cap on programs. (Owners/tenants — the `workspace` table — are already open: unlimited rows, which is what enables white-label.) Additive; existing rows unaffected.
2. **Brand/theme storage.** Add a `brand` concept (a `brand` table, or `program.config.theme` + `program.config.domains[]`) mapping domains → theme tokens + copy refs. `entry_segment.domain` already exists and can seed the domain→program map.
3. **Module flags.** Formalize `program.config.modules` (above) as the source of truth read by both frontend and the coach runtime.
4. **Coach scope.** The coach runtime/prompt-assembler gains a `programId`/`engagementId` scope that bounds coaching-context loading (per §3). No schema change — the `engagement_id` columns already exist.
5. **Billing topologies.** Three payer models — individual (existing `users.stripe_*`), dual-seat couple (engagement-level sub, RELATIONSHIP_ARCHITECTURE.md §6.4), company/cohort (payer = workspace/cohort, seats = participants via `accountability_link` `stake_type='cohort'`). Design now, build per-vertical.

---

## 9. Migration path (current fragmented app → platform)

Additive and ordered so nothing breaks:

1. **Consolidate the app tree (P6 / sprint E13).** Pick the canonical tree (`/dashboard`), delete the duplicate `/coachapp` and dead `landing-noir*` variants. One surface to evolve.
2. **Add the host→brand resolver** in `middleware.ts` + a typed `getBrand()` helper; default everything to the MasteryTV brand (zero behavior change until a second brand's tokens exist).
3. **Tokenize theming.** Extract the current hardcoded `@theme` into a `masterytv` token set; add a `relatti` token set; switch via `data-theme`. (BRAND.md-compliant.)
4. **Gate the modules.** Wrap `commitments`/`progress`/`coaching-letter`/`compatibility` route + nav rendering in module-flag checks reading the active program. MasteryTV = all on (unchanged); Relatti = the relationship set.
5. **Introduce the surface registry.** Default `coach_chat`; build the Relatti `relationship_dyad` surface (sprint E12) reading the live dyad spine.
6. **Scope the coach** to program/engagement (per §3) so cross-vertical accounts keep coaching contexts separate.
7. **Relatti landing + funnels** (sprint E11) under the Relatti brand/domain, `entry_segment`-driven.

> Steps 1–4 are pure platform groundwork (low risk, default-to-current). 5–7 are the Relatti build (which the live spine already backs). Career/white-label/future verticals add no new step — they reuse this machinery as config.

---

## 10. What to build now vs. defer

- **Build now (Stage 1 / Relatti):** app-tree consolidation, host→brand resolver, theming tokens (masterytv + relatti), module gating, the `relationship_dyad` surface, coach program-scoping, Relatti landing/funnels.
- **Designed-for, deferred:** career `career_tracker` surface + cohort/company billing; white-label dynamic per-workspace theming + workspace-scoped admin/RLS; future verticals (athletes, profound) as new programs+surfaces+themes.
- **Do NOT build:** any vertical beyond Relatti's UI; multi-tenant RLS enforcement (the `workspace_id` columns exist; enforcement is Stage 3).

---

## 11. ADRs (proposed)

- **ADR-P01 — One modular platform app, many domains.** Verticals are configuration over a shared core, not separate codebases. *Rationale:* the only model that scales to "many verticals, 1–2 devs + AI"; white-label makes per-brand codebases impossible anyway.
- **ADR-P02 — One identity, full per-domain data isolation** *(revised 2026-06-24; supersedes the original "shared profile" form).* One account (identity/billing) spans products; **intake, profile/assessment, memory, and coaching are all scoped per domain/program** — each domain is its own world on a shared database. *Rationale:* privacy (intimate Relatti data never near career/employer coaching), purpose-built per-vertical intake, white-label tenant siloing, and user expectation of a fresh start; the batteries differ enough that a shared profile bought little. Conversation + short-term-memory scoping shipped; profile + long-term-memory scoping is a Sprint-3 epic.
- **ADR-P03 — Pluggable surfaces.** Verticals register a primary screen; default = coach-chat. *Rationale:* founder confirmed some verticals need bespoke main screens; avoids both a rigid single shell and N forks.
- **ADR-P04 — Token-based theming = white-label.** One design system, per-brand token sets. *Rationale:* brands stay distinct yet cheap; the same mechanism powers Stage-3 white-label with no component changes.
- **ADR-P05 — Capabilities are config-gated modules.** Features toggle via `program.config.modules`. *Rationale:* the discipline that keeps one codebase from rotting; makes the vertical matrix declarative.
- **ADR-P06 — Open `program` vertical, not a fixed enum.** *Rationale:* the roadmap has an open-ended list of verticals (athletes, profound, …).

---

## 12. Gate 2 checklist (BMAD)

- [x] Architecture pattern selected with rationale — §2 five-layer model, §0 modular-platform decision.
- [x] Identity & data-isolation model defined — §3.
- [x] Frontend resolution + theming + surface/module registries defined — §4–§7.
- [x] Schema refinements identified — §8 (all additive).
- [x] Migration path from current app defined — §9.
- [x] Build-now vs. deferred bounded — §10.
- [x] **Founder approval of this architecture (Gate 2).** ✅ June 22, 2026.

> **Next:** [PLATFORM_SPRINT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/PLATFORM_SPRINT.md) (Phase 3) sequences §9 — consolidation → resolver → theming → module gating → Relatti surface/landing — interleaved with the remaining Relatti epics (E5–E13) in RELATIONSHIP_SPRINT.md. **Gate 3 requires founder approval before build.**
