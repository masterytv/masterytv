# **Money Maps™ — The Instrument (v1)**

> **Author:** Claude Code (Orchestrator), commissioned by Thomas Wood · **Date:** July 17, 2026
> **Status:** 🟡 DRAFT v1 — the implementation spec for the assessment. Take it yourself first (the KMSI-R dry-run pattern); refine wording; then it becomes the code (scored in the Decoded engine).
> **Parents:** [MONEY_EXPERIENCE.md](MONEY_EXPERIENCE.md) §4 (the design decision) · [MONEY_DISCOVERY.md](MONEY_DISCOVERY.md) (why money-psychology) · this doc = the item bank + scoring + archetypes.
> **IP position:** every item below is **our own wording**; the construct *names* (GUARD/DRIVE/MIRROR/SHADOW/LEAP) are ours; the *archetypes* are ours; "Money Maps™" is our mark. We never use "Money Scripts®" (Klontz's trademark) or KMSI-R items. We stand on the *science of money beliefs* (a body of ideas, not copyrightable), retuned for entrepreneurs. **Item text is canonical once shipped** — changing it invalidates stored responses (`DECODED_SCORING.md` rule).

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

## 3. Scoring

1. **Dimension score** = mean of that Map's items, on the 1–6 scale (GUARD/DRIVE/MIRROR/SHADOW = 3 items each; LEAP = mean of L1–L4).
2. **Dominant / secondary Map** = the top two of the **four core Maps** (LEAP excluded — it's a state, not an identity). Tie-break order when means are equal: **DRIVE > GUARD > SHADOW > MIRROR** (bias toward the more action-shaping Map; arbitrary but fixed for determinism).
3. **Overclock flag:** any core Map with mean **> 4.0** is "running hot" — the coach leads with its governor, not its edge.
4. **THE LEAP band:** Low ≤ 2.5 · Moderate 2.6–3.9 · High ≥ 4.0. Plus a **tilt**: mean(L1,L3) vs mean(L2,L4) → *fear-of-failure-tilted* vs *fear-of-success-tilted* (the rarer, higher-value read).
5. Deterministic, scored in code (reuse the Decoded scoring-engine pattern). Nothing here needs an LLM — the reveal narration does (§6), the scoring doesn't.

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
  │  ⚠ Leak:  The finish line     │   ← one leak
  │     keeps moving.            │
  │                              │
  │  THE LEAP: High — tilted to  │   ← the state / hook
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

## 8. Build notes / open refinements
- **Take-it-yourself pass first** (Tom): answer all 16, check the archetype + LEAP read feels *true* — the reveal landing is the whole product. Tune wording where a read misses.
- **Reliability option:** if 3 items/Map feels thin in testing, go to 4/Map (20 items) — still inside a defensible friction budget for a high-intent founder audience.
- **Copy pass:** archetype names + edge/leak lines + card copy are v1; sharpen for shareability (16Personalities-quality naming is the bar).
- **Light hygiene, not academic validation** (`MONEY_EXPERIENCE.md` §3): after the first cohort, check internal consistency per Map and that the archetypes distribute (no dead types); fix items that don't hang together. Skip the journal; keep the floor.
- **Then → code:** items + scoring into the Decoded engine under program `money`; archetypes into the card renderer; the reveal into the money Coach Pack's first-message builder.
