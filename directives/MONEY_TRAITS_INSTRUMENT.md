# **MoneyTraits™ — The Instrument (v1)**

> 🏷️ **v1.2 BRAND RENAME (founder, 2026-07-20):** this doc was `MONEY_MAPS_INSTRUMENT.md`; the public brand is now **MoneyTraits** on **moneytraits.com** ("Money Maps"/"MoneyMaps" is a third party's registered mark — never user-facing). The four dimensions are user-facing **traits** (this doc keeps its historical "Map" construct language); GUARD/DRIVE/MIRROR/SHADOW, the Fear, and ALL storage keys (`money_maps`, `sections.money_map`, LEAP) are unchanged. See [MONEY_TRAITS_RENAME.md](MONEY_TRAITS_RENAME.md).
>
> **Author:** Claude Code (Orchestrator), commissioned by Thomas Wood · **Date:** July 17, 2026
> **Status:** 🟢 **v1 FOUNDER-APPROVED for beta (2026-07-17)** — ship as-is, tune from real users (§8). Scoring locked + self-checked (`scripts/money-maps-scoring.mjs`, 7 boundary tests green). Becomes code in the Decoded engine (`program=money`).
>
> ⚠️ **v1.1 TERMINOLOGY RENAME (founder, 2026-07-20) — read before quoting this doc's labels.** Two user-facing terms changed everywhere on the site:
> **"Leak" → "the Challenge"** (the archetype's overclocked cost) and **"THE LEAP" → "the Fear"** (the fifth dimension). The *constructs, items, scoring, and cutpoints are unchanged* — only the public vocabulary moved. **Storage keys keep the legacy names** (`sections.money_map.leak`, `.leap`, `dims.LEAP` — live rows + deployed edge functions read them; the seam is documented in `src/lib/decoded/scoring/money-maps.ts`). In this doc, LEAK/LEAP below are the internal construct names; every user-visible surface (card, report, landing, coach prompts) must say Challenge / the Fear. The scorer is also no longer the whole report: a long-form LLM narrative now layers on top (see MONEY_EXPERIENCE.md §4 correct-course note).
> **Parents:** [MONEY_EXPERIENCE.md](MONEY_EXPERIENCE.md) §4 (the design decision) · [MONEY_DISCOVERY.md](MONEY_DISCOVERY.md) (why money-psychology) · this doc = the item bank + scoring + archetypes.
> **IP position:** every item below is **our own wording**; the construct *names* (GUARD/DRIVE/MIRROR/SHADOW/LEAP) are ours; the *archetypes* are ours; "MoneyTraits™" is our mark. We never use "Money Scripts®" (Klontz's trademark) or KMSI-R items. We stand on the *science of money beliefs* (a body of ideas, not copyrightable), retuned for entrepreneurs. **Item text is canonical once shipped** — changing it invalidates stored responses (`DECODED_SCORING.md` rule).

---

## 1. The five dimensions

Four **core Maps** describe *who you are with money* (stable → they generate your archetype + card). **THE LEAP** is a *state* — how much fear is currently gating your edge (→ the coaching entry point, your "what's stopping you"). Every Map is framed as an **asset with a governor**, never a pathology.

| Map | Reads | The edge (dialed right) | The overclock (dialed too high) |
|:--|:--|:--|:--|
| **GUARD** | protect · control · watch the downside | discipline, resilience, never blows up | worry that won't update, can't enjoy, fear-based "no"s |
| **DRIVE** | more · fuel · progress-as-proof | ambition, work ethic, momentum | the moving goalpost, overwork, "I'll relax when…" |
| **MIRROR** | signal · worth · being seen | standards, the drive to level up | worth riding on the number, comparison, image-spend |
| **SHADOW** | money-as-suspect · undeserving | values-grounded, immune to greed | undercharging, avoiding the numbers, "fine with less" as a cage |
| **THE LEAP** ⭐ | fear of failure **and** fear of success · risk posture | *(a state, not a strength)* — knowing what gates you | plays small, dread-at-the-threshold, protects instead of building |

---

## 2. The item bank (16 items, 1–6 agreement)

Scale: **1 = Strongly disagree · 6 = Strongly agree.** Presented as **clickable chips** (6 options) — the entry-friction decision. Order is randomized at delivery; grouped here by Map. All first-person, entrepreneur-situated, self-revealing.

**GUARD**
- G1. "I sleep better when I know exactly where my money stands, down to the dollar."
- G2. "Spending money I've worked hard for makes me uneasy — even when I can clearly afford it."
- G3. "I've talked myself out of a good opportunity because committing the money felt too risky."

**DRIVE**
- D1. "When I hit a money goal, the number I'm chasing quietly moves up almost immediately."
- D2. "I tell myself I'll ease up and enjoy things *once* I reach the next milestone."
- D3. "Most of what's stressing me right now, more money would solve."

**MIRROR**
- M1. "How much I'm earning affects how much I respect myself."
- M2. "I track how my success stacks up against my peers more than I'd like to admit."
- M3. "Part of why I want to make it big is so certain people finally take me seriously."

**SHADOW**
- S1. "There's a money task or number I keep avoiding, even though I know I should face it."
- S2. "I undercharge, or hesitate to raise my prices, even when my work is worth more."
- S3. "Some part of me feels that *really* wanting wealth is a little greedy or unspiritual."

**THE LEAP** (4 items — the signature dimension carries an extra)
- L1. "The fear of failing again with money makes me play smaller than I could." *(fear of failure)*
- L2. "Quietly, I wonder if I'd lose myself — or who I'd become — if I actually got what I want." *(fear of success)*
- L3. "I'd rather protect what I have than risk it for a shot at something much bigger." *(risk posture)*
- L4. "When I picture my business really taking off, part of me feels dread as much as excitement." *(the tell — success-ambivalence)*

> **Why these are ours, not paraphrases:** they're written around *founder situations* (pricing, raising, launching, protecting) and two of them (L2, L4) probe **fear of success/identity** — a facet the classic four money scripts don't center. S2 (undercharging) is likewise entrepreneur-native. This is the "viable difference," not a rename.

---

## 3. Scoring (precise algorithm — reference implementation verified)

All 16 items are **positively keyed** to their Map (agree = more of the construct) — so scoring is plain means, no reverse-coding. (Adding a few reverse-keyed items to catch acquiescence bias is a v2 hygiene refinement, §8.)

1. **Dimension score** = mean of that Map's items, 1–6 (GUARD/DRIVE/MIRROR/SHADOW = 3 items; LEAP = mean of L1–L4). **Rank on the raw (unrounded) means; round only for display** — so near-ties don't collapse spuriously.
2. **Dominant / secondary Map** = the top two of the **four core Maps** (LEAP excluded — it's a state, not an identity). **Exact ties** (rare, since means are near-continuous) resolve by a **fixed priority order — DRIVE > GUARD > SHADOW > MIRROR** — purely so identical answers always yield an identical result. The order is a determinism convention, not a claim one Map "beats" another; it's tunable.
3. **Overclock flag:** any core Map with mean **≥ 4.0** is "running hot" — the coach leads with its governor (the leak), not its edge.
4. **THE LEAP band** (clean cutpoints, no gaps): **Low < 2.75 · Moderate 2.75–3.99 · High ≥ 4.0.** Plus a **tilt** from the two facets — failure = mean(L1, L3), success = mean(L2, L4): if they differ by **≥ 0.5** the higher one wins (*fear-of-failure* vs *fear-of-success* — the rarer, higher-value read); otherwise *balanced*. Tilt is decision-relevant mainly when the band is Moderate/High.
5. **Output bundle** (feeds the card + the reveal): `{ dims{5}, dominant, secondary, archetype, overclocked[], leap{score, band, tilt, failFacet, succFacet} }`.
6. Fully **deterministic**, scored in code (reuse the Decoded scoring-engine pattern). Nothing here needs an LLM — only the reveal *narration* (§6) does; the scoring never does. Reference implementation (Node, runnable) lives with this spec; drops into the Decoded engine as typed TS under `program=money`.

---

## 4. The archetypes (dominant × secondary of the 4 core Maps → 12 named types)

Each carries **one edge and one leak** (never flattery-only — the anti-cringe rule; `MONEY_VIRAL_GTM.md` §5). **Naming principle (locked 2026-07-17): the archetype name is a badge the person wears with pride or intrigue — the honesty lives in the LEAK line, never smuggled into the name.** (That's why "Conflicted," "Half-Lit," "Chaser," and a doubled "Reluctant" were cut.) Derivation (dominant→secondary) is fixed; names are v1.

| Dominant → Secondary | Archetype | Edge | Leak |
|:--|:--|:--|:--|
| GUARD→DRIVE | **The Fortress Builder** | builds safe and compounds; never blows up | too walled-in to make the big leap — a treadmill with a moat |
| GUARD→MIRROR | **The Quiet Titan** | composed, credible, controlled | guards so hard the win never feels like enough to enjoy |
| GUARD→SHADOW | **The Vault** | disciplined, immune to greed | sits on opportunity; undercharges to stay safe |
| DRIVE→GUARD | **The Relentless Builder** | high-output founder, ambition with brakes | the moving goalpost; can't enjoy the climb |
| DRIVE→MIRROR | **The Mogul** | enormous motivation, plays big | worth rides on the scoreboard; never arrives |
| DRIVE→SHADOW | **The Reluctant Rainmaker** | ambitious *with* a conscience | self-sabotages at the threshold; undercharges what they're best at |
| MIRROR→DRIVE | **The Headliner** | magnetic, sells the dream, raises the room | builds for the image; can feel hollow at the top |
| MIRROR→GUARD | **The Curator** | tasteful, protects the brand, credible | spends to signal; comparison quietly eats them |
| MIRROR→SHADOW | **The Aspirant** | high standards, reaching to matter | the gap between the image projected and the worth felt |
| SHADOW→GUARD | **The Monk** | grounded, principled, low-needs | "I'm fine with less" as a cage; leaves money *and* impact on the table |
| SHADOW→DRIVE | **The Heart-First Creator** | mission-first, builds things that matter | won't charge what it's worth; guilt throttles the ambition |
| SHADOW→MIRROR | **The Understated** | values-driven, quietly wants to matter | torn between "I don't care about money" and "I want to be respected" |

> *(Tom's own KMSI-R profile — low status, mild avoidance, high vigilance/focus — would land near **The Monk** or **The Vault**, with a **High, success-tilted LEAP.** That's the exact reveal his transcript produced by hand.)*

---

## 5. The card (shareable artifact)

```
  MONEY MAPS™
  ┌─────────────────────────────┐
  │  THE RELENTLESS BUILDER      │   ← archetype name
  │  DRIVE · guarded             │   ← dominant · secondary
  │                              │
  │  ⚡ Edge:  You out-work the   │   ← one edge
  │     room and never blow up.  │
  │  ⚠ Challenge: The finish line │   ← one challenge (stored key `leak`)
  │     keeps moving.            │
  │                              │
  │  THE FEAR: High — leaning to │   ← the state / hook
  │  fear of success.            │
  │                              │
  │  built on the science of     │   ← science-first footer
  │  money beliefs · momatti     │
  └─────────────────────────────┘
```
Rendered via the existing archetype-card + OG pipeline. One edge + one leak keeps it credible and shareable; the LEAP line is the intrigue that makes people click to the coach. BRAND.md-compliant (tokens, no emoji-clipart — the ⚡/⚠ above are placeholders for Lucide marks).

---

## 6. The reveal (Rung 1 — how the coach opens off the result)

Scoring is deterministic; **the reveal is written live** by the coach from `{archetype, dominant, secondary, overclocks, LEAP band + tilt}` + the ONE type-selected question. The template (voice = the §10 golden-fixture register):

> "You came out **The Relentless Builder** — so you already know how to grind, and you don't blow yourself up doing it. But here's what the card can't show you: your **LEAP is high, and it's tilted toward fear of *success*, not failure.** That's the rarer one, and the sneakier one — it doesn't feel like fear, it feels like caution. Before I say more, one question: **when you picture the business actually taking off, what's the first thing you're afraid you'd lose?**" *(chips: "My freedom / time" · "Who I am" · "The people close to me" · "Nothing — I'd love it" · [type your own])*

**Type-selected opening question by dominant Map** (the coach picks one):
- DRIVE → "Does 'enough' have an actual number — or does the finish line keep moving?"
- GUARD → "When did the caution start — has it always been there, or did something teach it to you?"
- MIRROR → "Whose respect are you actually trying to win?"
- SHADOW → "What's the money conversation or number you've been avoiding?"

High-LEAP always gets named in the reveal regardless of Map — it's the coaching entry point.

---

## 7. Progress re-score (retention + the authority engine)

Re-administer quarterly; show the **overclock dials coming down** and the **LEAP band dropping** — the numeric "it's working" proof with no bank data (`MONEY_EXPERIENCE.md` §3/§11). The delta is both the retention moment and the testimonial that powers the results-based authority strategy. (Item text must stay canonical for deltas to be valid.)

---

## 8. Ship v1, tune from beta (founder decision, 2026-07-17)

**Decision: ship this instrument as-is for the beta and learn where it lands from real users** — the upfront take-it-yourself tuning gate is skipped in favor of live data (n=many > n=1). Scoring is locked and self-checked (`scripts/money-maps-scoring.mjs`). To make "see where it lands" produce real signal, **instrument the beta from user #1:**

- ⭐ **The signal that matters most — "did this land?"** One tap after the reveal: *"Did that feel true?"* ✓ / ✗ (+ optional line). It is at once the instrument's validity check, the reveal-quality metric, and the activation metric. Everything else is secondary to this.
- **Archetype distribution** — flag dead types (nobody lands there) or a swallower (one type >~25%); either points at an item or a cutpoint to adjust.
- **Item discrimination** — per-item response spread + item→Map correlation; an item everyone answers the same way, or that doesn't move with its Map, gets rewritten.
- **LEAP band spread + tilt frequency** — confirm the bands split the population usefully and that success-tilt shows up as the rarer read we claim.
- **Quarterly re-score deltas** — the retention + testimonial engine, and the real test that the instrument is sensitive to change.

**Hold for post-beta (not pre-):** 3→4 items/Map if a Map reads thin; a few reverse-keyed items for acquiescence bias; archetype-name/copy sharpening. Change item text only deliberately — it invalidates stored responses (`DECODED_SCORING.md`).

**Build path:** items + scoring → the Decoded engine under `program=money` (**reproduce the 7 boundary tests in `scripts/money-maps-scoring.mjs`** as the TS unit tests); archetypes → the card renderer; the reveal → the money Coach Pack's first-message builder.
