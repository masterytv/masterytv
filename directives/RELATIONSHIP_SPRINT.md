# **Sprint Plan — Relatti** (Relationship Coaching, Stage 1)

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** June 16, 2026
> **Status:** 🔄 DRAFT — BMAD Phase 3 (Sprint Planning). **Gate 3 needs founder approval before build.**
> **Parents:** [STRATEGY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/STRATEGY.md) · [RELATIONSHIP_PRD.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/RELATIONSHIP_PRD.md) · [RELATIONSHIP_ARCHITECTURE.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/RELATIONSHIP_ARCHITECTURE.md) ✅ **Gate 2 approved (June 16, 2026, all 6 decisions + 4 ADRs).**

---

## 0. How to read this

Epics are ordered by **dependency**, not priority — you can't cut over the coach before the spine exists. Each **story is ≤ 1 day** and carries explicit **Done** criteria. Tasks are the atomic steps inside a story. Stage-1 builds **only the relationship dyad**; spine columns for career/white-label exist but stay unused (per architecture ADR-R01/R03).

**Legend:** 🟥 blocking dependency · 🧪 has automated test · 🔒 touches RLS/consent (extra review) · 💵 external cost

---

## 1. The critical path (one glance)

```
E1 Spine DDL + RLS ──▶ E2 Backfill from decoded_invites ──▶ E3 Dual-write
        │                                                          │
        └──────────────────────────────────────────────▶ E4 Assembler cutover (dyad coach)
                                                                   │
                              ┌────────────────────────────────────┼───────────────┐
                              ▼                                    ▼               ▼
                    E5 Relationship Blueprint        E6 SMS + proactive       E7 Safety /
                    (engagement_artifact)            scheduler (shared dep)   DV screening 🔒
                              │                                    │
                              ▼                                    ▼
                    E8 Shared ritual / streak          E9 Fight De-Escalator mode
                              │
                              ▼
                    E10 Dual-seat billing (Stripe) 💵
```

**Sprint 1 = E1 → E2 → E3 → E4** (the spine + dyad coach). Everything else composes over it.

---

## 2. Environment & setup (do once, before Sprint 1)

| Item | Action | Done when |
|:--|:--|:--|
| Migrations are file-tracked | ✅ **DONE (June 16, 2026).** Remote history had **44 migrations; only 7 were committed as files.** Baseline snapshot of the full `public` schema (extensions, 41 tables, constraints, indexes, RLS + policies, functions, the `trg_sync_is_admin` trigger) reconstructed from the live catalog → [`supabase/migrations/20260616000000_baseline_pre_relatti.sql`](supabase/migrations/20260616000000_baseline_pre_relatti.sql). **Open follow-up:** confirm + recreate the `auth.users` → `handle_new_user()` trigger name (documented gap §8 of the baseline); pg_cron jobs + seed rows not captured. | ✅ Baseline file exists. |
| ~~Branch DB~~ / ~~local stack~~ → **built directly on cloud** | 💵 **Dev branches deferred (cost) AND local Docker skipped** (founder, June 16, 2026). E1+E2 were applied **directly to the cloud engine DB** (`masterytv-website`) via tracked MCP migrations after a clean read-only pre-flight (0 FK risk). Justified because the changes are additive + idempotent + reversible. The local stack + [fixture](supabase/fixtures/relatti_e2_test.sql) remain available for future re-verification but were not required. | ✅ Applied + verified on cloud (see E1/E2). |
| Feature flag | Add `RELATTI_DYAD_ENGINE` flag (env or `framework_config`) so E4 assembler cutover can ship dark and flip per-engagement. | Flag readable in edge functions. |
| SMS provider decision 💵 | Pick provider (Twilio vs. Telnyx vs. MessageBird) — **the one open cost item from Gate 2.** Needs founder sign-off on cost + a number. | Provider chosen, test number provisioned, secret in Supabase. |

> ⚠️ **Gate note (advisory):** SMS provider selection is the only Phase-2 deferred item. It blocks **E6 only**, not Sprint 1. Don't let it hold up the spine.

---

## 3. Epics → Stories

