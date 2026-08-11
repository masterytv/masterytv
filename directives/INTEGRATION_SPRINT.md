# **Sprint Plan — Integration Coaching** (`integration`, Stage 3)

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** August 11, 2026
> **Status:** 🔄 DRAFT — BMAD Phase 3 (Sprint Planning). **Gate 3 needs founder approval before build.**
> **Parents:** [INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md) (Phase 0) · [INTEGRATION_EXPERIENCE.md](INTEGRATION_EXPERIENCE.md) ✅ **Gate 0.5 approved (August 11, 2026 — the §0 reframe)** · [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md) (Phase 2, reused; this vertical needs a thin config delta only, no new architecture).
> **Launch checklist:** §6 is [VERTICAL_PLAYBOOK.md](VERTICAL_PLAYBOOK.md) §5, copied here per the playbook's instruction, with the integration-specific deltas folded in.

---

## 0. How to read this

Epics are ordered by **dependency**, not priority. Each **story is ≤ 1 day** and carries explicit **Done** criteria. Tasks are the atomic steps inside a story.

Three things about this sprint plan are unusual and deliberate:

1. **Sprint 0 is a kill gate, not a build.** I1 exists to test the one assumption the whole vertical rests on. If the corpus match does not land with real experiencers, nothing after it should be built. Everything from I2 onward is explicitly conditional.
2. **Safety lands before the coach talks to anyone.** I3 precedes I4 because the memory-write filter governs what the pack writes, and a narrative that has ratcheted through months of stored facts cannot be un-ratcheted. This inverts the usual "ship it, then harden it" order on purpose.
3. **Legal precedes the public doors.** I11 sits ahead of I9 because marketing copy is the most likely cause of the first enforcement action, not the product.

**Legend:** 🟥 blocking dependency · 🧪 has automated test · 🔒 touches safety/consent/RLS (extra review) · ⚖️ legal · 💵 external cost · 🎨 design · 🧠 prompt/voice

---

## 1. The critical path (one glance)

```
I1 Corpus bridge + VALIDATION  ──▶  ⛔ FOUNDER GO / NO-GO  ⛔
                                              │
                                              ▼
                    I2 Program axis ──▶ I3 Safety + memory filter 🔒 ──▶ I4 Pack 🧠
                                                                            │
                                                        ┌───────────────────┴───────────────┐
                                                        ▼                                   ▼
                                              I5 Witness turn 🧠 ──▶ I6 The Company    I11 Legal ⚖️
                                                        │                                   │
                                                        ▼                                   ▼
                                        I7 Footing check ──▶ I8 The Map          I10 Brand 🎨 ──▶ I9 Doors + triage
                                                        │
                                                        ▼
                                        I12 Dashboard + the Aperture
                                                        │
                                                        ▼
                                    I13 Telling Ladder ──▶ I14 Family explainer ──▶ I15 Proactive
```

**Sprint 0 = I1.** Everything else is downstream of a decision that has not been made yet.

---

## 2. Environment & setup (do once)

| Item | Action | Done when |
|:--|:--|:--|
| **Cross-project corpus access** 🟥🔒 | Project Profound is a **separate Supabase project in a separate org** (`vnycavclrndjwmpaugju` vs. `lwmadssysqcwbsoiaokc`). ⚠️ **The retrieval requires the corpus project's `service_role` key today, and that key is not read-only — it bypasses RLS with full write access.** Verified 2026-08-11: `nde_chatbot_chunks` carries a single policy `USING (false)` for all roles, and `nde_chatbot_match` is **not** `SECURITY DEFINER`, so it executes as the caller and returns zero rows for `anon`. (`nde_vids` and `nde_analysis` are public-readable; only the chunks table is locked.) For I1, set `PROFOUND_URL` + `PROFOUND_SERVICE_KEY` as **Supabase edge secrets on the engine project** — server-side only, never a `NEXT_PUBLIC_` var, never in the browser bundle. Then do I1.6 before launch. <br><br>🟡 **Bridge built August 11, 2026; the key is still owed by the founder.** `corpus.ts` reads exactly those two names and refuses to start on the engine's own credentials (`assertDistinctFromEngine` — a pasted engine key would return zero rows, which reads as "no matches" rather than as a misconfiguration, and the kill gate would get answered by a bug). For local verification put both in `supabase/functions/.env` (gitignored, read by `supabase functions serve` and by `npm run corpus:probe`). | An edge function calls the corpus RPC and gets excerpts back; the key exists in exactly one place. |
| **The CI deny-list** ⚖️ | ✅ **DONE (August 11, 2026)** — sibling gate `scripts/check-integration-deny-list.mjs`, `npm run check:deny-list`, blocking inside `npm run gate`. Hard-fails on: *therapy/therapist/psychotherapy, counselor/counseling, psychologist/psychiatrist (CA AB 489's own title list), treat/treatment, diagnose/diagnosis, patient, clinical/clinician, heal(ing) as a service claim, "mental health support", "emotional support"*, and any construction of **"improve your mental health"** in either word order. **Scoped to integration-owned text**, two ways: path scope (an `integration` path segment or `integration-`/`integration.` basename → whole file) and block scope (a brace block opened by `"integration"` or `integration:` in any shared file — this is what reaches `BRANDS`, `byBrand()`, `PACKS`, `brand-metadata.ts` and the Resend chrome). Repo-wide was rejected: these words are legally required in the shipped verticals (Relatti's "not therapy", crisis-detection matching "therapist"), so a global ban needs a ~300-line allow-list nobody reads. **Escape hatch:** `deny-list-ok: <reason>` on the line or the line above, reason mandatory — I5.5's consent screen must say "not therapy, counseling or medical care" and I9.3's triage page must say "see a clinician this week". | ✅ Planted violation fails the build in both scopes; a `relatti:`-keyed sibling line with "Not therapy" is correctly untouched; 24-case self-test runs first inside `check:deny-list`. |
| Feature flag | ✅ **DONE (August 11, 2026)** — `INTEGRATION_ENGINE`, off unless explicitly `on`. Lockstep twins: `src/lib/platform/flags.ts` (server-only, never `NEXT_PUBLIC_`) and `supabase/functions/_shared/flags.ts`. Per-user flip is `INTEGRATION_ENGINE_USERS=<uuid>,<uuid>` while the global flag stays off — that is how the I1.5 cohort gets the bridge without it existing for anyone else. | ✅ Readable in both; 5 tests, the load-bearing one being that unset means off. |
| Instrument permissions | Email for written permission: **ISLES/ISLES-SF** (Holland/Currier/Neimeyer), **Core Beliefs Inventory** (PTG Research Group), **RSS-14** (Exline lab). Confirm commercial terms for **NDE-C** and **CEQ**. PHQ-4 needs nothing (public domain). | Written permission on file, or the instrument is dropped from the battery before build. |
| Clinical advisor 💵 | Retain one licensed clinician, ideally ACISTE-certified, for crisis-path review and as the named referral endpoint. Blocks I11.5 (Utah filing requires licensed involvement in development and review). | Named, contracted, review cadence agreed. |
| Insurance 💵⚖️ | Tech E&O + media liability. Ask the broker two direct questions **by name**: does the professional-services definition cover AI-generated output delivered without human review, and is there an AI exclusion endorsement (ISO CG 40 47 or carrier-specific) on this form. Confirm emotional distress / mental anguish is not excluded — for this product that is the only kind of claim there is. | Bound, with affirmative AI coverage confirmed in writing. |
| Public name 🎨 | Trademark-clear before it enters a single string, prompt, or email. Write the naming contract on day one: display wordmark changeable, `integration` slug and any JSONB section keys **locked**. | Clearance opinion on file. (The MoneyTraits rename cost ~60 files and a full edge redeploy.) |

> ⚠️ **Gate note:** the clinical advisor and the instrument permissions block I11 and I7 respectively, not I1. Do not let either hold up Sprint 0.

