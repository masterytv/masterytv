# Fable Review — MasteryTV / Relatti (2026-07-02)

> Independent review of the project as built (mostly by Opus 4.6/4.8), covering code, architecture, product, safety, business, and marketing. Reviewed: all current `directives/` docs, the coach edge function + prompt assembler + safety systems, scoring engine, spine migrations, API routes, platform/brand layer, the coach-lab harness, and the live Supabase project (security advisors + function definitions).

---

## TL;DR

This is an unusually well-run solo-founder AI project. The documentation discipline, the self-auditing (COACH_ARCHITECTURE_AUDIT, PRIVACY_TERMS_LIABILITY_PLAN), the two-tier safety system, and the honest strategy doc are top-decile. The polymorphic spine is a sound bet, the EFT-stance coach is research-grounded, and the retention thesis is a clean, falsifiable experiment.

Three things need to be said plainly:

1. **There is one live security hole that must be fixed today** — `match_memory_facts` / `match_messages` RPCs let any authenticated user read any other user's private memory facts and coaching messages, including their partner's. This is the exact "catastrophic partner leak" the privacy plan warns about, and it's exploitable right now on staging.
2. **The project is over-documented relative to how validated it is.** ~8,000 lines of directives, a 3-stage platform architecture, multi-tenancy seeds — for a product with ~12 invites and ~18 profiles that has never had a paying stranger. The docs are an asset; the risk is that planning has become the comfortable substitute for the scary part (getting 20 real couples in).
3. **The known launch blockers are correctly identified — trust them.** The legal/privacy plan, the safety clinician review, and the coach-pack refactor phasing are all right. Nothing in this review contradicts them; a few items below should be added to the list.

---

## 1. Security findings (verified against the live DB)

### 🔴 P0 — Cross-user read of private coaching data via RPC — ✅ FIXED 2026-07-02 (migration `20260702000000_p0_lock_semantic_search_rpcs`; ACLs verified: only `postgres` + `service_role` can execute)

`public.match_memory_facts(query_embedding, match_user_id, …)` and `public.match_messages(…)` are `SECURITY DEFINER`, filter **only** by the caller-supplied `match_user_id`, and are executable by the `authenticated` (and per the linter, `anon`) role via PostgREST (`/rest/v1/rpc/match_memory_facts`). Verified the function bodies: there is no `auth.uid()` check.

- Any logged-in user who knows another user's UUID can vector-search their **private memory facts and full coaching messages**.
- Partners *do* know each other's UUIDs — `decoded_invites` exposes `inviter_id` / `recipient_id` to both parties.
- Given what these tables now contain (DV disclosures, a partner called "psychopathic", suicidality, a miscarriage), this is the §3.3 catastrophic scenario from PRIVACY_TERMS_LIABILITY_PLAN, live.

**Fix (one migration):**
```sql
REVOKE EXECUTE ON FUNCTION public.match_memory_facts(text, uuid, integer, double precision) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_messages(text, uuid, integer, double precision) FROM anon, authenticated;
```
The only legitimate caller is the edge functions under the service role, which bypasses grants-by-role concerns. Then add the partner-isolation regression test the privacy plan already calls for (§6.2) — this finding is the proof it's needed.

### 🟠 P1 — `program` is a fail-open, client-trusted string — ✅ FIXED 2026-07-02 in `coach/index.ts` (`resolveProgram`: engagement membership required + authoritative, spine backstop before executive fallback; **pending edge-function deploy**)

Documented in COACH_ARCHITECTURE_AUDIT §2.2: omit `program` from the request body and a Relatti user gets the executive persona, business guardrails, and the `lookup_assessment` tool. It also silently drops the relationship-specific safety framing (DV contraindication nuances, confidentiality honesty rules live in the relationship layers). The audit schedules the full fix as Phase 4; **the cheap interim fix shouldn't wait**: in `coach/index.ts`, resolve the program server-side (participant row / engagement kind / workspace default) and treat the client string as a hint. ~30 lines.

### 🟡 P2 — Smaller items

