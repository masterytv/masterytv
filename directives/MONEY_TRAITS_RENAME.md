# MONEY_TRAITS_RENAME — MoneyMaps → **MoneyTraits**

> **Founder decision (2026-07-20):** "MoneyMaps" is someone else's registered trademark and confusable. The money vertical's public brand becomes **MoneyTraits**, on **moneytraits.com** (registered, researched, defensible). This supersedes the interim "locked mechanic name Money Maps" and the Momatti candidate everywhere.
>
> ## ✅ Status: EXECUTED on `staging` (2026-07-20) — Phases P1–P5 done, P6–P8 pending founder
>
> Everything in §2 was applied and gate-verified the same day (founder "Approved" + delivered the Cowork homepage copy; moneytraits.com already in Vercel + Supabase Auth). **Execution deviations from the plan as written:**
> 1. **Wordmark is ONE word, "MoneyTraits"** (per the approved Cowork deck's nav/footer lockup, matching the MasteryTV/Relatti house style) — not the two-word "Money Traits" this doc drafted. A flip to the spaced form is one mechanical sweep if the founder prefers it.
> 2. **Mechanic noun:** Map→**trait** implemented per §6.1 (lowercase "trait(s)"; the artifact is "your trait profile"; report kickers now "The mix" / "The quiet trait" / "Where the report ends"; prompts say "the four traits: GUARD, DRIVE, MIRROR, SHADOW").
> 3. **The homepage was REPLACED with the Cowork deck verbatim** (`MoneyLanding.tsx` + page metadata). ⚠️ **OPEN COPY CALL:** the deck says "**The leak**" on the profile cards and in the payoff section, while the in-product card/report/coach say "**the Challenge**" (the 2026-07-20 Challenge rename). Shipped as approved; founder to pick one register and we align the other side (one-line change either way).
> 4. **"The Money Tell" LP is NOT built yet** — its copy hasn't been handed off. Proposed route `/tell` stands.
> 5. Docs: brand name swept in active directives; their historical "Map" construct language is kept under 🏷️ rename banners (MONEY_EXPERIENCE.md, MONEY_TRAITS_INSTRUMENT.md); Momatti lines marked resolved-in-place rather than deleted. The applied migration file and `directives/archive/` were left untouched.
> 6. Acceptance verified: full `npm run gate` GREEN (typecheck · 313 tests · safety · isolation · metadata · colors · brand-tokens · ternaries · tenancy · resolve 13/13 · snapshot **5/5 byte-identical with ONLY `money.golden.txt` moved**, diff naming-only); scorer 7/7; crawler-style curl on /money · /login · /privacy · /terms · /disclaimer shows MoneyTraits titles/og/site_name/icons and **zero** "Money Maps"; landing visually verified in BOTH themes at `?brand=money`.
>
> **Still pending (in order):** P6 founder push of `staging` → Vercel builds staging.moneytraits.com → founder merges staging→main (rides with the queued long-form-report merge) → P7 edge redeploys (`coach`, `send-email`, `money-generate-report` plain; `email-inbound`, `telegram-webhook` `--no-verify-jwt`; all `cron-*` — `_shared/` changed) + probes → P8 §5.4 cutover verification on https://moneytraits.com (brand/favicon, magic-link round-trip, **coach chat = the CORS proof**, report + OG, emails as "MoneyTraits") → later §5.7 (301 the old subdomain) + §5.6 (Resend mail.moneytraits.com, optional).
>
> The rest of this doc is the original inventory/SOP, kept as the correct-course record for the mid-build brand change.

---

## 1. The naming contract

### 1.1 What changes (the display layer)

| Old | New |
|---|---|
| "Money Maps" / "Money Maps™" / "MoneyMaps" (any user-visible text) | "Money Traits" / "Money Traits™" |
| Mechanic noun: "Map(s)" as the name of the 4 dimensions; "your Money Map" as the artifact | "Trait(s)"; "your Money Traits profile" (see §6.1 — recommended, founder to confirm) |
| Canonical origin `https://moneymaps.masterytv.com` | `https://moneytraits.com` (+ `www.moneytraits.com`, `staging.moneytraits.com`) |
| Email display name "Money Maps" / "Money Maps Coach" | "Money Traits" / "Money Traits Coach" (envelope domain unchanged — §2.3) |

Unchanged vocabulary: **GUARD / DRIVE / MIRROR / SHADOW** (our construct names), **the Fear** (ex-LEAP display), **"Challenge"**, archetype names, the Decision Room, emerald palette.

### 1.2 What must NEVER change (storage + code contracts)

Renaming any of these breaks stored data or the edge/src lockstep. Same rule as the Leak→Challenge rename: **storage keys unchanged.**

| Locked identifier | Where | Why |
|---|---|---|
| brand/program slug `money`, `?brand=money` | everywhere (spine, ProgramId unions, EDGE_BRANDS) | DB values + typed axis |
| instrument id **`money_maps`** | [instruments/money-maps.ts:35](../src/lib/decoded/instruments/money-maps.ts) | **JSONB key in `assessment_progress.responses`** — rename invalidates every stored money assessment |
| **`sections.money_map`**, `sections.money_narrative` | assessment_reports JSONB | T2 read contract; edge twin `money-map-profile.ts` + `loadMyMoneyMap` read it |
| `money_decisions` table, `context=money_decision` | Decision Room spine | DB schema + API contract |
| `generation_model: 'money-maps-scorer'` | report rows | historical marker; keep for old AND new rows |
| CSS prefix `mm-card*` | money-map-card.css | internal |
| TS types/fns `MoneyMap`, `StoredMoneyMap`, `scoreMoneyMaps`, `toStoredMoneyMap`, `loadMyMoneyMap` | src + edge twin | internal; renaming risks src↔edge lockstep drift |
| File names `money-maps.ts`, `money-maps.test.ts`, `money-map-card*`, `MoneyMapCard.tsx`, `MoneyMapsRadar.tsx`, `load-my-money-map.ts`, `money-map-profile.ts`, `money-maps-scoring.mjs`, `money.golden.txt` | src / edge / scripts | pure churn + spec-lock references; optional cosmetic sweep LATER in its own commit, never mixed into this one |
| Edge fn deployed name `money-generate-report` | Supabase | no brand word in it |

**Two exceptions (do rename):**
- `directives/MONEY_TRAITS_INSTRUMENT.md` → `MONEY_TRAITS_INSTRUMENT.md`, then sweep the ~8 code-comment references (`rg -n 'MONEY_MAPS_INSTRUMENT'`).
- The comment at [instruments/money-maps.ts:16](../src/lib/decoded/instruments/money-maps.ts) claiming *"Money Maps™" is our mark* — now false and legally hazardous; rewrite wherever the sweep hits a ™-claim comment.

### 1.3 Acceptance gate (post-condition)

After execution, `rg -n 'Money ?Maps' src supabase scripts` (case-sensitive, catches "Money Maps" + "MoneyMaps") must return **zero** hits. `rg -in 'money[\s]?maps?'` may still hit only the locked identifiers in §1.2 (underscore/hyphen/camel forms) and historical notes in docs. Also: `rg -n 'Momatti'` → zero outside `archive/` and this file.

---

## 2. Inventory (swept 2026-07-20; line numbers will drift — re-grep at execution)

### 2.1 Brand registries & host plumbing — do FIRST, in lockstep pairs

| File | What changes |
|---|---|
| [src/lib/platform/brand.ts:85-102](../src/lib/platform/brand.ts) | `name: "Money Traits"`; `domains: ["moneytraits.com", "www.moneytraits.com", "staging.moneytraits.com", "moneymaps.masterytv.com", "staging.moneymaps.masterytv.com"]` (old hosts stay as aliases until cutover — §5.4); rewrite the founder-pin comment (decision now made) |
| [src/lib/platform/brand-metadata.ts:47-76](../src/lib/platform/brand-metadata.ts) | `SITE_NAME.money`, `TITLE_SUFFIX.money` → "Money Traits"; `BRAND_ORIGINS.money` → `https://moneytraits.com`; drop Momatti comment |
| [src/lib/platform/legal.ts:59-70](../src/lib/platform/legal.ts) | `product: "Money Traits"`, `site: "moneytraits.com"` |
| [src/app/layout.tsx:97](../src/app/layout.tsx) | inline head script `moneyHost` check — add the 3 new hosts, keep old two. ⚠️ **This is a TEMPLATE LITERAL** (ORIENT §7 gotcha): plain string compares only, no regex, don't touch Next-managed head nodes |
| [supabase/functions/_shared/brands.ts:52-64](../supabase/functions/_shared/brands.ts) | `origin: "https://moneytraits.com"`, `coachName: "Money Traits"`, `replyToOverride: "Money Traits Coach <coach@mail.masterytv.com>"` |
| [supabase/functions/_shared/cors.ts:16-22](../supabase/functions/_shared/cors.ts) | ADD `https://moneytraits.com`, `https://www.moneytraits.com`, `https://staging.moneytraits.com`; KEEP the two moneymaps origins until cutover. **If this is missed, coach chat dies on the new domain with CORS errors** |
| [supabase/functions/send-email/index.ts:79-96](../supabase/functions/send-email/index.ts) | brand block name/from/fallbackFrom → "Money Traits"; host match becomes `h.includes("moneymaps") \|\| h.includes("moneytraits")` (must still beat the masterytv default) |
| [supabase/functions/_shared/resend.ts:19-56,297-304](../supabase/functions/_shared/resend.ts) | COACH_IDENTITY → "Money Traits Coach <coach@mail.masterytv.com>" (both preferred + shared); brand `name`/`origin`; footer "Money Traits by MasteryTV · …" |
| [supabase/functions/_shared/resolve-program.ts:27,103](../supabase/functions/_shared/resolve-program.ts) | comments only (host references) |
| [src/lib/platform/modules.ts:30](../src/lib/platform/modules.ts), [src/app/globals.css:179](../src/app/globals.css) | comments only |

### 2.2 Pages / UI copy

| Surface | File(s) | Strings |
|---|---|---|
| Landing (→ superseded by Cowork home, §3) | [src/app/money/page.tsx:19](../src/app/money/page.tsx), [MoneyLanding.tsx](../src/app/money/MoneyLanding.tsx):70,79,88,237,247 | page `title`, header wordmark, "Money Maps™" eyebrow, body copy, footer wordmark + disclaimer |
| Dashboard | [MoneyDashboard.tsx](../src/app/dashboard/MoneyDashboard.tsx):145-191 | "Take Money Maps" CTA, "It starts with Money Maps —", "Money Maps™ · Decision Room", "your whole Money Map" |
| Dashboard metadata | [dashboard/page.tsx:24,31](../src/app/dashboard/page.tsx) | title "Dashboard — Money Maps", description "Your Money Map, decisions…" |
| Chat | [dashboard/chat/page.tsx](../src/app/dashboard/chat/page.tsx):212,273 | share-level label "Money Map"; **auto-sent reveal message "I just finished Money Maps. What do you see?"** |
| Sidebar lockup | [sidebar.tsx:96](../src/components/dashboard/sidebar.tsx) | label "Money Maps" (Compass mark stays — §6.2) |
| Assessment | [assess/page.tsx:14](../src/app/assess/page.tsx), [AssessmentEngine.tsx](../src/app/decoded/assess/AssessmentEngine.tsx):189-207 | tab title; intro "the Money Map shows you…", share subtitle, `startLabel: "Start My Money Map"`, consent line "I understand Money Maps is coaching…" |
| Instrument display fields | [instruments/money-maps.ts:36-37](../src/lib/decoded/instruments/money-maps.ts) | `name` + `shortName` → "Money Traits" (**`id: "money_maps"` untouched**) |
| Completion | [completion-destination.ts:61-62](../src/lib/decoded/completion-destination.ts) | cta "See my Money Map", ready "Your Money Maps report is ready." |
| Report | [report/[id]/page.tsx:43-52](../src/app/report/[id]/page.tsx), [MoneyReport.tsx](../src/app/report/[id]/MoneyReport.tsx):192,356,497 | metadata title/description/OG alt; "Money Maps™ · Personal report", "{archetype} · Money Maps™", footer disclaimer |
| Archetype card | [MoneyMapCard.tsx](../src/components/money/MoneyMapCard.tsx):28,31,59 | aria-label "Your Money Map", "Money Maps™" chip, footer "built on the science of money beliefs · Money Maps" |
| Compatibility | [dashboard/compatibility/page.tsx:15](../src/app/dashboard/compatibility/page.tsx) | title "Comparison — Money Maps" |
| Login | [login/page.tsx:13](../src/app/login/page.tsx) | title "Sign in — Money Maps" |
| Admin | [admin/crisis/page.tsx:36](../src/app/admin/crisis/page.tsx) | program label "Money Maps" |
| Legal content | [MoneyPrivacy.tsx](../src/app/(legal)/_content/MoneyPrivacy.tsx):41-89, MoneyTerms.tsx, MoneyDisclaimer.tsx | "Your Money Maps responses", "your Money Map" ×3, header comments |
| OG card renderer | [api/og/route.tsx:63-67](../src/app/api/og/route.tsx) | `name: "Money Traits"`, `domain: "moneytraits.com"` (dynamic — no image assets to regenerate) |

### 2.3 Emails (display name only; envelope domain is a founder decision, §5.6)

- [src/lib/decoded/invite-email.ts:151-188](../src/lib/decoded/invite-email.ts) — from/fallbackFrom display "Money Traits <donotreply@mail.masterytv.com>", subjects ("…wants to compare Money Maps with you" ×3), intros, benefit line "Your Money Map — the archetype…", CTAs ("Take Money Maps", "Finish your Money Map"), footer "Money Maps · The psychology under your money decisions", completion notice "just finished their Money Map".
- Edge side: `send-email` + `_shared/resend.ts` per §2.1. Founder decision 2026-07-19 stands: money mail sends from the shared `mail.masterytv.com` domain until `mail.moneytraits.com` is verified in Resend (§5.6).

### 2.4 LLM prompts — these make the *model* say the name (redeploys required, §4 P5)

| File | What |
|---|---|
| [_shared/packs/money-pack.ts](../supabase/functions/_shared/packs/money-pack.ts):52-71 | persona: "Hold their Money Map as a HYPOTHESIS", "THE REVEAL — YOUR FIRST MESSAGE OFF THE MONEY MAP", "just finished Money Maps™" |
| [_shared/money-map-profile.ts:113-116](../supabase/functions/_shared/money-map-profile.ts) | Layer 4.5 header `MONEY MAP PROFILE (their Money Maps™ result…)` → `MONEY TRAITS PROFILE …`; "This user just completed Money Maps™" |
| [coach/index.ts:326-331](../supabase/functions/coach/index.ts) | Decision Room instruction: "Apply their WHOLE Money Map profile", "Name which Maps and overclocks are actually in play" → Traits |
| [money-generate-report/index.ts](../supabase/functions/money-generate-report/index.ts):198,274,344 | narrative writer: "THEIR MONEY MAP (scored 1–6…)", "You are the profile writer for Money Maps™…", "Write their Money Maps™ report now" |

### 2.5 Tests / fixtures / goldens (keep CI byte-exact)

- [scripts/coach-lab/prompt-fixtures.ts:542-743](../scripts/coach-lab/prompt-fixtures.ts) — comments + the assertion expecting the `"MONEY MAP PROFILE"` layer marker → update to the new header.
- [scripts/coach-lab/goldens/money.golden.txt](../scripts/coach-lab/goldens/money.golden.txt) — **regenerate** via the coach-lab snapshot script after pack/profile edits (snapshot gate must be 5/5 again, and the diff should show ONLY naming lines).
- [scripts/coach-lab/resolve-program-check.ts:185](../scripts/coach-lab/resolve-program-check.ts) — comment only; re-run `check:resolve` (13 cases).
- [money-maps.test.ts](../src/lib/decoded/scoring/money-maps.test.ts) / [money-maps-scoring.mjs](../scripts/money-maps-scoring.mjs) — comments/titles only; scoring untouched; both must still pass unchanged numerically.

### 2.6 Assets

- `public/money/` (favicon-16/32, favicon.png, apple-touch-icon, icon-192/512, icon.svg) — the emerald **Compass** tile has no text baked in → **survives as-is**. The compass is a "Maps" metaphor, though; see §6.2.
- No other image/svg in the repo contains the wordmark (swept). OG cards are rendered dynamically by `/api/og`.

### 2.7 Docs / directives (self-anneal)

- Heavy: `MONEY_EXPERIENCE.md` (19 hits), `MONEY_TRAITS_INSTRUMENT.md` (8, + file rename), `MONEY_EXPERIENCE_NOTES.md` (8), `MONEY_BUILD_HANDOFF.md` (8), `PROACTIVE_CONTENT_PLAN.md` (4), `STRATEGY.md` (3 — Stage-2 row: name + domain columns).
- Purge "Momatti candidate" from: STRATEGY.md, brand.ts, brand-metadata.ts, MONEY_TRAITS_INSTRUMENT.md, MONEY_EXPERIENCE.md, MONEY_BUILD_HANDOFF.md.
- Do **not** touch `directives/archive/`, `logs/`, or git history.
- Update the `money-build-state` auto-memory when executed.

### 2.8 Database — audited 2026-07-20, **zero action needed**

| Table | Rows mentioning "money map" | Verdict |
|---|---|---|
| assessment_reports (incl. `money_narrative` texts) | **0** | LLM narratives don't literally say the name — nothing to regenerate |
| messages | 7 | historical founder-test chat (old reveals) — leave as history |
| scheduled_messages | 4 | **all `status=sent`** (07-20 test sends) — nothing pending will fire with the old name |
| memory_facts, conversation_summaries, coach_profiles, assessments, commitments, coaching_challenges, entry_segment, contact_events, onboarding_state | 0 | — |

No migrations. No schema changes. (JSON keys like `money_map` are locked identifiers, not display text.)

---

## 3. The Cowork pages (new home + "The Money Tell")

Built by Fable 5 in Claude Cowork, already voiced "Money Traits":
1. **Home page** — Money Traits, generic and credible → **replaces** [MoneyLanding.tsx](../src/app/money/MoneyLanding.tsx) (don't polish the old copy; the `8cf4de0` rewrite is superseded).
2. **"The Money Tell"** — male-focused, edge-leaning landing → new route; proposal: **`/tell`** on the money brand (served as `moneytraits.com/tell`), following the same host-gating pattern as the `/money` root route.

**Blocked on file handoff** (founder: export/download the two pages from Cowork and drop them in the repo, e.g. `handoff/cowork/`, or share the artifact links). Integration standards regardless of source: read `BRAND.md` first; convert to type-scale tokens + CSS custom props (Cowork output typically carries hardcoded hex — expect a compliance pass); Lucide icons only; metadata via `brand-metadata.ts` (§15 — never a bare title); `noindex: true` until go-public; CTAs land on the existing funnel (`/assess`, `/login`).

---

## 4. Execution plan (one staging PR; ~45 files; no migrations)

**P1 — Registries + hosts** (§2.1) — additive on hosts: new domains in, old domains kept. `tsc --noEmit`.
**P2 — Display strings** (§2.2, §2.3) — Money Maps → Money Traits everywhere user-visible, including the Map→Trait mechanic pass (§6.1).
**P3 — Prompts + fixtures** (§2.4, §2.5) — edit packs/profile/coach/report-writer, update fixture expectations, regenerate goldens, verify the golden diff is naming-only.
**P4 — Docs** (§2.7) + rename `MONEY_TRAITS_INSTRUMENT.md` + Momatti purge.
**P5 — Verify locally** — `npm run gate` (ternaries, tenancy, vitest, resolve 13/13, snapshot 5/5), then preview at `localhost:3000/?brand=money`: landing → assess intro/consent → dashboard door → card → report → chat reveal → login/compat titles → `/api/og` card text. Never `npm run build` while `next dev` runs.
**P6 — Ship code** — commit(s) on `staging`, push after founder OK; **founder merges staging→main** (rides with the pending long-form-report merge already queued for prod moneytraits UI).
**P7 — Edge deploys** (shared by prod+staging — prompts flip prod at deploy; fine, money is dark): `coach`, `send-email`, `money-generate-report` plain; `email-inbound`, `telegram-webhook` **`--no-verify-jwt`**; **all `cron-*` fns too** (`_shared/` changed — pg_cron gotcha). Probe each after deploy.
**P8 — Domain cutover verification** (after founder infra, §5): on `https://moneytraits.com` — brand resolves (emerald, favicon, data-brand), magic-link login round-trips, **coach chat works (CORS)**, report + OG render, invite email arrives as "Money Traits", `staging.moneytraits.com` mirrors. Then §5.7 (redirect the old subdomain).

Rollback: pure string/config commits — `git revert` + redeploy edge fns. Nothing destructive anywhere in this plan.

---

## 5. Founder / infra checklist (manual, in order)

1. **Vercel** (`mastery-tv` project): add domains `moneytraits.com`, `www.moneytraits.com` (redirect www→apex), and `staging.moneytraits.com` → assign to the `staging` branch (mirror of staging.relatti.com).
2. **DNS** (wherever moneytraits.com is registered): apex A/ALIAS + `www` CNAME + `staging` CNAME per the values Vercel shows on domain-add.
3. **Supabase Auth → URL Configuration**: add `https://moneytraits.com/**`, `https://www.moneytraits.com/**`, `https://staging.moneytraits.com/**` to Redirect URLs (magic-link login breaks on the new domain without this).
4. **Keep** `moneymaps.masterytv.com` + staging alias live through cutover (they stay in `domains[]`/CORS lists until §5.7).
5. **Cowork handoff**: export the two pages (§3) into the repo or share the artifacts.
6. **Resend (optional, later)**: verify `mail.moneytraits.com` on the shared account → then we flip `resend.ts`/`send-email` senders off the shared masterytv domain. Until then display-name-only ("Money Traits <donotreply@mail.masterytv.com>").
7. **After verified cutover**: 301 `moneymaps.masterytv.com` → `moneytraits.com` (Vercel redirect), then remove old hosts from `domains[]`/CORS/layout script in a cleanup commit. No SEO equity to migrate (always noindex).
8. **Go-public (separate, later)**: flip `noindex` on money pages, add moneytraits.com to robots `isProductionHost` + sitemap ([money/page.tsx:14-16](../src/app/money/page.tsx) note). Not part of this rename.
9. **Trademark hygiene**: the rename itself removes every "Money Maps™" claim (using ™ on someone else's registered mark is the worst spot to be in). Consider filing on **Money Traits**. Telegram: the shared bot carries no Money Maps naming in code — only rename in BotFather if you named it that there.

---

## 6. Open decisions (recommendations bolded — confirm before/at execution)

1. **Mechanic noun.** The 4 dimensions and the artifact were "Maps" ("your Money Map", "which Maps run hot"). **Recommended: Trait(s)** — "your Money Traits profile", "your dominant Trait", "which Traits are running hot / overclocked". Reads more psychology-native than Maps ever did, and any surviving "Map" usage keeps one foot on the infringing mark. GUARD/DRIVE/MIRROR/SHADOW/the Fear unchanged.
2. **The Compass mark** (sidebar, card, favicons — BRAND §14's endorsed pick) was chosen for the "Maps" metaphor. **Recommended: keep it for now** (abstract enough; zero work), revisit when the Cowork pages' design language lands.
3. **"The Money Tell" route**: **`/tell`** recommended; noindex until go-public like everything else.
4. **™ usage**: **keep ™ on Money Traits** (common-law claim; domain + research back defensibility).
