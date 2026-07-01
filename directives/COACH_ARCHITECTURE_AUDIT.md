# Coach Architecture Audit — Modularity for Multiple Domains

> **Date:** 2026-07-01
> **Author:** Tom Wood + Claude Code
> **Trigger:** Adding a relationship coach on top of the executive/Decoded "Mastery Coach" exposed friction (e.g. a grief conversation labeled with "Motivational Interviewing coaching challenges"). Before adding a 3rd domain (career), decide whether/how to re-architect.
> **Status:** AUDIT + RECOMMENDATION. No code changed. Awaiting founder direction on phasing.
> **Scope read:** `supabase/functions/coach/index.ts`, `_shared/prompt-assembler.ts`, `_shared/post-processor.ts`, `_shared/profile-updater.ts`, `_shared/crisis-detection.ts`, `_shared/dyad-context.ts`, `framework_config` (all 10 rows), `COACHING_BRAIN.md`, `COACHING_GUARDRAILS.md`, plus live data from the relatti20 test conversation.

---

## 1. TL;DR

**The instinct is correct.** Relatti is a relationship coach *bolted onto* an executive-coaching engine, not a peer domain in a modular system. The engine has good bones (a real prompt-composition seam, a solid shared kernel), but:

- **The "brain" defaults to executive.** Relationship is expressed as *subtraction* — the same assembly with 5 layers nulled out via `isRelationship ? "" : …`, one swapped, and a different persona string.
- **Everything downstream of the persona is domain-blind.** Post-processing, memory taxonomy, the framework library, and the adaptive-profile model are hardwired to executive coaching and run identically for a grieving spouse.
- **Career would repeat the pattern** — a third set of `if` branches threaded through the same monolith.

**Recommendation:** don't rewrite — **invert the model.** Introduce a first-class **Coach Pack** (per-domain strategy/config) over a **domain-agnostic kernel**. Safety/crisis, LLM transport, memory *plumbing*, and channels are shared; persona, layer set, framework library (or none), post-processing schema, memory taxonomy, adaptive dimensions, and guardrail overlay are pack-owned. This is an incremental refactor of existing seams, shippable in phases, and it makes career purely additive.

---

## 2. How it works today

### 2.1 The shared kernel (good — keep)
`coach/index.ts` is the web entrypoint. Per message it: authenticates → checks free-tier limit → **runs crisis detection** → resolves conversation → stores + embeds the message → **assembles the prompt** → streams the LLM (agentic tool loop) → persists → fires async **post-processing**. Email/Telegram reuse the same core via `channel-router.ts`. Cost tracking, disclaimers, embeddings, and conversation resolution are all clean, cross-cutting, and domain-agnostic. **This layer is the right shape.**

### 2.2 The "11-Layer Brain" (`prompt-assembler.ts`) — the bolt-on
The system prompt is composed from an ordered array of layer fragments (`prompt-assembler.ts:948`). Domain divergence is inline conditionals:

```
buildBasePersona(program)                               // L1  — if relationship → different string
isRelationship ? "" : buildChallengesLayer(...)         // L2  — nulled for relationship
isRelationship ? "" : buildInterventionSelector(...)    // L3  — nulled
isRelationship ? "" : deliveryResult.text               // L6  — nulled
isRelationship ? "" : buildAgendaLayer(...)             // L8  — nulled
isRelationship ? "" : buildAIToolContext(...)           // L9  — nulled
isRelationship ? buildRelationshipGuardrails()          // L10 — swapped
              : buildGuardrails()
buildSafetyGuardrails()                                 // L11 — shared
```

Implications:
- **Executive is the default; relationship is the exception.** A new domain = more ternaries in the same file.
- **The data still loads regardless of domain.** Challenges, agenda, ai_tools, and `framework_config` phase-enrichment all execute in the `Promise.all` (`prompt-assembler.ts:641`) even for relationship — the domain can opt out of *rendering* executive machinery, not out of the executive data model.
- **`program` is a trusted client string.** The client sends `program: resolveBrandClient().programSlug` (e.g. `src/app/compatibility/[inviteId]/GenerateReport.tsx:61`); the edge function never cross-checks it against the user's `engagement.kind`/workspace. Omit it and a Relatti user silently gets the executive persona **and the business/legal guardrails** — a fail-open default.