- **`get_auth_provider_for_email` is anon-callable** — an email→OAuth-provider oracle; account-existence enumeration. If it's needed for the login UX, rate-limit it or move it behind a server route; otherwise revoke anon.
- **Leaked-password protection is disabled** in Supabase Auth — one toggle, enable it.
- **`crisis_flags` (and 7 other tables) have RLS enabled with no policies.** Deny-by-default is probably intentional (service-role only), but make it explicit with a comment/policy so a future "why can't I read this" doesn't get fixed with `USING (true)`.
- **Client-supplied `engagement_id` isn't validated** against participant membership in `coach/index.ts` before service-role writes to `messages` / `engagement_activity` / `conversations`. Low impact today (reads stay user-scoped), but it lets a user write rows attributed to an arbitrary engagement — pollutes the shared streak and future dyad analytics. One membership check fixes it.
- **Free-tier limiter is racy** — read-then-write with a fire-and-forget increment; a burst of parallel requests can blow past the 5/day cap. Fine at this scale; make the increment atomic (`update … set count = count + 1 returning`) whenever it starts to matter for cost.

---

## 2. Correctness findings

- **Cost tracking is inverted** at `coach/index.ts:600`: `const isFallback = model.startsWith("gpt-")` — but in `calculateCost`, `isFallback=true` means *Claude Sonnet rates*. Result: all GPT-4o-mini traffic is logged at ~20× its real cost, and **all Relatti coach traffic (forceClaude → Sonnet) is logged at ~1/20th its real cost**. The `/admin/costs` dashboard is materially wrong in the exact direction that hides Relatti's真 unit cost. Two-line fix; matters because unit economics decisions (pricing, free-tier size) will be read off that dashboard.
- **Single-tool-block assumption** in the agentic loop: if the model emits multiple `tool_use` blocks in one response, only the last is executed (`pendingToolUse` is overwritten). Rare with current tools; will bite when tools grow.
- **Legacy dyad fan-out loads the partner's *latest* report by `user_id`** (order by `created_at desc`) while the spine path pins `participant.report_id` — after a retake these two paths can disagree about which report the coach sees. You already know the two-path problem; this is one more reason to pick a date to kill the legacy path.

---

## 3. Code & architecture assessment

### The good (genuinely)