### E1 — Polymorphic spine DDL + RLS  🟥🔒  — ✅ APPLIED TO CLOUD (2026-06-16)
> Migration `20260616200420_relatti_spine_e1`. 7 spine tables + RLS + `is_engagement_participant()` live. Security advisor clean for the new objects (the one mutable-search_path finding was hardened in E2).
*Goal: the five spine tables + `engagement_artifact` + `entry_segment` exist with RLS, additively (zero downtime).*

| Story | Tasks | Done |
|:--|:--|:--|
| **E1.1** Create tenancy + program tables | `workspace`, `program` per architecture §5; seed `workspace='masterytv'`, `program='relationship'` (config.battery = the live instrument ids). | Tables exist; one workspace + one program row; FKs valid. |
| **E1.2** Create engagement + participant | `engagement`, `participant` with checks/uniques (`UNIQUE(engagement_id, role)`, claim-by-email check). | Tables exist; constraints reject a 3rd dyad participant. 🧪 |
| **E1.3** Create accountability_link + engagement_artifact + entry_segment | Per §5 sketch. | Tables exist; FKs valid. |
| **E1.4** Thread `engagement_id` onto existing tables | `ALTER TABLE` add nullable `engagement_id` to `decoded_invites`, `messages`, `commitments`, `scheduled_messages` (D4). | Columns added, nullable, FK to `engagement`; no existing row affected. |
| **E1.5** `is_engagement_participant()` + RLS policies 🔒 | Create the SECURITY DEFINER helper (§4.1); apply engagement-shared policies to new tables; admin read via `get_auth_user_role()`; participant pre-claim self-read. | `get_advisors(security)` clean; a non-participant cannot read an engagement; a participant can; pending partner finds own row by email. 🧪🔒 |
| **E1.6** `workspace_id` columns (no RLS enforcement yet) | Add `workspace_id NOT NULL DEFAULT <masterytv>` to new tables (already in §5); plan—but do **not** run—the batched backfill onto legacy user-data tables. | Every new table has `workspace_id` + index; legacy backfill scripted but unexecuted. |

**E1 exit:** all DDL applied on the **branch**, advisors clean, additive (prod untouched until E1+E2+E3 verified together).

---

### E2 — Backfill: promote `decoded_invites` → engagement/participant  🟥🧪  — ✅ APPLIED TO CLOUD (2026-06-16)
> Migrations `20260616200439_relatti_backfill_e2_fn` + `20260616200614_relatti_e2_harden_backfill_fn`. **Verified result:** 12 invites → 12 engagements (3 active, 9 forming), 24 participants (9 partner `invited` / 3 `active`), 12 partner-stakes, 3 Blueprints, 0 unpromoted. Idempotency confirmed (re-run = no change). `decoded_invites` originals untouched (non-destructive).
*Goal: every existing invite has a durable engagement. Idempotent, keyed on `source_invite_id` (ADR-R04).*

| Story | Tasks | Done |
|:--|:--|:--|
| **E2.1** Backfill function | Idempotent SQL/edge routine: per invite → 1 `engagement`, 2 `participant` (self/partner), 1 `accountability_link(stake_type='partner')`; status map `pending→forming`, `consented/connected→active`; copy `share_with_coach`→`participant.share_level`. | Re-running produces no duplicates; 12 invites → 12 engagements, 24 participants. 🧪 |
| **E2.2** Blueprint promotion (D6) | Copy `compatibility_report*` JSONB → `engagement_artifact(kind='relationship_blueprint')`. **Non-destructive** — originals stay. | Each connected/consented dyad has a blueprint artifact; source columns untouched. |
| **E2.3** Reconciliation report | Count parity check (invites vs engagements vs participants); list any orphans (e.g. invite with missing report). | Report shows 0 unexplained orphans; discrepancies documented. 🧪 |

**E2 exit:** branch DB fully backfilled + reconciled. **Then** apply E1+E2 to prod in one window.

---