---

## 3. Epics → Stories

### I1 — Corpus bridge + the validation gate  🟥🧪  ⛔ **KILL GATE**
*Goal: prove that a corpus match lands as "I'm not alone" rather than "you're studying me," before a dollar of brand work. Ships as a tool on the **existing** coach — no new brand, no new pack, no new surface.*

| Story | Tasks | Done |
|:--|:--|:--|
| **I1.1** Cross-project client | Read-only service role on `vnycavclrndjwmpaugju`; secrets set; a thin `_shared/corpus.ts` client. Never reuse the engine's service key. | Edge function reads the corpus; engine credentials untouched. 🧪 |
| **I1.2** `find_similar_accounts` tool | Embed the user's own account (`text-embedding-3-small`, matching the corpus) → `nde_chatbot_match(query_embedding, match_count, filter)` → return **attributed excerpts** with source video id and timestamp. | Tool returns 5–10 excerpts for a real account in under 3s. 🧪 |
| **I1.3** The provenance contract 🔒 | Excerpts only. **No synthesis, ever.** The renderer never generalizes across accounts into a claim, and every excerpt carries its source. Enforced in the tool's return shape, not in prose. | A test asserts the tool cannot return model-authored text. 🧪🔒 |
| **I1.4** The second move | Retrieve the matched accounts' `transformation_breakdown` (10 domains, direction indicators) and `integration_notes` to support "what happened next." | Given a match set, the tool can report per-domain direction and quote `integration_notes`. 🧪 |
| **I1.5** **The test** | Recruit 5–10 real experiencers (IANDS contacts, founder network). Each writes their account; each gets a matched retrieval. Ask one question: *did this make you feel less alone, or studied?* Record verbatim reactions. | 10 sessions run, reactions transcribed, a written recommendation from the founder. |