- **The kernel is the right shape.** `coach/index.ts` → assemble → stream → post-process, with channels reusing `channel-router.ts`; cost tracking on every call; embeddings async; non-fatal failure handling everywhere it should be non-fatal. Comments explain *why* (the SSE `delta`-vs-`token` bug, the empty-reply guard, why the limit notice must not wear the coach's voice — that last comment is genuinely product-literate).
- **The two-tier safety system is well designed**: Tier 1 synchronous keyword hard-stop (first-person, explicit) + Tier 2 async Haiku sweep over an 8-turn window (third-person, indirect, abuse-in-context, harm-to-others venting-vs-intent). The contract between tiers is *written down and locked by a test battery* (`safety-battery.mjs` asserts what Tier 1 deliberately ignores). Dedup windows prevent alert flooding. This is better safety engineering than most funded AI-coaching startups have.
- **Privacy by assembly (ADR-R02) is the correct design.** Private per-user data stays RLS-locked; cross-partner context is composed server-side under explicit `share_level`. The two-axis sharing split (per-person coach axis vs negotiated partner axis, with request/accept/lower semantics in `partner-sharing/route.ts`) is thoughtful — raising visibility requires partner consent, lowering is unilateral and immediate. That's the right consent physics.
- **The polymorphic spine is a good bet, well hedged**: additive DDL, idempotent backfill, `workspace_id` everywhere as cheap insurance, promote-don't-rebuild for `decoded_invites`. ADRs are recorded. This is how you keep a platform option open without building a platform.
- **The scoring engine reads like it was audited** — because it was (canonical IPIP keying fix with the old error documented in a comment; canonical instrument text locked; one scorer; re-scoring from stored raw responses).
- **The docs are a real asset.** ORIENT.md's "read only what your task needs" router, the honest self-audits, founder decisions recorded with dates and rationale. If Stage 3 (sellable asset) ever happens, this documentation corpus is worth real money in diligence.

### The bad

- **Test coverage is ~2%: 5 test files across 204 source files**, all in the Decoded scoring/report corner. Zero tests on: the money paths (Stripe webhooks, checkout), the consent state machine (partner-sharing request/accept/lower — the highest-trust logic in the product), invite/claim, the spine sync functions, or partner isolation. The coach-lab harness is good but covers the prompt, not the plumbing. **The consent and billing paths need tests before launch more than the coach needs more prompt work.**
- **The bolt-on coach is real** (your audit already nailed it): relationship = executive assembly with 5 layers nulled by ternaries; post-processor runs an executive schema on grief conversations; the framework library is 100% executive. The Coach Pack plan (kernel + packs, Phases 0–5) is the correct fix and Phase 1 is cheap. Endorsed as written — with one addition: **the persona/stance text should move out of code into pack config** so prompt iteration doesn't require an edge-function deploy (coach-lab already mocks this; make it real).
- **Two live code paths for the dyad** (spine behind `RELATTI_DYAD_ENGINE=off`, legacy fan-out default-on) means the spine — the thing three months of architecture work produced — **is not actually exercising in the product**. Every week both paths live is a week of edit-both-or-drift risk (§2 above found one drift already). Turn the flag on for your own dyad, soak it, delete the legacy path before launch.
- **Duplicated logic between `supabase/functions/_shared/*` and `src/lib/*`** (ECR→style derivation etc.) is acknowledged as a Deno import constraint, but it will compound. Consider a `shared/` package consumed by both via a small build step, or make the edge functions the single owner and have Next call them.
- **`prompt-assembler.ts` (1,117 lines) and `coach/index.ts` (898 lines) are monoliths** — tolerable now, but the Coach Pack refactor is also the natural moment to split them.
- **Two stacks in one repo** (Python mandated in CLAUDE.md §3A but the real system is 100% TS; `openai` npm dep in package.json appears unused in `src/`). Trim CLAUDE.md to match reality — stale instructions cost agent-quality every session.

### Stack verdict

Next.js 15 + React 19 + Tailwind v4 + Supabase (Postgres/RLS/pgvector/edge) + Vercel is the right stack for this product and team size; no migration recommended. Three notes:

1. **Vercel Hobby plan is a launch blocker in itself** — Hobby prohibits commercial use, and you're about to attach Stripe. Budget the Pro upgrade into the launch checklist.
2. **You're paying full price for every coach turn.** The system prompt (persona + guardrails + profile layers) is reassembled and re-sent uncached every message. Anthropic prompt caching (`cache_control` on the stable prefix — persona, guardrails, decoded profile) would cut input cost dramatically at your message shapes and reduce latency. Worth doing before the free tier scales.
3. **Model routing is sensible** (Sonnet forced for relationship after lab evidence that gpt-4o-mini missed safety cues; Haiku for the safety sweep). When you revisit, evaluate current-generation models with the coach-lab harness rather than by vibes — the harness is exactly the right tool.

---

## 4. Product assessment

### Strengths

- **The retention thesis is a real, falsifiable experiment** — dyad vs. known-zero solo baseline, one metric that gates everything. Most pivots don't have this discipline.
- **The EFT understand-first stance is the right call**, and the reasoning chain (only published relationship-chatbot RCT + lowest legal risk + lowest harm all converge on the same stance) is the strongest product argument in the whole doc set.
- **RELATTI_EXPERIENCE.md's diagnosis is correct**: the hero must be the relationship, not the type. The report restructure, the demoted archetype card, the "What This Means for You, Their Partner" dyad-interpretive blocks — all good.
- **The daily ritual (blind reveal, 3×/week default, forgiving shared streak)** is well-grounded in the Paired evidence and is genuinely the missing retention spine. The server-side reveal gate (SECURITY DEFINER RPC because RLS can't express "reveal once both answered") is the right mechanism.
- **Solo users get the full product** (founder decision #4) — correct, and differentiating: the person trying to save a relationship alone is underserved by Paired-style both-or-nothing apps.

### Risks and gaps

1. **The invited-partner activation funnel is the whole business, and it's the least-designed part.** The PRD names the Invited Partner as "the retention weak link" and then the docs spend 10× more words on the coach's stance than on the invite email → claim → first-5-minutes of the *second* user. The 2025 finding you cite (benefit only when both partners engage) makes this THE metric: **instrument partner-invite → partner-claim → partner-first-ritual as the primary funnel, and design that flow with the same care as the report.** Live data says 9 of 12 invites are still pending — that's the product telling you where the problem is.
2. **The assessment length is a conversion tax you've already diagnosed but not paid down.** STRATEGY §2 calls the 110-item battery "a conversion tax, not a moat"; the fix (progressive profiling: ECR-R + a Big-Five short form up front, everything else later, inside the product) still isn't on a sprint. For a couples funnel where *two* people must complete it, the tax compounds — partner completion rate is the metric it's suppressing.
3. **Free tier (5 messages/day) vs. $199/yr couple sub has no middle rung**, and the paywall moment isn't designed. The 30-day "feel closer or it's free" guarantee is strong; make the upgrade moment relational ("unlock your coach for both of you") rather than a quota wall — the code comment about the limit notice already understands this.
4. **Web-only vs. an app-shaped market.** Paired/Lasting live on the home screen; the ritual + nudge loop you're building is a push-notification product. E6 chose SMS — good contrarian fit (no install friction, works for the reluctant partner) — but be explicit that SMS *is* your notification layer and design the ritual around it. A PWA install prompt is a cheap hedge.
5. **Retakes/re-scores can silently change someone's archetype/attachment style** — the couples report has staleness detection, but the *person* doesn't get a "your profile changed" moment. Small thing; identity products get punished for silent identity changes.

---

## 5. Safety & legal (the launch gate)

The PRIVACY_TERMS_LIABILITY_PLAN is excellent and its sequencing is right. Confirmations and additions:

- The **coach-script confidentiality fix (E15.1) is already live in the prompts** (both the relationship guardrails and Layer 11 now teach honest, non-absolute privacy language, and can promise exactly one thing: partner-privacy). Good. Now make partner-privacy *provably* true: the P0 RPC fix above + the isolation regression test. Until the RPC is revoked, the one absolute promise the coach is allowed to make is false.
- **Add the P0 finding and the `program` fail-open to the E15 blocker list** — both are "the promises must be true in code" items (§6 of the plan).
- The **Tier-1 crisis hard-stop replaces the coach's reply entirely** with a canned response. Right for true positives; but a moderate-severity false negative path exists where a user in genuine pain gets a template and then the conversation just… resumes. Consider (post-launch) letting Tier 1 *prepend* resources and let the model continue with a crisis-informed system addendum, rather than hard-stopping — the Amanda RCT supervisor pattern. Clinician input belongs here.
- **Data retention is the sleeper item.** §3.4 (subpoena/custody) is the most under-appreciated risk in the plan: minimization + a retention window is engineering work with lead time — schedule it, don't just document it.
- The escalation email goes to `tom@relatti.com` via a Resend domain that isn't verified yet (falls back to masterytv.com). Verify the safety-alert path actually delivers **before** any external tester talks to the coach.

---

## 6. Business opportunity — honest read

**The mechanism insight is real.** "External stake beats notifications" is a better founding insight than most AI-coaching startups have, and the 3-stage roadmap (couple → deadline → human coach) is a coherent way to ride one engine. The dyadic profile ("a coach that knows both of you") is a genuine wedge — Paired/Lasting have content and prompts but no validated per-partner psychology and no coach that holds both.

**But the roadmap is running ahead of the evidence.** Career-vertical scaffolding, white-label tenancy seeds, a vertical playbook, verticals-as-config — all built or specced while Stage 1 has zero external users. The spine was cheap insurance (fine); the *attention* is the cost. Between now and ~50 active couples, the only questions that matter:

1. Does the invited partner actually join? (invite→claim rate)
2. Do both partners engage past week 3? (the thesis)
3. Will an Initiator pay $199 with their card, not a founding-couple discount?

Everything not on that critical path — including Stage 2 planning — is deferrable. The strategy doc itself says this ("this metric gates everything downstream"); hold yourself to it.

**Pricing:** $199/yr/couple anchored against therapy is right; $24/mo is high relative to Paired ($9–12/mo effective) — you're claiming a coach-not-content premium, which the product can justify *if the coach is the retained habit*. Founding-cohort lifetime lock is good. Consider a **$0 partner seat forever** framing (the couple pays once; the invited partner never sees a price) — removes the highest-friction moment in the funnel.

**The moat claim needs sharpening.** "Longitudinal data + memory + trust + dyadic engine" — trust and the dyadic engine are real differentiators; memory is table stakes by 2026. The durable asset is actually the *consented dyad graph* (validated psychology for both partners + shared consent artifacts + coaching history keyed to an engagement). Nobody can copy that without acquiring the couples. Frame the company around it.

---

## 7. Marketing

The old MARKETING.md is archived and nothing replaced it — currently marketing = one PRD section. Before launch you need a real acquisition plan; recommendations:

1. **The share-card viral loop is unproven — treat it as a hypothesis, not a channel.** Personality-card virality worked for Decoded-type products because the card flatters the *individual*. Relatti's card must make someone send it to *their partner* — a different, more vulnerable act ("I want us to work on us" is a loaded message). Test the invite framing hard: neutral-third-voice framings ("Relatti noticed something about how you two connect — see it together") will likely outperform "I took a quiz."
2. **The four relationship-style avatars (The Anchor / Devoted / Independent / Guarded Heart) are your best shareable asset** — better than the 16 personality archetypes for this brand. The founder's backlog TODO to build these cards should be pulled forward to launch: "which of the 4 are you / which is your partner" is a natural TikTok/IG format.
3. **Entry-segment SEO/QEO is a structural advantage you've already built** (`entry_segment`, funnels-as-data). Ship `/engaged` and `/married` with real content (wedding-season premarital angle has high intent and a deadline — the strongest stake). Add answer-cache-friendly content ("attachment styles in marriage," "why we fight about chores") so LLM search surfaces Relatti; you have a `nextjs-seo` skill for exactly this.
4. **Founding-couples cohort (STRATEGY §7.4) is the right GTM** — 20–30 couples, free or lifetime-locked, in exchange for weekly feedback and testimonial rights. It also satisfies the legal plan's "don't open to the public yet." Recruit from r/marriage-adjacent communities and premarital counseling adjacents, not ads.
5. **Positioning:** "Stop having the same fight. Start having the last one." is strong — keep it. The subline should carry the wedge: *"The only coach that knows both of you."*

---

## 8. Priority list

**Today / this week**
1. 🔴 Revoke `EXECUTE` on `match_memory_facts` / `match_messages` (P0 leak) + add the partner-isolation regression test.
2. 🔴 Server-side `program`/pack resolution in `coach/index.ts` (kill the fail-open executive default).
3. 🟠 Fix the inverted `isFallback` cost calculation.
4. 🟠 Verify the safety-escalation email actually delivers (Resend domain).
5. 🟠 Enable leaked-password protection; decide on `get_auth_provider_for_email` anon exposure.

**Pre-launch (the gate)**
6. Legal set per PRIVACY_TERMS_LIABILITY_PLAN (attorney + clinician; publish Privacy/ToS; acceptance gate) — already planned; hold the line.
7. Tests for consent state machine, Stripe webhook, invite/claim; wire `safety-battery` + `sweep-check` + `tsc --noEmit` into a pre-deploy gate (GitHub Action).
8. Turn `RELATTI_DYAD_ENGINE` on, soak with your own dyad, delete the legacy fan-out.
9. Coach Pack Phases 1–2 (seam + domain post-processing) — kills the MI/OSKAR-on-grief memory pollution before real couples generate real memories.
10. Design + instrument the invited-partner funnel (invite email → claim → first ritual) as the primary metric surface.
11. Vercel Pro; Anthropic prompt caching on the stable system-prompt prefix.
12. Shorten the assessment front-load (ECR-R + Big-Five short form; progressive profile the rest).

**Launch + first 90 days**
13. Founding-couples cohort (20–30), weekly feedback ritual, measure the week-3 dyad retention delta — the thesis test.
14. Relationship-style avatar cards as the share asset; `/engaged` + `/married` funnels with real content.
15. Data-retention window + subpoena posture (engineering, not just policy).
16. Only after the retention readout: revisit Stage 2 (career) at all.

---

## 9. A note on the process itself

The 3-layer directive system and self-annealing loop are visibly working — the docs caught the bolt-on coach, the crisis-detection zero-flag miss, and the confidentiality over-promise *before* an outside user ever hit them. Two cautions: (a) doc-drift is now your biggest documentation risk — ORIENT.md's "last reviewed" discipline should extend to the big specs; (b) the gates are advisory and the same intelligence writes the plan, the code, and the audit — the founding-couples cohort is the first *external* gate this project will have had. Get to it quickly; it will teach more than the next five directives.