### E3 — Dual-write the invite/consent flows  🟥  — 🟡 CODE COMPLETE, PENDING DEPLOY (2026-06-16)
*Goal: new invites & consent changes write **both** the invite row (unchanged) and engagement/participant rows, so the spine stays live going forward.*
> **DB live:** migration `20260616201208_relatti_e3_sync_invite_fn` — idempotent `relatti_sync_invite(invite_id)` (single source of truth; backfill refactored to reuse it). Re-syncing all 12 live invites holds at 12/24/12/3 (idempotent ✅).
> **App wired (typecheck clean, NOT yet deployed):** `src/lib/decoded/sync-engagement.ts` (service-role helper) called from 4 hooks — `api/decoded/invite` (create), `lib/decoded/claim-invites` (claim), `api/decoded/invite-consent` (consent + revoke), and the `decoded-compatibility-report` edge function (on `connected` → Blueprint). All non-fatal: a sync failure never breaks the user flow.
> **To go live:** deploy the Next.js app + `supabase functions deploy decoded-compatibility-report`.

| Story | Tasks | Done |
|:--|:--|:--|
| **E3.1** Invite-create dual-write | On invite send, also create `engagement(status=forming)` + self participant + pending partner participant. | New invite immediately has an engagement. 🧪 |
| **E3.2** Claim + consent dual-write 🔒 | On recipient claim → set partner `participant.user_id`, `status`; on consent change → update `participant.share_level` + `consented_at`/`revoked_at` + `accountability_link.status`. | Consent change reflected on participant within the same transaction. 🧪🔒 |
| **E3.3** Revocation path 🔒 | Revoke sets `participant.status='revoked'`, `share_level='none'`; assembler must immediately stop including that partner. | Revoked partner disappears from coach context on next message. 🧪🔒 |

---

### E4 — Dyad-aware coach (assembler cutover)  🟥🔒  — 🟡 CODE COMPLETE, PENDING DEPLOY (2026-06-16)
*Goal: evolve Layer 4.6 from `userId` fan-out → engagement-scoped dyad context with mediator stance. Ships behind `RELATTI_DYAD_ENGINE` flag.*
> New `supabase/functions/_shared/dyad-context.ts` (`resolveDyadContext` + `buildDyadCoachLayer` + `buildMediatorPersona`) reads the engagement spine, honouring partner `share_level` in code (ADR-R02). `prompt-assembler.ts` Layer 4.6 now prefers the spine when `RELATTI_DYAD_ENGINE=on`, else falls back to the legacy `decoded_invites` path; mediator persona injected as Layer 1.5; stake surfaced. **To activate:** set env `RELATTI_DYAD_ENGINE=on` + `supabase functions deploy coach`. (Deno typecheck not run locally — no `deno` installed; verify at deploy.)
Target: [`supabase/functions/_shared/prompt-assembler.ts`](supabase/functions/_shared/prompt-assembler.ts).

| Story | Tasks | Done |
|:--|:--|:--|
| **E4.1** Resolve engagement | Add optional `engagementId` param; else resolve user's active `relationship_dyad`. | Assembler can locate the dyad without scanning `decoded_invites`. 🧪 |
| **E4.2** Load both participants from spine | Replace invite fan-out with `participant` query (both profiles, roles, `share_level`, blueprint from `engagement_artifact`). | Layer 4.6 reads from spine, not invites; output identical-or-better for existing consented dyad. 🧪 |
| **E4.3** Consent enforcement parity 🔒 | Honour `share_level` exactly (`none`/`type_compatibility`/`full`) under service role (ADR-R02). Golden test: `none` leaks nothing, `type_compatibility` = archetype+headline only, `full` = full. | 🧪🔒 three-level golden test passes; no broadened RLS. |
| **E4.4** Mediator persona | New base-persona variant gated on `kind='relationship_dyad'`: even-handed, translates vs. takes sides, addressable by either partner. | Snapshot test of system prompt shows mediator block only for dyads. 🧪 |
| **E4.5** Stake-in-prompt | Inject `accountability_link` framing (the partner is the stake; lean on the shared ritual). | Prompt references the stake for active dyads. |
| **E4.6** Flag + cutover | Flip `RELATTI_DYAD_ENGINE` per-engagement; verify on the 1 connected dyad; then default-on. | Live connected dyad coached via spine; rollback = flip flag. 🧪 |