### 2.3 Post-processing (`post-processor.ts`) — fully domain-blind
`postProcess()` takes **no `program` argument**. It runs one GPT-4o-mini extraction with an **executive schema** on every conversation in every domain:
- Fact categories: `business|personal|preference|goal|challenge|win|pattern|org_sop`.
- Challenge categories: `business_growth|leadership|productivity|career|…|financial`.
- Extracts **`ai_tools_mentioned`** (Notion, HubSpot, AWS…) — nonsensical for a grieving spouse.
- Every detected "challenge" is auto-assigned an **executive framework** via `CATEGORY_FRAMEWORK_MAP` (`post-processor.ts:22`): `relationships → "Motivational Interviewing"`, `personal_development → "OSKAR"`.

This is why the relatti20 grief conversation produced 20 "coaching challenges" tagged MI/OSKAR, a `org_sop` memory ("using Relatti"), and misattributions (the husband's suicidal disclosure stored as *"concern for friend"*; his job loss stored as *"the user is experiencing job loss"*). **The persona knows the domain; the memory layer does not.** Split brain.

### 2.4 Framework library (`framework_config`, 10 rows) — executive-only
Every framework is founder/executive methodology: **EOS/Traction, Hormozi Offer Optimization, Lean Startup, Situational Leadership, Robbins RPM, GROW, OSKAR, Socratic, Motivational Interviewing, Situational Leadership.** `when_to_use` text literally says "SaaS founders", "first-time managers", "generate 50 qualified leads". There is **not one relationship framework** (no Gottman, EFT, attachment-based, NVC). The relationship coach deliberately runs *stance-based, no visible framework* (E14) — yet the post-processor still forces its conversations into this executive library. Multi-framework "works" mechanically (category+trust+affinity selection, phase tracking) but is shallow (all 20 test challenges stuck in phase 1 / `active`, none advanced or resolved) and **executive-scoped**.

### 2.5 Adaptive profile (`profile-updater.ts`, `coach_profiles`) — executive-shaped, shared
The 8 tunable dimensions (directness, framing, warmth, autonomy, pacing, evidence_style, accountability, challenge_level) are an executive delivery-style model. `accountability` = "I'll check on this Wednesday"; `challenge_level` = confronting readiness — both awkward fits for relationship coaching. It's driven by the domain-blind post-processor's `profile_signals` and applies identically across domains. (For relatti20 it produced near-maxed, low-confidence, `source: decoded`-seeded dials — not obviously wrong, but not domain-appropriate either.)

### 2.6 Safety / crisis (`crisis-detection.ts`) — correctly shared, but under-built
This is the one genuinely cross-cutting safety net, wired into both the web handler (`coach/index.ts:131`) and the channel-router. **But in the relatti20 test it produced zero `crisis_flags` for a textbook crisis conversation** (a partner's suicidal hints + a possible-abuse pattern + the user's own existential despair). Root causes:
- **First-person / self-harm keyword bias.** Patterns match "suicide", "kill myself", "want to die". The disclosure was third-person about the partner ("he's hinted at ending his life") → matches nothing.
- **Indirect ideation uncovered** ("what's the purpose of life", "does the pain go away when we die").
- **Emotional-abuse cues uncovered** ("he yells at me constantly" isn't in the abuse regex; that path never ran).
- **Scans only the single inbound message,** so multi-turn / third-party risk is structurally invisible.

All safe behavior in that session was **emergent from the LLM**, unlogged and unauditable. If the model regressed or were jailbroken there would be no net and no record. **Safety is the highest-priority kernel gap, independent of the modularity refactor.**

### 2.7 Privacy across a dyad — sound by design (keep)
Coaching disclosures (messages, `memory_facts`, challenges, commitments) are strictly `user_id`-scoped. The only cross-partner data is the **consented assessment** (archetype, attachment style, S1 summary), gated by `share_level` in both the legacy `decoded_invites` fan-out and the spine `dyad-context.ts`, with an explicit "keep each partner's private reflections private" instruction. This boundary is correct and should be preserved as a kernel invariant.

---

## 3. Verdict on the founder's questions

| Question | Answer |
|:---|:---|
| Are we bolting relationship onto a motivational coach? | **Yes.** Relationship = executive assembly minus 5 layers, plus a persona swap. Downstream is 100% executive. |
| Will career hit the same issue? | **Yes** — as built, career is a third set of inline branches + the same domain-blind post-processing/memory/framework. |
| Unique system per domain? | **No — that over-corrects.** N parallel coaches would duplicate safety, memory, streaming, and cost N times (the real risk). Use **one shared kernel + swappable domain packs.** |
| Is the multi-framework engine handling things correctly? | **Mechanically yes, substantively no.** The engine is fine; the *library* is executive-only and is mis-fired onto relationship. It needs to be domain-scoped and allow "no frameworks." |
| Re-architect? | **Yes, but refactor — not rewrite.** The seams already exist. Invert default→pack. |

---

## 4. Target architecture — Coach Pack over a domain-agnostic kernel

### 4.1 Shared Kernel (one implementation, domain-agnostic)
- Transport/SSE, auth, rate-limit/free-tier, disclaimers, cost tracking
- LLM routing (`anthropic.ts`) — model choice becomes a pack parameter (`forceClaude` today is a proxy for this)
- Conversation resolution + history scoping
- **Safety & Crisis** — cross-cutting and mandatory for every pack; upgraded per §2.6 (LLM-primary, third-person/partner-aware, always logs a flag). No pack may disable it.
- Memory **storage & retrieval mechanics** (embeddings, vector search, dedup, dyad privacy invariant)
- The **prompt-composition engine** (renders an ordered layer list) — but the *layers come from the pack*

### 4.2 Coach Pack (one per domain: `executive`, `relationship`, `career`, …)
A declarative strategy object that owns everything domain-specific:

| Pack concern | Executive | Relationship | Career (future) |
|:---|:---|:---|:---|
| **Persona** (L1 + sub-personas) | executive coach | attachment/EFT/Gottman, understand-first; + dyad mediator, de-escalation | career/identity coach |
| **Layer set** (which layers, order) | challenges, intervention, delivery, agenda, ai-tools, guardrails | persona, dyad, memory, relationship-guardrails, safety | its own set |
| **Framework module** | executive library (EOS, GROW…) | **none** (stance-based) | career library (Designing Your Life, Ikigai, GROW, informational interviewing) |
| **Post-processing schema** | business facts, challenges, ai_tools | emotional themes, attachment cues, relationship events, commitments-as-experiments | career goals, skills, applications, blockers |
| **Memory taxonomy** | goal/win/pattern/org_sop | reframe "challenge" → theme/pattern; people = partner/kids | role/target/skill/network |
| **Adaptive dimensions** | 8 exec dials | reassurance/space calibration (attachment) | tbd |
| **Guardrail overlay** | legal/tax/HR/financial | no diagnosis, no stay/leave, therapy-law safe | licensing/comp claims |
| **Assessment + tools** | `lookup_assessment` | `lookup_relationship` | career-assessment lookup |
| **Model params** | gpt-4o-mini primary | force Claude, 700 tok | tbd |

### 4.3 Domain resolution (fixes the fail-open default)
Resolve the pack **server-side from the spine** — `engagement.kind` / `program` / workspace default — not the client `program` string. The client string becomes a hint, validated against the user's actual engagement. Every domain is explicit; there is no silent executive fallback.

---

## 5. Migration path (incremental, independently shippable)

**Phase 0 — Safety kernel hardening (do first, standalone).** Upgrade `crisis-detection` to LLM-primary + third-person/partner + indirect-ideation detection, running over recent context not just the last message, and **always logging a `crisis_flag`** with an escalation hook. Benefits every domain now; not coupled to the refactor. *(Addresses the §2.6 finding.)*

**Phase 1 — Extract the Coach Pack seam (refactor, zero behavior change).** Define a `CoachPack` interface; move executive layers into `executivePack`, relationship branches into `relationshipPack`; the orchestrator composes `pack.layers`. Deletes the scattered `isRelationship ? "" : …` ternaries. Output should be byte-identical prompts (snapshot-test executive + relationship before/after). **Highest leverage, lowest risk** — after this, adding career touches zero existing branches.

**Phase 2 — Domain-aware post-processing + memory taxonomy.** Pass the pack into `postProcess()`; give relationship its own extraction schema and memory categories. Kills the MI/OSKAR-on-grief, `org_sop`, `ai_tools`, and friend/husband-misattribution problems. Reframe relationship "coaching challenges" → themes/patterns.

**Phase 3 — Domain-scope the framework engine.** Add a domain/program scope to `framework_config` (or a domain→library map); allow `frameworks: none`. Author a career library when career lands.

**Phase 4 — Spine-based domain resolution.** Resolve pack from `engagement.kind`/workspace; demote the client `program` to a validated hint.

**Phase 5 — Author `careerPack`.** Now purely additive: persona + layer set + framework library + post-processing schema. No changes to existing domains.

Phases 0–2 capture most of the value. 0 can (and arguably should) go first regardless.

---

## 6. Open decisions for the founder
1. **Sequencing:** do Phase 0 (safety) immediately and standalone? (Recommended — it's a live safety gap.)
2. **Refactor appetite:** approve Phase 1 as a no-behavior-change refactor with prompt snapshot tests? (This is the keystone.)
3. **Relationship "challenges" reframe:** confirm relationship should have **no framework library** and memory should track *themes/patterns*, not executive "challenges."
4. **Adaptive profile:** keep the 8 exec dials for relationship for now, or design attachment-calibration dimensions in Phase 2?
5. **Career timing:** is career close enough that we should design `careerPack` needs into the Phase 1 interface now (vs. discovering them later)?

---

## 7. Appendix — evidence pointers
- Layer bolt-on: `_shared/prompt-assembler.ts:946-964`
- Executive persona default: `_shared/prompt-assembler.ts:95-134`
- Relationship persona: `_shared/prompt-assembler.ts:146-176`
- Domain-blind post-processor: `_shared/post-processor.ts:103-110` (no `program` param), `:120-163` (executive schema), `:22-31` (`CATEGORY_FRAMEWORK_MAP`)
- Orchestration knobs: `coach/index.ts:82-92` (`isRelationship` → tokens/tools), `:341` (`forceClaude`)
- Client-supplied program: `src/app/compatibility/[inviteId]/GenerateReport.tsx:61`
- Crisis miss: `_shared/crisis-detection.ts:15-49` (first-person patterns), live `crisis_flags` = 0 rows for conversation `d247c6bb`
- Dyad privacy invariant: `_shared/dyad-context.ts:143-214`, `_shared/prompt-assembler.ts:860-927`

---

## 8. Decisions (2026-07-01, founder)
- **Launch EFT-only.** The understand-first EFT stance is validated (helps the user understand → then take small actions) and is the lowest-risk / best-evidenced config. The relationship Coach Pack ships **`frameworks: none`** (stance-only). Other modalities deferred to post-launch.
- **IFS declined** for AI couples coaching — it's individual, parts/trauma-oriented, and pulls into the therapy register we're legally avoiding (higher harm + AI-therapy-law exposure for an unlicensed AI). Revisit only much later, if ever, as a clinician-reviewed *internal* lens — never a launch item.
- **Gottman / NVC and other lenses = post-launch,** added as *invisible situational lenses* (not user-facing frameworks), each gated by the automated harness below **and** founder (ideally clinician) review.
- **Framework transparency:** relationship never names a modality; plain-language stance only. (Executive/career may name approaches later — a pack policy.)
- **Testing feasibility:** ~75% is automatable — extend `scripts/coach-lab/run.mjs` (today an eyeball A/B tool) into an assertion harness: multi-turn scenario battery + deterministic rule checks (no lists/headings, no "you should", AI/not-therapist disclosure, crisis/DV resources on cue) + LLM-judge rubric + regression snapshots. The remaining ~25% (clinical correctness of a modality + the human "feel" bar) stays **manual per new modality**. This is *why* EFT-only for launch is right, and why adding models later gets cheap once the harness exists. Build the harness even for EFT-only — it guards the stance against regressions and would have caught `crisis_flags = 0`.
- **Phasing unchanged:** Phase 0 (safety kernel) remains the priority; Phase 1 (Coach Pack seam) is unchanged and *simplified* by `frameworks: none`.
</content>
</invoke>