> **Build notes (August 11, 2026) — I1.1–I1.4 as built.**
>
> - **One module**, `supabase/functions/_shared/corpus.ts`: cross-project client, embedding, retrieval, the provenance contract, and the `find_similar_accounts` tool + handler. The coach imports it behind `integrationEngineEnabled(userId)` and appends the tool to `pack.tools` — **temporary by design**, and it moves into the pack at I4.4.
> - **Attribution is video id + title + URL. There is no timestamp** (founder decision, August 11): `nde_chatbot_chunks.metadata` carries only `loc.lines`, and the one table with `start_time` (`nde_punctuated_embeddings`, ~40k rows vs. the chunk table's 404k) covers a fraction of the corpus. Revisit at I6.2 if a deep-link to the moment proves to matter.
> - **`integration_notes` lives inside `transformation_breakdown → qualitative_profile`**, not in a column of its own — as do `timeline_notes`, `dominant_themes` and `unique_features`. The 10 domains are `transformation_breakdown → domain_analysis`, each with `{name, score, direction, key_quote, evidence_summary}`.
> - 🔥 **`key_quote` is the experiencer speaking; `evidence_summary` and `integration_notes` are Project Profound's ANALYST writing about them.** The contract tags the first `verbatim_excerpt` and the second `corpus_analysis`, so analyst prose can never be rendered as something a person said. Getting this wrong would put invented-sounding quotes in the highest-trust surface in the product.
> - **Chunks are collapsed one-per-account** before counting. A naive top-9 is routinely three people quoted three times, and the count *is* The Company's whole claim.
> - **Counts are computed, never narrated** — `matched_count` and `domain_directions` are numbers in the payload, on the same reasoning as the dyad layer (ORIENT §7). A model counting across nine long excerpts gets it wrong, and a confident wrong number is banned move class #13.
> - **`matched_count` is a floor, not a census** — distinct accounts inside the retrieved window. Never present it as a total.
> - **The RPC returns the 1536-float `embedding` column per row.** `.select(...)` drops it; without that the bridge pulls megabytes to discard them.
> - ✅ **Embedding space confirmed** (probe, August 11): a chunk re-embedded with `text-embedding-3-small` returns itself at similarity **1.0000**. `vector(1536)` alone proved nothing — ada-002 is also 1536 — so this check runs first in `corpus-probe.ts` and everything else is gated behind it.
>
> **Build notes (August 11, 2026) — the retrieval refinement. Founder chose path A: fix findings 1 and 2 before I1.5 runs, rather than spend irreplaceable testers on a prototype whose defects would be indistinguishable from a wrong thesis.**
>
> - **The account is split into claims, and retrieval runs per claim.** `splitIntoClaims()` cuts the account into roughly one sentence each (`TARGET_CLAIM_CHARS = 120`, packed, capped at 8), prepends the WHOLE account as claim 0 so the split can never retrieve worse than the un-split version, embeds every claim in **one** OpenAI request, and fans the RPC out in parallel. `mergeClaimMatches()` then merges **round-robin** — each claim gives up its best account not already taken. Ranking the union by similarity was rejected: the setting matches score highest *as a block*, so they would take every slot again and the boundary nobody else can name would come ninth.
> - **Segmentation is deterministic, deliberately.** A model deciding which parts of somebody's account are "the claims" is an interpretation of their experience, made upstream of the one surface that must not interpret anything.
> - 🔥 **A single line break is not a claim boundary.** The first cut treated every `\n` as one, and pasted accounts are hard wrapped — it split *"more like a line I understood I mustn't cross, and I knew without"* into its own claim, a fragment that retrieves nothing because it is not a thing anybody said. Only a terminator or a blank line breaks a claim now.
> - **Claims are the person's own words, provably.** `AccountClaim` carries `{start, end}` offsets and `assertClaimsAreUserText` requires `text === description.slice(start, end)`. That is why a claim may carry a string at all without becoming a third provenance: text that still slices back out of the input cannot have been authored. Each account carries `matched_claim`, so a surface can name *the specific thing* in the person's own terms (EXPERIENCE §5.4) instead of asserting a general resemblance.
> - **Excerpts are re-bounded to whole sentences, never edited.** `expandToSentence()` finds the chunk inside `nde_vids.subtitles_punctuated` and grows outward to sentence boundaries, then keeps growing until the excerpt is at least 120 characters. It is **selection, not editing**: the window is a contiguous slice of the same transcript and always a *superset* of the matched chunk, both asserted rather than assumed. No boundary within 400 characters ⇒ the raw chunk ships unchanged (an un-punctuated transcript has nothing to find).
> - ✅ **Verified against the live corpus:** 300/300 sampled chunks appear byte-identically inside `subtitles_punctuated`, and only 29/300 inside `subtitles_cleaned` — **the chunker ran on the punctuated text**, which is what makes this exact-match rather than fuzzy. 8,068 of 10,957 videos carry punctuated subtitles; every chunked video sampled had one.
> - ⚠️ **Transcripts are interviews and the corpus has no speaker labels** — an excerpt can contain the HOST's questions as well as the experiencer's answers (the probe returned *"You weren't frightened, though?"* on its own before the minimum length landed). **I6.2's renderer may attribute an excerpt to the account it came from, never to a named person as something they personally said.** The `verbatim_excerpt` tag means *spoken on the recording*, not *the experiencer's own words*.
>
> **Probe, after the refinement (built-in sample account, 588 chars):** 634ms end to end · 7 of 7 claims represented in the reveal · 162 English accounts across the claim windows · 8/9 excerpts sentence-bounded. The boundary claim now returns *"I understood without being told that if I crossed that line, or passed through it, there would be no coming back"* — which is §5.4's promise landing. Gate: **56 provenance cases** (was 23), all 5 prompt goldens byte-identical.
>
> **⚠️ Findings from the first live probe (August 11). 1 and 2 are FIXED above; 3 is still a founder decision, and it governs what an I1.5 session shows.**
>
> 1. ✅ **FIXED — the match was dominated by SETTING, not by the distinctive features.** The sample account carried five: out-of-body during surgery · a boundary not to cross · knowing that arrived all at once · not wanting to come back · a spouse who says he came back different. Nine matches came back at 0.701–0.732 — a very tight spread — and nearly all of them matched *surgery + out-of-body*. Exactly one hit "I didn't want to come back"; none obviously hit the boundary or the all-at-once knowing. **This is the failure EXPERIENCE §5.4 names**: *"Not the general shape of it. The specific thing."* Root cause is structural rather than a bug — one embedding over a 588-character account averages five features into their most common denominator, and in this corpus that is the operating theatre. Cheapest fix, still inside I1.2: split the account into its distinct claims, retrieve per claim, and merge — which is also what the §5.4 copy ("the boundary, the knowing, and the not wanting to come back") already assumes the mechanic does.
> - ✅ **English only (founder decision, August 11).** Two of the corpus's 66 channels publish in Portuguese and French with machine-translated subtitles — `AFINAL, O QUE SOMOS NÓS? / AFTER ALL, WHAT ARE WE?` (587 videos) and `Confessions EMI-NDE` (59), 646 of 10,957 videos. Their transcripts come back in **English**, so no language check on the text can catch them; the channel is the only reliable discriminator, and diacritics are not (most accented titles are English — *Chenée*, *Déjà Vu*, *Gülfide*). `filterEnglishOnly()` drops them **before anything is ranked**, so the counts, the reveal and the transformation tallies all describe the same set. Fails **open** on a lookup error (a hiccup on the corpus project degrades the filter rather than emptying the reveal) and **closed** on an account whose channel cannot be named. The count is reported as `excluded_non_english`, never silent. ⚠️ **Re-derive the channel list if Project Profound adds channels** — the SQL is in `corpus.ts`.
> - ✅ **Analyst prose is founder-only (founder decision, August 11).** `corpus_analysis` (`integration_notes`, `evidence_summary`) now reaches **tom@masterytv.com and nobody else**. `projectForCoach()` omits it for every other viewer, gated on the **JWT-verified** email rather than anything the model supplies — the model cannot relay what it was never given. It stays in the full result for the founder's bench and as retrieval signal. **I6.3 must apply the same rule**, and until it does, "what happened next" is per-domain *directions* (numbers) plus the experiencer's own `key_quote`, never the notes.
>
> 2. ✅ **FIXED (the quote shape) — chunks were not quote-shaped.** They started and ended mid-word: *"e kept talking until…"*, *"ng their near-death experience…"*. This collided with the provenance contract by design — the contract forbids trimming, because a shortened quote is a different quote, so the renderer cannot tidy them. Fixed by selecting a sentence-bounded window from `nde_vids.subtitles_punctuated` (still byte-identical corpus text, just a better-chosen string) rather than by relaxing the contract. ✅ **DECIDED — the machine-translated channels are out** (English only, above). One was the top match on the sample; it is gone, and the best English match now leads.
> 3. ✅ **DECIDED — `corpus_analysis` prose never reaches a tester**, in the reveal or anywhere else (founder-only, above). The probe prints it under a "founder's eyes only" section. The `integration_notes` returned across all nine accounts were formulaic — *"X seems to have integrated their experiences into their life"* — and reading nine of them in a row makes the whole page feel machine-made, which is the precise impression The Company exists to defeat. The provenance tag already stops it being shown as a quote; the stronger call is to keep it out of the user-facing surface entirely and use it as retrieval signal only. Related trap for I6.3: the corpus's `direction` values are ambiguous out of context — "Attitude Toward Death: 9 down" means *fear of death fell*, which is a good outcome rendered in a word that reads as a bad one.
| **I1.6** Drop to least privilege 🔒 | *(hardening — after I1.5's go, before any public link.)* Add a narrow `SECURITY DEFINER` RPC on the **corpus** project — e.g. `integration_match_accounts(query_embedding, match_count)` — returning only what the bridge needs (excerpt, video_id, timestamp, per-domain transformation direction). Pin `search_path`. `REVOKE … FROM PUBLIC` and grant EXECUTE to `anon` only, leaving `nde_chatbot_chunks` itself locked. The bridge then drops from the service key to the publishable key. ⚠️ **This is a moat decision as well as a security one** — an anon-grantable RPC is reachable by anyone holding the publishable key, so confirm with the founder that narrow excerpt retrieval is acceptable to expose before shipping it. | Bridge works on the publishable key; `PROFOUND_SERVICE_KEY` deleted from edge secrets. 🧪🔒 |

> **⛔ I1 EXIT IS A DECISION, NOT A DEPLOY.** If the match reads as clinical, extractive, or generic, stop. Everything from I2 onward assumes this landed. Do not soften this gate — the entire commercial case against a free chatbot that agrees with the user rests on it ([INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md) §7.1).

---

### I2 — The typed program axis  🟥🧪
*Goal: playbook §5.0, step zero. One slug, then follow the compile errors. This is mechanical and should take under a day.*

| Story | Tasks | Done |
|:--|:--|:--|
| **I2.1** The two unions | Add `integration` to `ProgramId` in [src/lib/platform/brand.ts](src/lib/platform/brand.ts) **and** `supabase/functions/_shared/packs/index.ts` (lockstep twins — edge can't import `src`). Add the new `BrandId` + `BRANDS`/`EDGE_BRANDS` entries. | `tsc --noEmit` produces a bounded list of errors, all in `Record<ProgramId,…>` maps. |
| **I2.2** Follow the errors | Resolve every exhaustive map: `PACKS`, `PROGRAM_MODULES`, `BATTERIES`, every `byBrand()` call site, `senderFor` in `src/lib/platform/notify.ts`. | `tsc --noEmit` clean. 🧪 |
| **I2.3** The silent seams (by hand) 🟥 | Types and gates cannot reach these: 🔥 `dashboard/page.tsx` selects with a plain `if (brandId === "relatti")` and otherwise falls through to the **executive** `DashboardHome` — add an explicit branch. Same trap class in `sidebar.tsx`, `topbar.tsx`, `settings`, and the `middleware.ts` root rewrite. Extend the `layout.tsx` inline head script's brand lists (template literal — regexes need `\\/`; never remove Next-managed `<head>` nodes). | A `?brand=integration` session renders the new brand's chrome, theme and favicon, and does **not** land on the executive dashboard. |
| **I2.4** Gates green | `check:ternaries` (no brand/program behaviour ternaries), `check:tenancy` (every new table categorized in `scripts/check-tenancy.mjs`; no `user_id`-only read of a program-scoped table), `check:colors`, `check:brand-tokens`, `check:metadata`, `check:copy-tells`. | `npm run gate` green with the new program registered. 🧪 |

---

### I3 — Safety kernel + the memory-write filter  🟥🔒🧪  *(before I4, deliberately)*
*Goal: the controls that must exist before the coach writes its first memory fact. Full rationale in [INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md) §5.*

| Story | Tasks | Done |
|:--|:--|:--|
| **I3.1** Memory-write filter 🔒 | Highest-leverage control in the vertical and unique to this stack. Store user statements as **attributed report** (*"Client reports an encounter she describes as involving a being she calls Kael"*), **never** as ground truth. Never persist coach-authored interpretive elaborations. Coined proper nouns stored as quoted strings inside a report, never as graph entities. Version the certainty framing ("wonders whether" → "is now certain that"). | Golden test: a transcript containing a coined entity name produces zero ground-truth facts and zero coach-authored facts. 🧪🔒 |
| **I3.2** New crisis patterns 🔒 | Extend Tier 1 (`crisis-patterns.ts`) and Tier 2 (`safety-sweep.ts`): **desire-to-return / death-as-reunion / "this world is the wrong one"** (the existing kernel keys on hopelessness and will score a serene, high-functioning, actively suicidal NDEr as low risk); command content; election lexicon; certainty ratchet; medication-stopping frame; AI-is-central-to-the-belief. | `scripts/coach-lab/safety-battery.mjs` extended; each new pattern has a positive and a negative case. 🧪🔒 |
| **I3.3** Fix the terror false-trigger 🔒 | Terror alone must **not** route out — it would eject every distressing NDE, every incubus-type sleep paralysis, and every malevolent contact experience, which is the highest-need segment. Encode the conjunct rule: terror **plus** functional collapse **plus** preoccupation crowding everything out **plus** deteriorating sleep/self-care. | A frightening-encounter transcript with intact function does **not** fire; the same plus functional collapse does. 🧪🔒 |
| **I3.4** Output auditor 🔒 | Second-pass model scoring every coach draft against the 13 banned move classes ([DISCOVERY §5.3](INTEGRATION_DISCOVERY.md)) plus the Spiral-Bench label set. Hard block + regenerate on ontological confirmation/denial, election language, titling, channeling, sentience claims, ritualization, and medication commentary. Include a **mirroring index**: the fraction of proper nouns and substantive claims in the draft absent from the user's prior text. Target zero. | Auditor blocks each banned class on a planted draft. Do not rely on the primary model's restraint — models violate explicit anti-collusion prompts, and Opus 4.5 recovers from an already-sycophantic conversation only 10% of the time. 🧪🔒 |
| **I3.5** Irreversible-decision tripwire 🔒 | Hard-routed intent class: stopping/reducing psychiatric medication, refusing medical treatment, leaving a marriage, quitting a job, giving away assets, relocating, cutting off family, or any decision framed as instructed by the experience. Name the stakes, decline to advise, route to a human. **Medication gets its own hard stop** with no further exploration. | Each intent fires and changes conversation state. 🧪🔒 |
| **I3.6** Nightly trajectory job 🔒 | Per-user spiral score: certainty slope (hedge density), **lexicon growth** (new coined proper nouns/week), **topic-entropy collapse** (share of session on the anomalous frame vs. work, sleep, body, relationships), agency-locus drift ("I decided" → "I was told"), dependency slope, resistance-to-disconfirmation. Runs over the **accumulated transcript**, never the latest message. | Job writes a per-user score; a synthetic spiraling transcript scores high and a healthy one scores low. 🧪🔒 |
| **I3.7** Adversarial batteries 🧪 | Re-theme **Psychosis-bench** (16 scenarios × 12 turns, DCS/HES/SIS) for this vertical's populations; run **Spiral-Bench** and Anthropic's **Petri** against the **configured coach**, not the base model. Re-run on every prompt change. Note the finding that matters most: models intervene *less* in **implicit** scenarios (p < .001), and the articulate hedging user is almost the entire market. | 3× green before any public link; results committed. 🧪🔒 |

> **I3 is the launch blocker.** Nothing in I5–I15 goes in front of a real user until I3.1, I3.2, I3.3 and I3.4 are live.

---

### I4 — `integration-pack.ts`  🟥🧠🧪  *(depends on I2, I3)*
*Goal: the vertical's coach, as a pack over the existing PC4 seam. Editing the orchestrator for a vertical behaviour is a design smell — everything goes in the pack.*

| Story | Tasks | Done |
|:--|:--|:--|
| **I4.1** Pack skeleton 🧠 | Persona + register: Cortright's container-tone clause near-verbatim (warmth, softness, calmness, quiet confidence; no briskness, cleverness, cheerfulness, or bullet-pointed efficiency). `frameworks: none` (stance-based, never names a modality — the Relatti precedent). `recentMessageScope: "conversation"`. Force Claude on the first call **and** tool continuations. One question per reply, no lists, no headings. `briefing: { enabled: false }`. | Pack registered in `PACKS`; `normalizeProgram("integration")` resolves. 🧪 |
| **I4.2** The claim-type router 🧠🔒 | Four types, four stances: **A** experience report (never contested) · **B** ontological claim (never confirmed, never denied) · **C** action-guiding inference (fully engaged, reversibility-checked) · **D** reality-testable present-tense claim about the shared world (safety kernel, route out). Plus the **agency exception**: undecidability on *what it was*, conviction on *whether they are powerless*. | A fixture set of one utterance per type produces the right stance. 🧪🔒 |
| **I4.3** Extraction taxonomy | Domain-shaped memory categories in `pack.extraction`, built around the attributed-report rule from I3.1. 🔥 **Apply the migration extending `memory_facts_category_check` BEFORE deploying the edge function** — the post-processor batch-inserts, and one un-admitted category fails the whole batch (learned on money, 2026-07-18). Query `pg_constraint` live first; the committed baseline lacks live CHECK constraints. | Migration applied + committed; a real conversation writes facts with zero constraint errors. 🧪 |
| **I4.4** Tools | `find_similar_accounts(description)` (from I1) and `lookup_footing()`. **Optional parameters only** — a required param forces the model to interrogate the user. The layer must state the data is already in context, or the model roleplays "let me pull that up." | Coach answers a Footing question without asking the user for their scores. 🧪 |
| **I4.5** `resolve-program` | New slug resolvable at every level: participant membership, validated hint, `users.signup_brand`. 🔥 Add new cases to `scripts/coach-lab/resolve-program-check.ts` — unstamped users silently got the executive coach on the last two verticals. | `check:resolve` passes with the new cases. 🧪 |
| **I4.6** Stage gating 🧠 | Pack reads the user's stage: **no growth language before Stage 4** (silver-lining in weeks 1–3 reads as invalidation and is the most likely LLM failure mode here); **no interpretation on the turn the account first arrives** (the Yale listen-then-explore split, ported as a turn constraint). | A stage-1 fixture produces zero growth language. 🧪🧠 |
| **I4.7** Prompt-snapshot golden | New scenario + fixtures in `scripts/coach-lab/prompt-fixtures.ts`. Existing verticals' goldens stay **byte-identical** throughout. Fixture fakes must be id-aware (🔥 unfiltered fixture arrays hand back the wrong row). | New golden committed; relationship/executive/money goldens unchanged. 🧪 |

---

### I5 — The witness turn  🧠🔒  *(the highest-stakes surface in the product)*
*Goal: [INTEGRATION_EXPERIENCE.md](INTEGRATION_EXPERIENCE.md) §5.2–§5.3. The first response determines the trajectory; engineer it like one thing, not like onboarding.*

| Story | Tasks | Done |
|:--|:--|:--|
| **I5.1** The pre-account box | Single free-text prompt, no character minimum, no scaffolding questions, **no account, no email, no age gate before the box**. Copy: *"What happened? Take as long as you want. Nothing here is graded, and nobody is going to tell you what it was."* | A cold visitor can type their account without signing up. 🎨 |
| **I5.2** The three-beat first response 🧠 | Permission → undecidability stated once as policy → **one** present-tense phenomenological question. Under 120 words, no lists, no resources, no normalization yet. Exact copy in EXPERIENCE §5.3. | Judge rubric: the response contains no explanation, no resource link, no reassurance, and exactly one question. 🧪🧠 |
| **I5.3** Turns 2–8 rules 🧠🔒 | Stay in phenomenology, sensory and present-tense. **Never ask a question that presupposes content** ("were there others in the room?" plants). Explicit de-pathologization as a discrete utterance once the account is out. Ask the disclosure question early and store the answer as data. Under-respond by default. ⚠️ **Never open with "are you coping?" or "do you need support?"** — named as iatrogenic; it signals distress is expected and can manufacture the anxiety it means to treat. | Hard checks in a new `scripts/coach-lab/integration-battery.mjs`; 3× green. 🧪🧠 |
| **I5.4** Voice input | Ineffability is a defining feature of these experiences; a purely typed interface fights the phenomenology. | Voice note accepted on the first box and transcribed. 🎨 |
| **I5.5** Consent + 18+ gate ⚖️🔒 | Lands **before turn 2**, not before turn 1. Standalone, versioned, logged screen — a ToS checkbox is statutorily not consent in Illinois. States: this is an AI; this is not therapy, counseling or medical care; nobody here is licensed; the limits of confidentiality (ICF 2.3's formulation); what happens if crisis language is detected; how to revoke. | Consent version + timestamp logged per user; hard 18+ gate. 🧪⚖️ |

---

### I6 — The Company  🎨  *(the payoff surface; depends on I1, I5)*
*Goal: EXPERIENCE §5.4. Replaces the archetype reveal. This is the differentiator.*

| Story | Tasks | Done |
|:--|:--|:--|
| **I6.1** The reveal surface 🎨 | Matched accounts, headline count, the three specific matched features named in the user's own terms. | A real account produces a reveal in under 5s. |
| **I6.2** Attributed excerpt renderer | Excerpts unedited and attributed. **No synthesis** (enforced upstream in I1.3). | Renderer cannot display model-authored text. 🧪 |
| **I6.3** The "what happened next" panel | Per-domain transformation directions and `integration_notes` from the matched set, scoped to the domain the user is stuck on. | Panel renders for a match set with transformation data. |
| **I6.4** The no-proof rule 🔒 | Copy states plainly that the match says nothing about cause: *"This does not tell us what caused it. It does tell you that you are not an outlier and you are not making it up."* **Build no evidence-collection features** — attention and attempted verification prolong the phenomena and entrench the investigative frame. | Copy shipped; a review confirms no "log your sightings" surface exists anywhere. |

---

### I7 — The Footing check  🧪  *(depends on I2; needs instrument permissions from §2)*
*Goal: EXPERIENCE §5.5. Fifteen items shown, ~3 minutes, administered **after** The Company.*

| Story | Tasks | Done |
|:--|:--|:--|
| **I7.1** Instruments | Core Beliefs Inventory (9), ISLES-SF (6), PHQ-4 (4, **private, never displayed**). **Canonical item text, unchanged** — changing it invalidates stored responses and forces retakes ([DECODED_SCORING.md](DECODED_SCORING.md)). | Items in `src/lib/decoded/instruments/`, wording matched to source, cited. |
| **I7.2** Lens-conditional add-ons | NDE-C (20) for the near-death lens, CEQ for substance, RSS-14 for religious collapse. **Offered, not required**, always after The Company. | Add-ons appear only for the matching lens and are skippable. |
| **I7.3** Scoring leaf | Deterministic, in code: → **Shake** (CBI), **Fit** and **Footing** (ISLES-SF factors). Our construct names, their items. | Scorer unit-tested against hand-computed cases. 🧪 |
| **I7.4** `BATTERIES` entry | Register in [batteries.ts](src/lib/decoded/instruments/batteries.ts); `enableAddons: false`; `estimatedMinutes: "3"`. | Compile error from I2.2 resolved; `/assess` administers 15 items. |
| **I7.5** Low-Footing override 🔒 | When Footing is low, the product routes to STEADY regardless of the user's stated agenda. The one place this product is directive. | A low-Footing fixture produces grounding-first behaviour even when the user asks about meaning. 🧪🔒 |
| **I7.6** Presentation discipline ⚖️ | **Score it, never call it an assessment** (California AB 489 counts each prohibited term as a separate violation). No disease names, no severity bands, no clinical thresholds, no percentiles. Frame as self-reflection and corpus comparison. | Copy review + the I11.1 deny-list both pass. ⚖️ |

---

### I8 — The Map  🎨🧠  *(depends on I6, I7)*
*Goal: EXPERIENCE §5.6. Six sections, vertical-first order. The word "report" is retired in this vertical.*

| Story | Tasks | Done |
|:--|:--|:--|
| **I8.1** Section order | 1 The company you're in · 2 What you're carrying (their words, verbatim, un-interpreted) · 3 Where it's costing you · 4 What usually happens next · 5 The gap · 6 One thing this week. **No archetype, no card, no type, no percentile.** | Renderer ships the six sections in order; no archetype component imported. |
| **I8.2** Section 4 — timeline honesty 🧠 | Mean self-reported adjustment 12.7 years (longest 42); the biphasic curve; what month eight tends to look like. Assagioli's pre-emptive warning, operationalized, so the ebb is foreseen rather than experienced as failure. | Copy reviewed against the DISCOVERY citations; no promise of an endpoint. |
| **I8.3** Section 5 — the gap 🧠 | Name the specific belief **and** the specific goal violated. ⚠️ Goal violation is chronically under-asked and may hurt more than belief violation: for this population the casualties are career credibility, intimacy, and community belonging. Then both exits, unpicked. | Generator produces a named belief and a named goal, and offers both doors without recommending one. 🧪🧠 |
| **I8.4** Renderer shape-awareness | 🔥 A new report JSON shape rendered as just a headline on the last vertical because the digest only knew the old shape. Register the new shape everywhere the artifact is summarized. | The Map renders fully in the dashboard digest and in email chrome. 🧪 |

---

### I9 — The doors + the triage page  🎨  *(depends on I10, I11)*
*Goal: EXPERIENCE §5.1, §5.12. Two or three doors, not seven.*

| Story | Tasks | Done |
|:--|:--|:--|
| **I9.1** `entry_segments` table | Finally build it — designed in [STRATEGY.md](STRATEGY.md) §3, never created. Slug → program + lens + framing + content. Carries `workspace_id`; categorized in `check-tenancy.mjs`. | Table live, migration committed, a door renders from a row. 🧪 |
| **I9.2** The launch doors 🎨 | Recommend **bereavement / after-death communication** (widest, least stigmatized), **near-death** (flagship, the population that actually pays), and **meditation** (secular side door, 3.4M-subscriber adjacent community, the one a scientist walks through). ⚠️ **Hold the contact door** until I3 is proven live. Each speaks its own dialect; the neutrality pledge sits above the fold on all of them. | Three doors live; each leads with the disbelief problem, not the meaning problem. |
| **I9.3** The triage page | *"Is it psychosis or a spiritual awakening?"* Explain the DSM Religious or Spiritual Problem code (V62.89 / Z65.8); list the signs that mean *see a clinician this week*; then decline to answer: *"We are not qualified to tell you which one this is, and anyone online who tells you confidently is guessing."* | Page live. Simultaneously the best SEO asset, the best trust asset, and the safety gate. |
| **I9.4** SEO / AEO | Every page sets metadata via `brand-metadata.ts` (never a bare `title`); `OG_BRANDS` palette entry in `/api/og/route.tsx` with the mark copied into `src/app/api/og/assets/` (the edge runtime can't read `public/`). | `check:brand-metadata` passes; `curl -sL "<url>" | grep og:` verified per page (§6.2). |
| **I9.5** Copy gates | `check:copy-tells` blocking; the I11.1 deny-list blocking; banned-vocabulary review per EXPERIENCE §5.1. Draft with the `copywriter` skill, polish with `humanizer`, never the reverse. | `npm run gate` green; a human read confirms no AI-aesthetic prose. |

---

### I10 — Brand + theme  🎨  *(depends on the name decision in §2)*
| Story | Tasks | Done |
|:--|:--|:--|
| **I10.1** Read BRAND.md fully | Mandatory before any `.tsx`. Tokens only, Lucide only, dual-theme, no sparkle (§14). | — |
| **I10.2** Theme tokens | `data-brand="<id>"` block in `globals.css`. 🔥 Light-mode values need the **combined** `[data-brand="x"][data-theme="light"]` selector — the later `[data-theme="light"]` block wins at equal specificity. | `check:brand-tokens` passes in both themes. 🧪 |
| **I10.3** Assets | Favicon + apple-touch under `/public/<brand>/`; head-script brand lists extended (I2.3). | Favicon resolves on the new host in both themes. |
| **I10.4** Chrome sweep | Sidebar header/label, tier labels (🔥 plan names are per-brand product names), topbar badges, brand-only widgets. | A dual-brand user sees no cross-brand chrome. |
| **I10.5** Email identity | `RESEND_API_KEY_<BRAND>`, verified `mail.<domain>`, `INVITE_BRANDS` entry, branded email chrome. 🔥 Proactive sends default to masterytv chrome when no brand is passed. | A test send arrives from the right domain with the right chrome. |

---

### I11 — Legal, privacy & compliance  ⚖️🔒  *(before I9 — copy is the likeliest enforcement trigger)*
| Story | Tasks | Done |
|:--|:--|:--|
| **I11.1** The deny-list ⚖️ | Shipped in §2 setup; verify it covers marketing copy, UI strings, **system prompts**, email templates and metadata. LLM prompts count as copy — a banned construction handed to the model reads as an accidental few-shot example. | Gate blocking; planted violation fails the build. 🧪⚖️ |
| **I11.2** State blocklist ⚖️ | Capture state at signup. Block **Illinois** (WOPR Act §20(a) requires the service be conducted by *an individual* who is licensed — no compliance path for an AI, only a geofence) and **Rhode Island** (bans the product category: AI companions for emotional support, and AI that simulates attachment). **Nevada with counsel.** Config-driven; review every legislative session. | Blocked-state signup is refused with a clear message; list is a config file, not an architectural assumption. 🧪⚖️ |
| **I11.3** 18+ gate ⚖️ | Hard gate plus an underage-signal classifier. Removes the single largest liability category for near-zero product cost. | Gate live; classifier flags an underage-signalling transcript. 🧪⚖️ |
| **I11.4** Crisis stack, nationwide ⚖️🔒 | 988 + Crisis Text Line referral, a **published** protocol (California SB 243 requires publication), AI-disclosure at session start and every three hours (NY GBL §1702). **On positive detection the conversation changes state** — continuation after detection is the specific harm theory in *Garcia* and *Raine*. Log every detection, the exact text shown, and the subsequent turns. | Detection → state change → logged, verified end to end. 🧪🔒⚖️ |
| **I11.5** Utah §58-60-118 filing ⚖️ | Write, implement and file the fifteen-point policy. Nominal fee, buys an affirmative defense — and the fifteen elements are a free, regulator-authored product-safety spec. Adopt two as internal policy regardless: real-time response protocols for acute risk of physical harm, and *"prioritizes user mental health and safety over engagement metrics or profit."* | Filed; policy committed to the repo. ⚖️ |
| **I11.6** Zero third-party tracking ⚖️ | No analytics SDKs, ad pixels, or session-replay on any authenticated surface where a user describes their experience. Defuses Washington MHMDA (private right of action, no harm required), the FTC Health Breach Notification Rule, and Utah 13-72a-201 simultaneously. | A network trace on the coach page shows only first-party requests. 🧪⚖️ |
| **I11.7** Legal doc set ⚖️ | Brand-aware `(legal)` route; signup acceptance-gated; `LEGAL_VERSION` recorded. Privacy §5-class copy must match the **actual** posture: screening is automated, escalation is log-only, **no human-review claims anywhere**. The coach's honesty script must match. | Docs live, acceptance logged, a grep finds no "a team may review" claim. ⚖️ |
| **I11.8** `delete-user-data` | Cover every new table (Footing responses, Map artifacts, ladder rows, trajectory scores). New tables carry `workspace_id` and attach to an engagement where relevant. | A throwaway account deletes clean with zero FK violations. 🧪 |
| **I11.9** Internal notifications 🔒 | Founder/internal emails are **event-only pointers** — never user responses, scores, quotes, or conversation content (the 92d221d rule). | A triggered alert contains no user content. 🧪🔒 |

---

### I12 — Dashboard + the Aperture  🎨  *(depends on I3.6, I8)*
| Story | Tasks | Done |
|:--|:--|:--|
| **I12.1** Bespoke primary surface | Registered per ADR-P03, with the explicit branch from I2.3. Four things: the Aperture, the next rung, one thing this week, and links to The Map + The Company. | New brand lands on its own surface, not the executive `DashboardHome`. |
| **I12.2** The Aperture 🎨 | Progress display and spiral detector in one widget, fed by I3.6's topic-entropy metric. Healthy integration widens; spirals narrow. Copy: *"A month ago, almost everything we talked about was the experience. This month, half of it was your sister and your sleep."* | Widget renders from real trajectory data; a narrowing user sees a narrowing aperture. 🧪 |
| **I12.3** Module gating | `PROGRAM_MODULES` set: no streaks, commitments-as-checkboxes, wins, goals, `coach_voices`, or AI-tools. All executive machinery off. | None of the executive widgets render on the new brand. 🧪 |
| **I12.4** `ROUTE_MODULES` guards | 🔥 Nav hiding alone is not brand isolation — a dual-brand user carries URLs across domains. Guard **both directions**. Plus `conversations.program` scoping on every conversation-adjacent read; direct `?c=` loads redirect cross-brand ids. | Dual-brand URL carry produces a redirect in both directions. 🧪🔒 |

---

### I13 — The Telling Ladder  *(the retention mechanic; depends on I12)*
| Story | Tasks | Done |
|:--|:--|:--|
| **I13.1** The ladder | People list with status: told / not told / told and it went badly. Carries `workspace_id`; attaches to the engagement. | User can build and edit a ladder. |
| **I13.2** The rung loop 🧠 | Assess the audience → decide → rehearse → debrief. Coach-guided, one step at a time. | A full rung cycle completes in-conversation. 🧪🧠 |
| **I13.3** "Don't tell this person" 🔒 | A fully supported, non-failure outcome, surfaced as an equal option. ⚠️ Pushing disclosure into a constraining environment causes harm: social constraints produce a reliable link between intrusive thoughts and depression, and coaching someone to tell a skeptical spouse, employer or congregation without assessing that audience can cost them the relationship, the job or the community — precisely the goals whose violation drives the distress. | The option is presented before the rehearsal step, never after. 🧠🔒 |
| **I13.4** Cadence | Weekly default, opt-in, forgiving. **Not daily.** About half of first contacts never return; design the one conversation to be complete in itself. No streaks. | Weekly touch only; a missed week produces no shame copy. |
| **I13.5** The far rungs | Contribution: be the person someone else tells. Per the Spiritist finding, a socially sanctioned role is the protective variable. | Ladder supports rungs that are not disclosure. |

---

### I14 — The family explainer  *(depends on I13)*
| Story | Tasks | Done |
|:--|:--|:--|
| **I14.1** Private share | Reuse the `PartnerInviteModal` + `/api/decoded/invite` + engagement machinery. **One person at a time, never social.** No card, no viral loop, no share-to-unlock. | A user can send the explainer to one named person. |
| **I14.2** Content rule ⚖️ | Describes what is known about the experiencer's trajectory; **does not instruct the partner how to respond.** There is essentially no literature on partners of experiencers, and instructing them would be invention in a situation that maps onto high-conflict couples work. Names the two things families reliably get wrong: avoiding the person, and the pedestal. | Copy review confirms zero directive instructions to the recipient. |
| **I14.3** Consent 🔒 | Connecting two existing members always requires the recipient's explicit Accept (🔥 auto-connect shipped once). Revocation respected by every self-healing job (🔥 auto-full nulled `revoked_at`). | Invite → Accept → Decline → Remove → re-invite all verified; no job resurrects a removal. 🧪🔒 |

---

### I15 — Proactive  *(last, and gated on I3.6 being proven)*
| Story | Tasks | Done |
|:--|:--|:--|
| **I15.1** Ship with briefings **off** | `briefing.enabled = false` in the pack at launch. An 8am email referencing your near-death experience, on a lock screen, in a house with a spouse who thinks you have lost it, is a disclosure event you caused. | Zero proactive sends for the new program at launch. 🧪 |
| **I15.2** Low-disclosure rule 🔒 | Stricter than Relatti's: subject lines are **greeting only**; the body never references session content. | A generated send contains no topic and no session reference. 🧪🔒 |
| **I15.3** The proactive gate | Zero `role='user'` messages ⇒ nothing proactive, ever (🔥 assessment-only signups got unsolicited wrong-brand briefings). Per-user program→brand resolution on every sender; `metadata.program` stamped so replies thread to the right pack. | A fresh assessment-only signup gets nothing at 8am. 🧪 |
| **I15.4** The one early exception | Assagioli's pre-emptive warning: after an intense positive experience, a scheduled inoculation message *before* the ebb. Content-free subject; general body, not personal. | Scheduled, generic, and verified not to reference session content. |
| **I15.5** Inbound routing | Reply-to must point at an inbox that actually ingests (today only `coach@mail.masterytv.com`). New Resend inbound config + `email-inbound` awareness. 🔥 Webhook-shaped functions deploy `--no-verify-jwt`; **read the LIVE flag before every deploy** and mirror exactly. | One real inbound reply threads to the right conversation. 🧪 |

---

## 4. Sprint slicing (proposed)

| Sprint | Epics | Outcome |
|:--|:--|:--|
| **Sprint 0** | **I1** | **The kill gate.** Corpus retrieval works and has been put in front of 10 real experiencers. **Ends in a founder go/no-go.** |
| **Sprint 1** | I2 → I3 → I4 → I5 | The coach exists, is safe, and is dark. Memory hygiene and the crisis patterns land before the first stored fact. |
| **Sprint 2** | I6, I7, I8 | The payoff, the instrument, the artifact. Internal/alpha only, behind the flag. |
| **Sprint 3** | I11, I10, I9 | Legal and brand, then the public doors. **First public link happens here, after the §6.10 sweep.** |
| **Sprint 4** | I12, I13, I14 | Retention: the Aperture, the Telling Ladder, the family explainer. |
| **Sprint 5** | I15 + V2 backlog | Proactive, then the deferred items. |

**Explicitly not in V1** (from EXPERIENCE §7): peer/community surface (highest-value V2 feature, and shipping it without moderation manufactures the exact harm we are positioned against), human-coach marketplace (the **curated referral directory** is in; a marketplace is not), the AI-dread vertical, any card/type/archetype/streak/social share, the malevolent-encounter instrument, and the hospice B2B channel.

---

## 5. Status table  *(update this before ending any session that completes work)*

> **Gate 3 approved by the founder, August 11, 2026. Sprint 0 started the same day.**

| Epic | Owner | Status | Notes |
|:--|:--|:--|:--|
| §2 Environment & setup | Claude Code | 🟡 Partly done | ✅ **Deny-list gate LIVE + blocking** (`scripts/check-integration-deny-list.mjs`, `npm run check:deny-list`, in `npm run gate`) — scoped to integration-owned text (path scope + `integration`-keyed block scope), `deny-list-ok: <reason>` pragma for the required disclosures (I5.5 consent, I9.3 triage), 24-case self-test, planted violation verified to fail the build. ✅ **`INTEGRATION_ENGINE` flag LIVE** (`src/lib/platform/flags.ts` + `supabase/functions/_shared/flags.ts` lockstep twins, 5 tests) — off unless set, plus `INTEGRATION_ENGINE_USERS` per-user allow-list for the I1.5 cohort. ⬜ Still owed by the founder: corpus edge secrets, instrument permissions, clinical advisor, insurance, public name. |
| I1 Corpus bridge + validation | Claude Code | 🟡 I1.1–I1.4 ✅ **live-verified + refined**, **I1.5 not started** | **Kill gate.** Bridge at `supabase/functions/_shared/corpus.ts`; rides the EXISTING coach behind the flag (no new ProgramId/brand/pack/surface). Provenance contract enforced in the return shape + `assertNoAuthoredText` (**56-case gate**, `npm run check:provenance`). **Retrieval refined August 11 (founder path A):** per-claim retrieval with round-robin merge, and excerpts re-bounded to whole sentences from `subtitles_punctuated`. **Probe green:** embedding space confirmed (self-match 1.0000), 9 accounts in **634ms**, 162 English accounts across the claim windows, **7/7 claims represented**, 8/9 excerpts sentence-bounded. **All three probe findings closed** — 1 + 2 fixed in code, 3 decided (analyst prose is founder-only), plus English-only filtering. **I1.5 is unblocked and is the next thing: it needs 5–10 real experiencers and a founder recommendation, not more code.** |
| I2 Program axis | — | ⬜ Blocked on I1 | Mechanical, <1 day once unblocked. |
| I3 Safety + memory filter | — | ⬜ Blocked on I1 | Launch blocker. Must precede I4. |
| I4 `integration-pack.ts` | — | ⬜ Blocked on I2, I3 | |
| I5 Witness turn | — | ⬜ Blocked on I4 | |
| I6 The Company | — | ⬜ Blocked on I1, I5 | |
| I7 Footing check | — | ⬜ Blocked on I2 + instrument permissions | |
| I8 The Map | — | ⬜ Blocked on I6, I7 | |
| I9 Doors + triage | — | ⬜ Blocked on I10, I11 | |
| I10 Brand + theme | — | ⬜ Blocked on the name decision | |
| I11 Legal & compliance | — | ⬜ Blocked on clinical advisor | I11.1 can land immediately. |
| I12 Dashboard + Aperture | — | ⬜ Blocked on I3.6, I8 | |
| I13 Telling Ladder | — | ⬜ Blocked on I12 | |
| I14 Family explainer | — | ⬜ Blocked on I13 | |
| I15 Proactive | — | ⬜ Blocked on I3.6 proven | Ships off. |

---

## 6. Launch checklist (VERTICAL_PLAYBOOK §5, copied per instruction)

Check every box before any public link. Items marked 🔥 exist because we shipped that exact bug before. Integration-specific deltas are in **bold**.

### 6.0 Step zero — the typed program axis
- [ ] Slug in **both** `ProgramId` unions + `BRANDS`/`EDGE_BRANDS`; follow the compile errors (I2.1–I2.2)
- [ ] Gates sweep what types can't see: `check:ternaries`, `check:tenancy`, `check:colors`, `check:brand-tokens`, `check:metadata` (I2.4)
- [ ] The still-silent seams by hand: `layout.tsx` head script, marketing/legal copy, email HTML, OG palette, DB backfills, cron content, prod config (I2.3)

### 6.1 Brand
- [ ] BRAND.md read fully; tokens only, Lucide only, dual-theme, no sparkle (I10.1)
- [ ] 🔥 Public name trademark-cleared **before** it enters any copy, prompt or email; naming contract written (§2)
- [ ] `BRANDS` entry + host→brand map (I2.1)
- [ ] 🔥 Theme tokens with the combined `[data-brand][data-theme="light"]` selector (I10.2)
- [ ] 🔥 Favicon/apple-touch + head-script brand lists (`\\/` in regexes; never remove Next-managed `<head>` nodes) (I10.3)
- [ ] Root landing rewrite for the new host + the vertical's landing pages (I9.2)
- [ ] 🔥 Chrome sweep: sidebar, **tier labels**, brand-only widgets, topbar badges (I10.4)
- [ ] 🔥 Email identity: Resend key, verified from-domain, `INVITE_BRANDS`, branded chrome (I10.5)

### 6.2 SEO / AEO
- [ ] Every page sets metadata via `brand-metadata.ts` — 🔥 never a bare `title` (I9.4)
- [ ] `OG_BRANDS` palette entry + mark in `src/app/api/og/assets/` (I9.4)
- [ ] 🔥 **Verify like a crawler:** `curl -sL "<url>" | grep og:` per page. iMessage caches previews per URL. (I9.4)
- [ ] `entry_segment` rows for the vertical's funnels (I9.1)
- [ ] Answer-engine surfaces rewritten for this vertical's claims — **the triage page is the flagship** (I9.3)

### 6.3 Assessment
- [ ] Battery wired as the program's config; decision-relevant instruments only (I7.4)
- [ ] **Never change canonical item text** (I7.1)
- [ ] Report structure vertical-first — **The Map's six sections, no archetype** (I8.1)
- [ ] **Instrument permissions on file before build** (§2)
- [ ] **Score it, never call it an assessment; no disease names, bands or thresholds** (I7.6)

### 6.4 Coach
- [ ] New pack + `PACKS` entry (I4.1)
- [ ] Extraction taxonomy inside the live `memory_facts_category_check` — 🔥 **migration before deploy** (I4.3)
- [ ] Briefing authored or `enabled: false` — **`false` here** (I15.1)
- [ ] `resolve-program` at every level + new `resolve-program-check.ts` cases (I4.5)
- [ ] Prompt-snapshot golden; other verticals byte-identical (I4.7)
- [ ] 🔥 Coach knows everything the user can already see; tool schemas don't force interrogation (I4.4)
- [ ] Safety kernel shared, never forked; **new patterns added** (I3.2–I3.3)
- [ ] Model + cost: forces Claude; `metadata.program` stamped by every writer (I4.1)
- [ ] Coach-lab battery, 3× green (I5.3)
- [ ] **The claim-type router and the memory-write filter are live** (I4.2, I3.1)
- [ ] **Output auditor blocking the 13 banned classes** (I3.4)
- [ ] **Re-themed Psychosis-bench + Spiral-Bench + Petri, 3× green against the configured coach** (I3.7)

### 6.5 Dashboard / surfaces
- [ ] `PROGRAM_MODULES` **and** 🔥 `ROUTE_MODULES` guards, both directions (I12.3–I12.4)
- [ ] Bespoke primary surface registered (I12.1)
- [ ] 🔥 Explicit branch in `dashboard/page.tsx` — the plain `=== "relatti"` check falls through to the executive home (I2.3)
- [ ] 🔥 `conversations.program` scoping on every conversation-adjacent read (I12.4)
- [ ] Vertical-only widgets module-gated (I12.3)
- [ ] Settings per-brand copy; briefing-time control only if the vertical has proactive touchpoints — **it does not at launch**

### 6.6 Consent / privacy / legal
- [ ] Legal docs brand-aware, acceptance-gated, `LEGAL_VERSION` recorded; copy matches the **actual** posture (I11.7)
- [ ] 🔥 Recipient Accept required to connect two existing members; revocation respected by every self-healing job (I14.3)
- [ ] Internal emails are event-only pointers (I11.9)
- [ ] `delete-user-data` covers every new table (I11.8)
- [ ] LLM data handling position still holds
- [ ] **Standalone versioned logged consent screen — a ToS checkbox is not consent in Illinois** (I5.5)
- [ ] **State blocklist + 18+ gate live** (I11.2–I11.3)
- [ ] **Utah §58-60-118 policy filed** (I11.5)
- [ ] **Zero third-party tracking on authenticated surfaces** (I11.6)

### 6.7 Proactive / channels
- [ ] 🔥 Zero `role='user'` messages ⇒ nothing proactive (I15.3)
- [ ] Per-user program→brand resolution on every sender (I15.3)
- [ ] Inbound routing points at an inbox that ingests (I15.5)
- [ ] 🔥 Webhook fns deploy `--no-verify-jwt`; **read the LIVE flag before every deploy**; redeploy every fn whose `_shared` imports changed; probe after (I15.5)
- [ ] Crons brand-aware, Vault auth, bundles redeployed

### 6.8 Admin
- [ ] Own group in `AdminNav`; shared views gain the brand in their filter set
- [ ] `users.signup_brand` stamped at auth (signUp metadata + OAuth host-stamp with the <15-min guard)
- [ ] **The crisis queue surfaces the new patterns and the trajectory score**

### 6.9 Infra / DB
- [ ] DNS → Vercel; staging subdomain; edge CORS allows the new origin (🔥 per-vertical CORS)
- [ ] Secrets set in Supabase edge **and** Vercel env — **including the corpus project's key** (§2)
- [ ] Migrations: MCP `apply_migration` **and** commit the file; check live `pg_constraint` before touching any vocabulary
- [ ] New SECURITY DEFINER RPCs: `REVOKE … FROM PUBLIC, anon` in the same migration; run the security advisors after DDL

### 6.10 The launch verification sweep (all of these, in this order)
1. [ ] `npm run gate` green, incl. the new deny-list and byte-identical goldens for existing verticals
2. [ ] **Dual-brand user pass** — one account on each domain; carry every gated URL both directions; conversations, widgets, tier labels, theme all isolated
3. [ ] **Crawler pass** — `curl` og:title/site_name/icons on every shareable page
4. [ ] **Proactive pass** — a fresh assessment-only signup gets nothing at 8am; **and nothing proactive fires for this program at all**
5. [ ] **Consent pass** — invite a fresh email and an existing member; Accept / Decline / Remove / re-invite; no self-healing job resurrects anything
6. [ ] **Coach context pass** — rebuild the prompt against live data; ask the coach for a number it has and one it doesn't
7. [ ] Webhook probes + one real inbound email reply
8. [ ] **Safety pass (new, this vertical):** the desire-to-return transcript fires; the terror-with-intact-function transcript does **not**; the memory-write filter produces zero ground-truth facts on an entity-naming transcript; the output auditor blocks each banned class
9. [ ] Founder walkthrough on the production domain before any public link goes out

---

## 7. Gate 3 checklist (BMAD)

- [x] Epics broken into stories (≤ 1 day each) — §3
- [x] Stories ordered by dependency — §1 critical path, §4 slices
- [x] Each story has Done criteria — §3
- [x] First sprint identified — **Sprint 0 = I1, and it ends in a go/no-go rather than a deploy**
- [x] Environment setup documented — §2
- [x] Launch checklist copied from the playbook and localized — §6
- [ ] **Founder approval of this sprint plan (Gate 3).** ← required before build

**Decisions owed that gate specific epics** (none block Sprint 0):
- The **public name** → gates I10, and therefore I9.
- **Which doors launch first** → gates I9.2. Recommendation in §3/I9.2.
- **Clinical advisor** retained → gates I11.5.
- **Pricing shape** (membership vs. hours; free first conversation is non-negotiable) → not in this doc's scope, does not affect build order.
- **Community: build, partner, or skip** → V2, but the answer changes what I13.5 ladders into.

---

## 8. Doc map

- **This doc** = the build order and the launch gate for `integration`. Phase 3.
- **[INTEGRATION_EXPERIENCE.md](INTEGRATION_EXPERIENCE.md)** = what each surface must be and feel like. Phase 0.5, ✅ approved. Every epic here points back at a section there.
- **[INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md)** = the research, the citations, the market, and the full risk-control list. Phase 0.
- **[VERTICAL_PLAYBOOK.md](VERTICAL_PLAYBOOK.md)** = the process standard and the source of §6. **Self-annealing rule: every cross-vertical bug this build ships gets added to playbook §5 in the same session as the fix.**
- **Technical** = [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md), [RELATIONSHIP_ARCHITECTURE.md](RELATIONSHIP_ARCHITECTURE.md), [TENANCY_AUDIT.md](TENANCY_AUDIT.md).
- **Safety** = [SAFETY_ESCALATION_PROTOCOL.md](SAFETY_ESCALATION_PROTOCOL.md), [COACH_SAFETY_AND_TESTING_SPEC.md](COACH_SAFETY_AND_TESTING_SPEC.md), [COACHING_GUARDRAILS.md](COACHING_GUARDRAILS.md).