**E4 exit = Sprint 1 done.** The dyad coach runs on the spine. Retention experiment can begin once funnels exist.

---

### E5 — Relationship Blueprint (productised)  
*Goal: the shared compatibility output as a first-class, both-partners-readable artifact (PRD §5.3).*

| Story | Done |
|:--|:--|
| **E5.1** Read Blueprint from `engagement_artifact` (not invite JSONB) in app + coach. | UI + coach both source the artifact. |
| **E5.2** Reframe content to relationship language (attachment dynamics, "your loop", conflict pattern) — prompt/content work on `decoded-compatibility-report`. | New copy ships; old report still renders for legacy. 🧪 |
| **E5.3** Both-partner visibility via engagement RLS. 🔒 | Either participant can open the Blueprint; non-participants 403. 🧪🔒 |

---

### E6 — SMS channel + proactive scheduler (the shared dependency)  💵
*Goal: build the once-for-all-three-stages infra, **engagement-scoped** (STRATEGY §5). Blocked only by the provider decision in §2.*

| Story | Done |
|:--|:--|
| **E6.1** Add `'sms'` to `messages.channel`; provider client in `_shared`. 💵 | Outbound + inbound SMS round-trips to a test number. 🧪 |
| **E6.2** Scheduler worker drains `scheduled_messages` (cron/edge) honouring `engagement_id` + user timezone. | Due rows send once; retries on failure; `sent_at` set. 🧪 |
| **E6.3** "Us check-in" generator: weekly per-engagement ritual prompt to both partners. | A dyad receives a weekly check-in; opt-out respected. 🔒 |
| **E6.4** Consent/STOP compliance for SMS. 🔒💵 | STOP unsubscribes; logged; no further sends. 🧪🔒 |

---

### E7 — Safety: relationship-abuse / coercive-control screening  🔒
*Goal: duty of care (PRD §10) — detect abuse disclosures, route to human resources, **never mediate** an abusive dynamic. Extends existing crisis system.*

| Story | Done |
|:--|:--|
| **E7.1** Extend `buildSafetyGuardrails()` + crisis detection with DV/coercive-control patterns → `crisis_flags`. 🔒 | Test disclosures flag + surface resources; coach refuses to mediate. 🧪🔒 |
| **E7.2** Escalation copy + resource routing (hotlines) in dyad context. | Escalation path documented in `COACHING_GUARDRAILS.md` and live. |

> Sequenced early-parallel with E5/E6 — **do not launch funnels (GTM) before E7 ships.**

---

### E8 — Shared ritual / streak (the partner-as-nudge)  
*Goal: visible shared progress both partners see (PRD §7).*

| Story | Done |
|:--|:--|
| **E8.1** Streak/ritual state on `engagement_artifact` (or thin `engagement_ritual` table), engagement-scoped. | Both partners see the same streak. 🔒 |
| **E8.2** "Your partner just reflected on X" nudge (fires via E6 scheduler). | Nudge delivered when one partner acts. 🧪 |

---

### E9 — Fight De-Escalator coach mode  
*Goal: in-the-moment mode (PRD §5.6) — open mid-conflict → regulated next step / "translate before you send."*

| Story | Done |
|:--|:--|
| **E9.1** Coach mode param + persona overlay (de-escalation, regulation-first). | Mode switch changes coach behaviour; snapshot test. 🧪 |
| **E9.2** "Translate this message" entry point in UI. | User can paste a hot message → get a regulated rewrite. |

---

### E10 — Dual-seat billing (Stripe)  💵
*Goal: one couple subscription, two seats — attach subscription to the **engagement** (architecture §6.4 / D5).*

| Story | Done |
|:--|:--|
| **E10.1** `engagement.subscription_status` + `stripe_subscription_id` (or thin `engagement_subscription`). | Schema supports one sub → two seats. |
| **E10.2** Stripe checkout for the $199/couple/yr plan; webhook updates engagement. 💵 | Test-mode purchase activates both participants' entitlement. 🧪💵 |
| **E10.3** Entitlement derivation: participant access = engagement subscription. 🔒 | Both seats unlock on purchase; lapse locks both. 🧪 |
| **E10.4** 30-day "feel closer or it's free" refund handling (keep the Blueprint). | Refund within 30d works; Blueprint retained. |

