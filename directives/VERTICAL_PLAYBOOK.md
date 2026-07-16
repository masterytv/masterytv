# **Vertical Launch Playbook — The Standard Way to Build a New Domain**

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** June 26, 2026 · **Formalized (PV1.1):** July 15, 2026
> **Status:** ✅ **STANDARD** — the process (§2–§4) AND the mechanical launch checklist (§5). First application = the career vertical (PV1.3).
> **Why this exists:** Relatti taught us that a new vertical is **far more customized than "re-theme the engine"** — and that the engine has a long tail of brand-coupled machinery (metadata, proactive sends, coach packs, consent flows, admin views) where a new domain silently inherits the WRONG vertical's behavior unless every seam is checked. §5 is the accumulated list of those seams; almost every line exists because we shipped the bug once.

---

## 1. The core lesson

> **What's reusable is the *engine*. What's custom is the *experience* — and the experience is determined by research into how to psychologically move *that specific person in that specific situation*.**

We have strong **technical** multi-tenancy (one app → many domains, verticals-as-config; see `PLATFORM_ARCHITECTURE.md`). We did **not** yet have a standard for the **experience** side. This playbook adds it.

A vertical is **not** "Relatti with different colors." A relationship user, a laid-off career user, and a sport-mindset user need different *heroes*, *first moments*, *assessments*, *result structures*, and *coach voices*. Re-theming alone produces what Relatti became: a personality test wearing a relationship skin.

---

## 2. The standard sequence (insert Experience Discovery *before* build)

This extends the BMAD phases in `CLAUDE.md §8` with one **mandatory new phase** for any new vertical:

| Phase | Artifact | Purpose |
|:--|:--|:--|
| 0 — Discovery | `{VERTICAL}_DISCOVERY.md` | Market, competitor, willingness-to-pay, the external stake (retention thesis for this vertical). |
| **0.5 — Experience Discovery** ⭐ **(NEW, the gap Relatti exposed)** | **`{VERTICAL}_EXPERIENCE.md`** | **Research the psychology of moving *this* user, then spec the relationship-first/outcome-first experience: hero, journey, assessment, results, coach voice, retention mechanic, copy register.** |
| 1 — PRD | `{VERTICAL}_PRD.md` (or folded into Experience) | Features, scope, success criteria. |
| 2 — Architecture | reuse `PLATFORM_ARCHITECTURE.md` + a thin config delta | What config/modules/theme this vertical needs (mostly reuse). |
| 3 — Sprint | sprint epics | Build, sequenced. |
| 4 — Build | code | Implement against the experience spec, not the engine's defaults. |

**Gate 0.5 (advisory):** do not start building a vertical's surfaces until `{VERTICAL}_EXPERIENCE.md` exists and the founder has approved its reframe. Skipping it is *exactly* the cost we paid on Relatti.

---

## 3. What Experience Discovery (Phase 0.5) produces

`{VERTICAL}_EXPERIENCE.md` — model it on `RELATTI_EXPERIENCE.md` (the worked example). Required sections:

- **The reframe** — one sentence: who/what is the *hero* of this vertical, and what is demoted to an *instrument*. (Relatti: hero = the relationship; instrument = personality/attachment.)
- **The evidence base** — research the established science + validated digital-intervention findings for this domain (for relationships: Gottman/EFT/SDT/behavior-design + couples-app studies; for career: job-search psychology, identity/transition research, etc.). Cite sources.
- **Design principles** — the rubric every surface must satisfy.
- **The personalization model** — how the known profile (personality + the vertical's key dimension, e.g. attachment for relationships, RIASEC for career) **tunes the voice per person**. This is the platform's durable edge (we know who the user is; generic competitors don't).
- **Per-surface spec** — journey order, current→target for: marketing, signup, **assessment battery**, **the first result/report**, dashboard, **coach voice/first-message**, shared artifacts, the **retention mechanic**, email/SMS.
- **V1 scope + sequencing**, **open founder questions**, **doc map**.

### Experience Discovery checklist
- [ ] Domain psychology researched (what makes *this* user act / change / stay).
- [ ] Competitor experience teardown (their onboarding, first moment, retention mechanic).
- [ ] The **hero reframe** named and founder-approved.
- [ ] **Assessment battery** decided for this vertical (which instruments are decision-relevant — keep it short; see `STRATEGY.md`: the long test is a conversion tax).
- [ ] **Result/report structure** designed vertical-first (not the engine's default section order).
- [ ] **Coach voice + first message** specified for this vertical.
- [ ] **Retention mechanic** identified (the external stake → a concrete recurring behavior).
- [ ] **Per-person personalization** rules defined.
- [ ] Copy register chosen.

---

## 4. Reusable engine vs. per-vertical custom (set expectations)

| Layer | Reuse (config) | Expect to customize per vertical |
|:--|:--|:--|
| Identity / auth / billing plumbing | ✅ shared | seat model (solo vs dyad vs employer) |
| Assessment **engine** | ✅ shared | the **battery** + framing + the result structure |
| Report **generator** | ✅ shared | **section order, opener, voice, what's the hero** |
| Coach **engine** (memory, safety, channels) | ✅ shared | **first message, voice layer, retention behaviors** |
| Theme tokens / domains | ✅ config | brand spec |
| Dashboard shell / modules | ✅ config-gated | which modules, primary surface, copy |

> Rule of thumb from Relatti: **plumbing is ~80% reusable; the felt experience is ~80% custom.** Budget accordingly.

---

## 5. The Launch Checklist — every element a new domain must get right

> **How to use:** copy this section into the new vertical's sprint doc and check every box before public launch. Items marked 🔥 are there because **we shipped that exact bug on Relatti** — the reference says when. "Program" = the `program` slug; "brand" = the resolved brand id. The two are linked but not identical: program drives the coach/data, brand drives the visible skin.
>
> **The meta-rule, updated 2026-07-16 (tenancy T0–T7):** the engine no longer defaults silently on the program axis — most of the seams below now **fail loudly**. This checklist remains the map of WHAT to build; the compiler and gates are now the reminder that you haven't.

### 5.0 Step zero — the typed program axis (do this FIRST; most of §5 falls out of it)

- [ ] **Add the new program slug to BOTH `ProgramId` unions** — `src/lib/platform/brand.ts` AND `supabase/functions/_shared/packs/index.ts` (lockstep twins; edge can't import src). This is the single move that makes the rest mechanical: every `Record<ProgramId,…>` map (Coach Pack registry, `PROGRAM_MODULES`, `BATTERIES`), the `BRANDS` + `EDGE_BRANDS` registries, and every `byBrand({...})` call site become **compile errors** until the new vertical is handled. `normalizeProgram` **throws** at runtime on an unregistered program — a vertical without a pack is a visible error, not the executive coach in disguise.
- [ ] Follow the compile errors to completion, then let the gates sweep what types can't see: **`check:ternaries`** (no behavior ternaries on brand/program literals — write `byBrand()` / `brandForProgram()`, never `=== "newbrand" ?`), **`check:tenancy`** (any NEW table must be categorized in `scripts/check-tenancy.mjs`; no read of a program-scoped table may filter by `user_id` alone), plus the existing derived gates (`check:colors`, `check:brand-tokens`, `check:metadata`).
- [ ] **The seams that are STILL silent** (types and gates can't reach them — hand-check these): the `layout.tsx` inline head script (template literal, allowlisted in check:ternaries — extend its brand lists by hand), marketing/legal copy, email HTML + the OG image palette, DB **backfills** for pre-existing rows, cron *content* quality, and anything living in prod config rather than the repo (Resend domains, Vercel env, pg_cron).

### 5.1 Brand elements
- [ ] Read `BRAND.md` fully; tokens only, Lucide only, dual-theme, no sparkle (§14).
- [ ] `BRANDS` entry in `src/lib/platform/brand.ts` (host→brand map + programSlug) — middleware resolves brand from host; `?brand=` preview persists on localhost only.
- [ ] Theme token set: `data-brand="<id>"` values in `globals.css`. 🔥 Light-mode brand values need the **combined** `[data-brand="x"][data-theme="light"]` selector — the later `[data-theme="light"]` block wins at equal specificity (06-22).
- [ ] Icon/logo assets: favicon + apple-touch under `/public/<brand>/`; the `layout.tsx` inline head script is a **template literal** — regexes need `\\/`, and never remove Next-managed `<head>` nodes (🔥 silently killed brand/theme/favicon 06-22→07-02, and caused the two-click nav bug).
- [ ] Root landing rewrite for the new host (middleware `pathname === "/"` block) + the vertical's landing page(s).
- [ ] Chrome sweep: sidebar brand header/label, **tier labels** (🔥 plan names are per-brand product names — Relatti shows "Relatti Beta", 07-14), brand-only widgets (e.g. FeedbackWidget is Relatti-only), topbar badges.
- [ ] Email identity: Resend key env (`RESEND_API_KEY_<BRAND>`), verified from-domain (`mail.<domain>`), fallback sender, `INVITE_BRANDS` entry (subject/intro/CTA per variant), branded coaching-email chrome. 🔥 Proactive sends default to masterytv chrome when no brand is passed (07-15).

### 5.2 SEO / AEO elements
- [ ] **Every page sets metadata via `brand-metadata.ts`** (BRAND.md §15) — never a bare `title`; shared pages use `generateMetadata()` + `getBrand()`. Hard-gated by `scripts/check-brand-metadata.mjs`, but new-brand titles/og copy still need writing. 🔥 relatti.com previewed as "Mastery Coach" in iMessage (07-14).
- [ ] OG card: `OG_BRANDS` palette entry in `/api/og/route.tsx` + the mark copied into `src/app/api/og/assets/` (function-bundled — the edge runtime can't read `public/`).
- [ ] **Verify like a crawler, not a browser:** `curl -sL "<url>" | grep og:` per §15.3 — the client-side brand script masks exactly this bug class. iMessage caches previews per URL.
- [ ] `entry_segment` rows for the vertical's funnels (funnels are data, not hardcoded pages); marketing pages carry the beta/invite `?code=` ride-along if applicable.
- [ ] Answer-engine surfaces (the /science, /why-ai class of pages) rewritten for the vertical's claims — they cite the OTHER vertical's evidence otherwise.

### 5.3 Assessment elements
- [ ] Battery chosen in Phase 0.5 (decision-relevant instruments only — the long test is a conversion tax, `STRATEGY.md`); wired as the program's battery config.
- [ ] **Never change canonical item text** — it invalidates stored responses and forces retakes (`DECODED_SCORING.md`; audited 06-30). New instruments: canonical published wording only.
- [ ] Report structure vertical-first (section order, opener, the hero) — not the engine default; report generator voice per the Experience spec.
- [ ] Per-domain intake/profile isolation: **SHIPPED 2026-07-16** — `program` on `assessments`/`assessment_reports` (PC2.1), `decoded_invites` (PC2.1h — one broadcast link per user PER PROGRAM; an invite's program = the brand it was created on, immutable), and `memory_facts`/`coach_profiles`/`coach_profile_history` (PC2.2, incl. per-program `match_memory_facts`). A new program value rides all of it automatically; the tenancy gate blocks unscoped reads. What a new vertical still owes: its BATTERY entry (compile error) and a **backfill decision** if it inherits any pre-existing users.
- [ ] Report→spine sync + retake propagation verified for the new program (`syncMyReportToSpine` semantics).

### 5.4 Coach elements
- [ ] **A new Coach Pack file** (`_shared/packs/<vertical>-pack.ts`) + its `PACKS` registry entry (a `Record<ProgramId, CoachPack>` since 2026-07-16 — the missing entry is a compile error, and `normalizeProgram` throws rather than defaulting to the executive) — persona, layer recipe, guardrails, tools, model params, `recentMessageScope`. **Editing the orchestrator for a vertical behavior is a design smell.** Stance rule: one-question-at-a-time is coaching, not a vertical trait — verticals differ in what the coach KNOWS and how fast it moves to action (PC3).
- [ ] Extraction taxonomy (`pack.extraction`): domain-shaped memory categories — 🔥 must stay within the live `memory_facts_category_check` constraint (extend it by migration; the committed baseline LACKS live CHECK constraints — query `pg_constraint` first, 07-14).
- [ ] Pack briefing section (`pack.briefing`) — proactive copy in the vertical's voice, or `enabled:false`. 🔥 The executive commitments/goals/wins template went to relationship users (07-15). **LOW-DISCLOSURE rule for sensitive verticals: briefings travel by email — never reference session content; subject = greeting only.**
- [ ] `resolve-program`: the new slug resolvable at every level (participant membership, validated hint, `users.signup_brand`) + **new cases added to `scripts/coach-lab/resolve-program-check.ts`**. 🔥 Unstamped users silently got the executive coach (PC4.4).
- [ ] **Prompt-snapshot golden for the new vertical** (scenario + fixtures in `scripts/coach-lab/prompt-fixtures.ts`) — and the other verticals' goldens stay byte-identical while you build. Fixture fakes must be **id-aware** where the code queries other users (🔥 unfiltered fixture arrays hand back the wrong row, 07-15).
- [ ] Multi-party context (dyad/cohort/coach-seat): names resolve from `users.name` — 🔥 never invited_email alone (the coach called the partner "Partner" and asked the user for the name, 07-15). **The coach must know everything the user can already see** (their report version, shared scores at the consented level) and its layer must SAY the data is already in context — 🔥 or the model roleplays "let me pull that up" and interrogates the user. Tool schemas must not require parameters that force the model to interrogate (lookup tools: optional name).
- [ ] Compatibility/artifact renderers are **shape-aware** — 🔥 a new report JSON shape rendered as just a headline because the digest only knew the old shape (07-15).
- [ ] Safety kernel: shared, never forked per vertical (deploy-level split deferred until vertical 3 — PC4.5); vertical-specific crisis patterns (E7-class) added to the shared kernel; **coach honesty script matches the real posture** (log-only: no "a team may review" claims anywhere).
- [ ] Model + cost: which provider the pack forces (Relatti lab: gpt-4o-mini = templated voice); `calculateCost` labeling; `metadata.program` stamped on messages AND `cost_tracking` by every writer (coach, channel-router, post-processor, embeddings, crons).
- [ ] Coach-lab battery for the new stance (exec-battery pattern): hard checks + judge rubric, 3× green before deploy.

### 5.5 Dashboard / surface elements
- [ ] `PROGRAM_MODULES` set for the new program (which modules exist) **AND `ROUTE_MODULES` guards** — 🔥 nav hiding alone is NOT brand isolation; a dual-brand user carries URLs across domains (07-15). Add both directions: the new vertical's pages guarded off other domains too.
- [ ] Bespoke primary surface registered (ADR-P03) — the dashboard home the Experience spec calls for, not a re-themed default.
- [ ] **`conversations.program` scoping on every conversation-adjacent read** — 🔥 engagement_id alone is not brand isolation; an executive conversation rendered on relatti.com (07-15). Direct `?c=` loads redirect cross-brand ids.
- [ ] Vertical-only chat widgets module-gated (🔥 the six executive coach voices rendered on relatti chat — `coach_voices` module, 07-15).
- [ ] Settings page: per-brand copy branches; briefing-time control only if the vertical has proactive touchpoints.

### 5.6 Consent / privacy / legal elements
- [ ] Legal docs brand-aware (`(legal)` route branches; new brand = new doc set) + **signup acceptance-gated** + `LEGAL_VERSION` recorded; /privacy §5-class copy must match the actual safety posture (screening is automated; no human-review claims).
- [ ] Data-sharing consent model for the vertical's multi-party shape: **connecting two existing members always requires the recipient's explicit Accept** (🔥 auto-connect shipped 07-15); invite emails context-aware (no account / account no report / account + report); revocation must be respected by every self-healing job (🔥 auto-full nulled `revoked_at`, silently undoing removals).
- [ ] Internal/founder notification emails are **event-only pointers** — never user responses, scores, quotes, or conversation content (92d221d rule).
- [ ] `delete-user-data` covers every new table; new tables carry `workspace_id` and attach to an `engagement` where relevant (the spine rule).
- [ ] LLM data handling: if the vertical adds a provider or key (`OPENAI_API_KEY_<BRAND>`), the no-train/retention position in `LLM_DATA_HANDLING.md` still holds.

### 5.7 Proactive / channel elements
- [ ] Proactive gate: **zero `role='user'` messages ⇒ nothing proactive** (no briefing, no meta check-in) — 🔥 assessment-only signups got unsolicited wrong-brand briefings at 8am (07-15).
- [ ] Per-user program→brand resolution on every proactive sender (briefings, accountability check-ins, scheduled sends) — the brand must be passed to `deliverProactiveMessage`, and the stored message stamped with `metadata.program` so replies thread to the right pack.
- [ ] Inbound email routing: reply-to points at an inbox that actually ingests (currently only `coach@mail.masterytv.com`); new-brand inbound = new Resend inbound config + `email-inbound` awareness.
- [ ] 🔥 Webhook-shaped functions deploy `--no-verify-jwt` (email-inbound/telegram-webhook/cron-*) — plain deploys die at the JWT gateway (inbound email was dead for months). **Redeploy every fn whose `_shared` imports changed** (deno info sweep) and probe after: POST-no-auth must return the fn's own error, not gateway JSON.
- [ ] Crons: brand-aware content (pack-authored), Vault-based auth (🔥 pg_cron silently dead 4/2–7/14), and fn bundles redeployed so they don't pin dead models.

### 5.8 Admin elements
- [ ] Nav scope: the vertical gets its own group in `AdminNav`; vertical-only tools carry `.ad-scope` banners; shared views gain the brand in their filter set (users chips, crisis flags, cost dashboard columns).
- [ ] `users.signup_brand` stamped for the new domain at auth (signUp metadata → `handle_new_user`; OAuth via `/auth/callback` host-stamp with the <15-min guard).
- [ ] Beta/cohort tooling scoped if the vertical runs one (Beta Cockpit is Relatti-only by banner).

### 5.9 Infra / DB elements
- [ ] DNS → the Vercel project; staging subdomain; edge-function CORS allows the new origin (🔥 per-vertical CORS gotcha).
- [ ] Per-vertical secrets set in Supabase edge (`supabase secrets set`) AND Vercel env.
- [ ] Migrations: **MCP `apply_migration` AND commit the file**; check live `pg_constraint` before touching status/category vocabularies (the 44-vs-7 history gap).
- [ ] New SECURITY DEFINER RPCs: `REVOKE ... FROM PUBLIC, anon` in the same migration (default PUBLIC grant is the leak vector — has leaked ≥3 fns); run the security advisors after DDL.
- [ ] Program seed row + module/battery config in the DB where applicable.

### 5.10 The launch verification sweep (do ALL of these, in this order)
1. `npm run gate` green (tsc · vitest · safety · isolation · `check:resolve` · goldens byte-identical for existing verticals · **`check:colors`** = no incumbent-brand color literal in any shared surface · **`check:brand-tokens`** = the new brand's `[data-brand]` block overrides the full identity token set in BOTH light and dark · **`check:ternaries`** = no behavior ternaries on brand/program literals · **`check:tenancy`** = new tables categorized, no `user_id`-only reads of program-scoped tables). If the new brand legitimately needs literal hex (email HTML, the OG image), allowlist those files in `scripts/check-brand-colors.mjs` — never the shared components.
2. **Dual-brand user pass:** one account on the new domain + an old one; carry every gated URL across domains both directions; open the coach on both — conversations, voice/widgets, tier labels, theme all isolated.
3. **Crawler pass:** `curl` og:title/site_name/icons on every shareable page of the new domain.
4. **Proactive pass:** a fresh assessment-only signup gets NOTHING at 8am; a coached user gets the new vertical's briefing voice from the new brand's from-domain.
5. **Consent pass (if multi-party):** invite a fresh email (classic flow) AND an existing member (request flow → Accept, Decline, Remove, re-invite); confirm no self-healing job resurrects anything.
6. **Coach context pass:** rebuild the new vertical's prompt against live/preview data (dyad-live pattern) — names, artifacts, scores all present; ask the coach for a number it has and one it doesn't.
7. Webhook probes + one real inbound email reply.
8. Founder walkthrough on the production domain before any public link goes out.

---

## 6. First application

**Next vertical (career — `mycareercoach.com` / similar): run Phase 0.5 BEFORE building any surfaces.** Produce `CAREER_EXPERIENCE.md` (hero = the job search / the deadline as the external stake; instruments = personality + RIASEC; research job-transition + motivation psychology). Tracked as **PV1.3**. Then run §5 as the build/launch checklist.

---

## 7. Doc map

- This playbook = the **process standard** (§2–§4) + the **mechanical launch checklist** (§5) for any vertical.
- Worked example = `RELATTI_EXPERIENCE.md`.
- Technical model it rides on = `PLATFORM_ARCHITECTURE.md` (5-layer verticals-as-config).
- Strategy context = `STRATEGY.md` (the relationship → career → white-label roadmap).
- The scars behind §5 = `logs/session_2026-07-*.md` + the `relatti-open-state` memory (each 🔥 links to a real incident).

> **Self-annealing rule:** every time a cross-vertical bug ships, its prevention gets ADDED to §5 in the same session as the fix. This list is only trustworthy if it's maintained at fix-time, not at launch-time.