---

### E11 — Relatti landing + entry-segment funnels  🎨
*Goal: the marketing surface, rebranded from solo MasteryTV → Relatti dyad positioning, funnels driven by `entry_segment`.*
> Current state: root `page.tsx`/`landing.tsx` = solo "personality test" MasteryTV copy; needs Relatti rebrand. `entry_segment` table is live (E1).

| Story | Done |
|:--|:--|
| **E11.1** Rebrand root landing → Relatti positioning ("a coach that knows *both* of you"), BRAND.md-compliant. | Landing reads as Relatti, not solo Decoded. |
| **E11.2** `/couples` + `/engaged` funnel pages, content driven by `entry_segment` rows. | Slugs render tailored copy → same engine. |
| **E11.3** Share/invite CTA wired to the existing viral invite loop. | Quiz/result → partner invite from the landing flow. |

### E12 — Dyad app shell + coach chat page  🎨🔒  *(depends on E4, E5)*
*Goal: rebuild the logged-in surface so the user is coached as a couple — reads the engagement/participant spine.*
> Current state: `dashboard/chat/page.tsx` = solo coach UI, no partner concept. Must surface the dyad.

| Story | Done |
|:--|:--|
| **E12.1** Resolve + display the user's active `relationship_dyad` engagement (partner presence, status). | Chat header shows the dyad, not just "you". |
| **E12.2** Coach chat reads dyad context (post-E4 assembler) + mediator framing in UI. | Coaching reflects both partners. 🔒 |
| **E12.3** Blueprint panel (from `engagement_artifact`) + shared ritual/streak (E8) visible to both. | Both partners see shared "us" surface. |
| **E12.4** Consent controls surfaced (what each shares) — extends existing invite-consent UI. | User can see/adjust `share_level` in-app. 🔒 |

### E13 — Consolidate app trees + retire dead variants  🧹
*Goal: one canonical frontend surface; kill the maintenance debt.*

| Story | Done |
|:--|:--|
| **E13.1** Pick canonical tree (`/dashboard` vs `/coachapp`) — decision needed — and delete the duplicate. | One chat/dashboard tree remains. |
| **E13.2** Remove dead landing variants (`decoded/landing-noir*`, unused `decoded/landing`). | Only the live Relatti landing(s) remain. |

---

## 4. Sprint slicing (proposed)

| Sprint | Epics | Outcome |
|:--|:--|:--|
| **Sprint 1** | E1 → E2 → E3 → E4 | **Spine live + dyad coach on it.** The architecture is real; existing dyad coached via engagement. |
| **Sprint 2** | E5, E7, E6 | Blueprint productised; **safety shipped (launch-blocker)**; SMS/proactive infra (the shared dependency). |
| **Sprint 3** | E8, E9, E10 | Retention mechanics (ritual/streak, De-Escalator) + dual-seat billing → ready for the founding-couples cohort. |

> Retention experiment (the PRD §11 gate) can start measuring after Sprint 2 once a closed cohort is onboarded; public funnels wait on E7 + GTM decisions (entry segments / cohort / pricing — **out of this doc's scope**, they don't affect the build order).

---

## 5. Gate 3 checklist (BMAD)

- [x] Epics broken into stories (≤ 1 day each) — §3.
- [x] Stories ordered by dependency — §1 critical path, §4 slices.
- [x] Each story has Done criteria — §3.
- [x] First sprint identified — **Sprint 1 = E1–E4**.
- [x] Environment setup documented — §2 (baseline migration, branch DB, feature flag, SMS provider).
- [ ] **Founder approval of this sprint plan (Gate 3).** ← required before build.

> **One decision still owed (non-blocking for Sprint 1):** SMS provider + cost sign-off (§2), needed before E6. Recommend deciding during Sprint 1 so Sprint 2 isn't gated.
