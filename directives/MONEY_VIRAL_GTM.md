# **Money Edge — Viral Product Architecture & GTM Options**

> **Author:** Claude Code (Orchestrator), commissioned by Thomas Wood
> **Date:** July 17, 2026 · **Status:** 🟡 OPTIONS REPORT — founder decision doc (pairs with [MONEY_DISCOVERY.md](MONEY_DISCOVERY.md) Part II as the Gate 0 package; Phase 0.5 `MONEY_EXPERIENCE.md` follows a "go")
> **New input this doc is built on:** the founder has an **owned audience of entrepreneurs** — less interested in relationships, bored by "executive coaching," struggling with money, wanting an **edge**, already sold on psychology because they fight their own every day. The ask: architect the product + GTM so this audience becomes a **self-propelled referral machine**, keeping marketing costs near zero.
> **Method:** strategy synthesis on top of the two research passes + three verified viral-mechanics benchmarks (Dropbox, Morning Brew, 16Personalities). Labeled intuition where it's intuition.

---

## 1. The strategy in one line

**Make the assessment result the status object entrepreneurs *want* to share, make comparison the invite engine, make the coach the retention engine that keeps manufacturing fresh share moments — and pay for referrals in product value, never cash, and never for public posts.**

Why this is the right spine for *this* audience (intuition, grounded in the research):

- **Entrepreneurs perform money-psychology publicly.** The consumer money-shame problem (Part I: 1/3 hide purchases from spouses) *inverts* in founder culture — mindset talk, money talk, and self-optimization ARE the content of that world (#moneymindset: 1.3M posts). A money-psychology *identity* is a flex, not a confession. This is the single most important asymmetry vs the mass-market version.
- **Identity artifacts are the most proven viral loop in our product category.** 16Personalities: **1B+ tests taken, ~15.9M monthly visits**, virality driven by "I'm an INFP" becoming social shorthand — clean design, immediate result, zero friction. We already own this machinery (Decoded archetypes + shareable cards were built as exactly this loop).
- **Referral ladders work at newsletter economics.** Morning Brew: referrals = **~30% of all subscribers**, milestone rewards costing **$0.23–0.25 per acquisition**. Dropbox: double-sided value rewards → **35% of daily signups, K≈0.35, ~60% cheaper than paid ads**. Nobody sustains K>1 for long; the honest goal is **blended K of 0.3–0.5**, which turns a seed audience of N into ~1.4–2×N and cuts blended CAC by half or more, forever.

---

## 2. Product architecture: **the Edge Ladder** (friction inverted)

Today's engine funnel: 20–30-min test → consent → email → *then* value. The Edge Ladder flips it — value at second zero, gates arriving only when the product needs them to deliver the *next* value. (This is PC7's chat-first research applied; each gate is presented *by the coach* at a moment of demonstrated value.)

| Rung | What they get | What we ask | Marginal cost (est.) |
|:--|:--|:--|:--|
| **R0 — The 3-Minute Money Edge Quiz** | 12–16 sharp items (money-scripts-lite) → instant **Money Edge Profile**: a named type + a card that reads like a performance scouting report, with one "your edge" and one "your leak" | Nothing. No email. | ~$0 (static scoring, card render) |
| **R1 — The coach reads your card** | 60 seconds after the result, the coach opens with one uncomfortably-accurate question generated *from their type* ("Vigilant Operators usually undercharge for exactly one reason — want to see if yours is the same one?"). 5–10 anonymous messages, rate-limited. | Nothing yet. | $0.05–0.15 (capped LLM) |
| **R2 — "Want me to remember this?"** | Persistent profile, day-2 proactive email, full-report *preview* | Email (magic link — passwordless; the PC7 research shows password creation is the #1 self-inflicted drop-off) | ~$0 |
| **R3 — The Full Edge Profile** | The validated battery (KMSI-R canonical + Big Five + **CFPB FWBS baseline** — 15–20 min, framed as "the instruments behind this are the published ones") → the full psychology report + **7-day full-coach trial** | Consent + the battery (the effort is a *feature* here: sunk-cost activation + lead-quality filter) | $1–3 (report generation) + $1–4 (trial usage) |
| **R4 — The coaching relationship** | Memory, proactive outreach, commitments/follow-up, progress (FWBS re-administered quarterly = the numeric "it's working" score, no bank data) | Payment | LLM COGS $3–10/mo (heavy user) |
| **R∞ — Comparison (available from R0 onward)** | "Compare edges" with a cofounder / business partner / mastermind peer — mini-comparison at R0-vs-R0, **full Edge Comparison report** when both hit R3 (dyad engine, reused as-is) | An invite (the loop) | ~$1–2 per comparison report |

**Answer to "do we give the coach experience first, or the quiz first?" — both, in that order, 60 seconds apart.** The quiz first, because (a) it mints the shareable identity artifact, and (b) the coach demo is 10× better when the coach already knows something true about you. A cold "chat with our coach" demo is a chatbot; a coach that opens by reading your fresh result is a *reveal*. R0→R1 is the product's magic moment and the whole funnel is built to reach it in under 5 minutes.

**A fully-activated free user (R0→R3) costs us roughly $3–7 in COGS.** Paid CAC for the founder/entrepreneur segment runs $50–200+. Value-first wins if even ~1 in 10–15 activated users converts *or* refers someone who does. That is the entire economic argument for high-value-first, and it clears easily at reverse-trial benchmark conversion (4–12%, PC7 research) before counting referrals.

---

## 3. The Loop Stack (six loops, one machine)

**L1 — Identity loop (top of funnel).** Quiz → named-type card (OG-carded personal URL) → seen → quiz. The card must pass the bar in §5. Target: 15–30% of quiz completers share (16P-class artifacts hit this; instrument it honestly).

**L2 — Comparison loop (the invite engine).** "Compare edges with your cofounder" is a *high-status* invite — it says "I think you're serious," not "I need help." Cofounder money-script mismatch is a real, expensive, undiscussed problem ("Before you split equity, compare money psychologies" is a wedge headline). Mastermind variant: one organizer invites 5–8 → a group edge map. **The organizer is the super-spreader node — one convert = 6 signups.** Runs on the live dyad machinery (engagement kind: peer pair / small cohort — career's planned cohort shape, arriving early with a better reason).

**L3 — Progress loop (retention-native content).** Strava proved the workout is the content; Wordle proved the artifact can be abstract. Ours: user-triggered **breakthrough cards** ("Day 21: found the belief that had me undercharging for 6 years"), streak cards, quarterly **FWBS-delta cards** ("Financial well-being: 48 → 61"), and an annual **"Your Money Psychology, Wrapped."** Strictly opt-in, composed by the coach *with* the user (privacy posture preserved; nothing auto-posts).

**L4 — Referral ladder (Morning Brew shape, product-value currency).** See §4.

**L5 — Event loops.** A recurring **14-Day Money Edge Challenge** (the Relatti `/challenge` pattern, rebuilt for this register): daily 5-minute coach prompts, a cohort start date, a day-14 delta card. Time-boxed events concentrate sharing into windows and give the audience a *reason to post now*. Quarterly cadence.

**L6 — Creator/affiliate layer.** His audience contains audience-owners. Give them (a) teach-worthy content kits (the Klontz playbook — money-scripts explainers that make the *sharer* look smart), (b) a clean affiliate offer (intuition: 30% × 12 months, standard for this world), (c) aggregate **data-as-content**: "68% of founders who took the Edge assessment show Money Vigilance — here's what it costs them" (consented aggregates only; Spotify-Wrapped economics for the brand's own channel).

---

## 4. Referral economics — answering "do we reward each share?"

**No. Reward enrollments, not shares.** Three reasons:
1. **Per-share rewards buy spam, not customers** — and repel exactly the high-status audience we want (nobody elite posts for a coupon).
2. **FTC:** incentivized *public endorsements* require clear disclosure (the endorsement guides) — a compliance and authenticity tax on every post. Incentivized *private invites* carry no such burden. Let public sharing be intrinsic (identity/status artifacts); pay only for invites that enroll.
3. It's what the benchmarks actually did: Dropbox rewarded successful signups, Morning Brew rewarded confirmed referrals.

**The give-get (double-sided, Dropbox rule — both sides must win):**
- **Give:** your invitee gets the **Full Edge Profile free** (validated battery + report — list-priced at $49 one-time for the unreferred public later, so the gift is real and priceable).
- **Get (milestone ladder):** 1 enrollment → a free month of Edge tier · 3 → an exclusive protocol pack + a quarter of Edge · 5 → **Founding status**: permanent price lock + badge · 10 → lifetime Edge tier + inner-circle cohort call. (Costs are COGS-months and unlocks — $3–8 per reward-month — not list price. Morning Brew's milestone CPAs ran ~$0.25; ours run a few dollars and acquire *activated* users, not newsletter emails.)
- **The founder's "free if your referral enrolls" idea — keep it, placed at the right layer:** in the public (post-founding) phase, the Full Edge Profile costs $49 *or* one successful invite ("bring one peer"). Every redemption = ~$2–5 COGS for one new activated user. That is an absurdly good CAC, and it makes the paywall itself a referral surface.
- **Fraud guard:** rewards release on the invitee reaching R3 (battery complete), not on signup — self-referral becomes 20 minutes of psychometrics per fake account, the cheapest honest filter we have. (Referral ledger table: new, spine-compliant — `workspace_id`, tenancy-gate categorized.)

---

## 5. The share-artifact bar (anti-cringe rules — this is where viral products die)

Every shareable object must make the **sharer** look insightful, self-aware, or elite. Never desperate, never sold-to, never woo.

- **Scouting-report voice, not horoscope voice.** "Vigilance: elite. Leak: undercharges under pressure." A named edge AND a named leak — flattery-only cards read as ads; one sharp cost makes it credible (and more shareable — vulnerability-with-status is founder-culture native).
- **No wealth promises on any artifact** (the FTC line from MONEY_DISCOVERY §6 applies to share cards too — they're marketing).
- **Science credit visible, lightly** ("built on published money-script research") — the differentiator vs the manifestation feed, worn on the artifact itself.
- **BRAND.md governs** (tokens, no emoji-clipart, dual-theme, OG pipeline) — cards ride the existing card/OG infra.
- Types need names worth claiming out loud. (Phase 0.5 work: 6–8 named Money Edge types derived from KMSI script combinations × Big Five modulation — "The Vigilant Operator," "The Visionary Gambler" class of naming. The lite quiz is honest-labeled as a *profile*, the R3 battery as *the validated instruments*.)

---

## 6. Pricing architectures (three options + recommendation)

| | **A — Open freemium** | **B — Scarce premium** | **C — Founding hybrid ⭐ recommended** |
|:--|:--|:--|:--|
| Shape | Free quiz/card/taste → $39/mo Coach → $99/mo Edge+ | $99–149/mo only, application/waitlist, referral jumps the line (Robinhood/Superhuman mechanics) | Free ladder (R0–R3 free during founding) → **Founding: $49/mo locked-for-life or $490/yr** (his audience only, capped, e.g. 100–250 seats) → public later at **$79/mo Coach / $149/mo Edge+**, Full Profile $49-or-one-invite |
| Virality | Max top-of-funnel; weakest status energy | Max status/scarcity energy; starves L1 (nothing to share before paying) | Scarcity where it works (founding seats), openness where it works (quiz/card) |
| Risk | Reads cheap next to "$500/mo human coach" anchor; Sophia-tier pricing drags positioning | Small N; K math starves; one bad month kills momentum | Complexity (two phases) — mitigated by the beta-code machinery we already run |
| Fit with his audience | OK | Only if audience is large + hot | **Best** — rewards his people for being first, mints evangelists with skin in the game, and the price lock IS the referral-ladder grand prize |

**Why C:** the founding cohort converts his audience's trust into (a) revenue, (b) consented testimonials + FWBS-delta proof (the beta-cockpit pattern, rebuilt for this vertical), and (c) 100–250 people *financially motivated* (price lock, milestone status) to evangelize before the public phase. Anchor honestly: Sophia (indie AI) $19.99 · us $49–149 · human money-mindset course $2,497 · human performance coach $500–5,000/mo. We are priced as "the serious one that isn't human-priced."

---

## 7. GTM sequence (90 days, audience-first)

- **Phase 0 (wks 1–2) — the spec.** Gate 0 "go" → compressed Phase 0.5 (`MONEY_EXPERIENCE.md`, `/edge` register first): name the types, write the card voice, pick the lite-quiz items, define the coach's R1 opening move. Build: quiz + card (card/OG infra reuse) + `moneyedge` entry segments.
- **Phase 1 (wks 3–6) — Founding cohort.** Waitlist *inside his audience* with visible position + invite-to-jump-the-line (Robinhood pre-launch mechanic); founding seats capped; every founder gets FWBS baseline (the proof engine starts on day 1); consented-testimonial collection from week 2. **One list, one shot: the first email gives the quiz (value), not the pitch** — the ask comes after the audience has its cards.
- **Phase 2 (wks 7–10) — the public event.** First **14-Day Money Edge Challenge** as the public debut; founding members seeded as visible participants (their delta cards are the ads); press/creator angle: the aggregate data story ("what 500 entrepreneurs' money scripts revealed").
- **Phase 3 (wks 11+) — evergreen machine.** Quiz funnel always-on; referral ladder live; $49-or-one-invite paywall; L6 affiliate layer opened to audience-owner members; quarterly challenges; annual Wrapped.

**Metrics that decide if the machine works** (instrument from day 1): card-share rate (target 15–30%), quiz→email 25–40%, email→battery 30–50%, battery→paid 5–12% (reverse-trial benchmarks), **blended K 0.3–0.5**, referral share of new signups (Dropbox hit 35%; Morning Brew 30% — that band is the goal), CAC payback < 3 months.

---

## 8. Founder's questions, answered directly

1. **"Give high-value first — what will that cost?"** Yes. ~$3–7 COGS per fully-activated free user (§2 table) vs $50–200 paid CAC. Clears at benchmark conversion rates before counting referrals. Guardrails: rate-limited anonymous tier, bot mitigation, report gated behind the battery.
2. **"Extra value for each share?"** No — per **enrollment**, double-sided, milestone ladder (§4). Public sharing stays intrinsic (status artifacts), which also keeps us clean on FTC endorsement disclosure.
3. **"Experience of the coach first?"** Quiz → card → *coach reads the card* — 60 seconds apart (§2). The demo is the reveal, not a cold chat.
4. **"Short quiz then the validated quiz later?"** Exactly. R0 lite (honest-labeled profile) → R3 canonical validated battery framed as the upgrade to "the real instruments." **"Free if their referral enrolls?"** Kept, at the public-phase paywall: Full Profile = $49 or one successful invite (§4).
5. **"Price points and benefits?"** Architecture C (§6): free ladder → founding $49/mo-locked (or $490/yr) → public $79 / $149 Edge+; Full Profile $49-or-invite; rewards paid in months/unlocks/status, never cash.
6. **"Turn the audience into a referral machine?"** The 90-day sequence (§7) + the six loops (§3) + the mastermind-organizer super-spreader motion + data-as-content flywheel. Honest ceiling: K 0.3–0.5, meaning the machine *multiplies* the audience 1.4–2× and halves blended CAC — loops subsidize marketing; they rarely replace it entirely.

---

## 9. Reuse map & build cost (why this is weeks, not months)

**Reused as-is:** archetype-card + OG pipeline (built for Decoded's viral loop), invite/dyad engine (cofounder pairs = a new engagement kind on live plumbing), `entry_segment` funnels, beta-code machinery + cockpit (waitlist/founding seats/attribution), proactive email + magic links, program-typed spine (add `money` slug → follow compile errors), FWBS as a battery instrument, consented-testimonial pattern. **New build:** lite-quiz scorer + card art set, money comparison-report variant, **referral ledger** (spine-compliant table + reward release on R3), challenge content pack, PC7's anonymous-chat tier (this doc is the plan PC7 was parked for), affiliate tracking (start with codes). **Biggest non-code cost:** Phase 0.5 experience work — type names, card voice, coach opening moves. That's where the product lives or dies; do not compress it below ~2 weeks.

## 10. Risks (named, not hand-waved)

1. **Seed-audience burn** — one list, one first impression; value leads, pitch follows (§7 Phase 1 rule).
2. **K-hype** — 0.3–0.5 is success; plan Phase 3 assuming *some* paid/content acquisition on top.
3. **Gamification vs credibility tension** — the science-first brand is the moat; every reward stays classy (status/unlocks) or the Rhoades positioning collapses into the manifestation feed.
4. **Free-tier abuse** — 57.5% of web requests are bots (PC7 research); rate limits + effort gates from day 1.
5. **Referral fraud** — reward on R3 completion, watch device/payment fingerprints.
6. **Lite-quiz validity optics** — label honestly (profile vs validated instruments) or the science posture is a lie; the upgrade framing turns honesty into a conversion asset.
7. **Founder-brand coupling** — launching through his audience ties early brand to his person; decide deliberately how front-and-center he is (see §11).

## 11. Open founder inputs (needed before Phase 0.5)

1. **Audience specifics:** size, channels (email/YT/IG/podcast/community?), engagement rates, overlap with Relatti's audience. Mechanics above scale to any size, but founding-seat count, challenge design, and the affiliate layer should be sized to reality.
2. **Brand/domain:** new standalone brand (the Relatti pattern) vs fronted by his existing audience brand. Trust transfers faster through his brand; a standalone survives him. (Domain candidates are a Phase 0.5 task either way.)
3. **Founding price appetite:** $49-locked vs $490-annual vs both.
4. **Scarcity comfort:** hard seat cap + waitlist, or soft "founding window."
5. **Gate 0:** the formal money-vs-career call (`STRATEGY.md` amendment) — this doc + MONEY_DISCOVERY.md is the decision package.

---

**Verified benchmark sources:** Dropbox referral program (3900%/15mo, 35% of signups, K≈0.35, −60% CAC) — referralrock.com, saasquatch.com, growsurf.com; Morning Brew (~30% of subs via milestone referrals, $0.23–0.25 milestone CPAs, 225k+ referrers) — Tyler Denk on Medium, referralcandy.com, viral-loops.com; 16Personalities (1B+ tests, 45+ languages, ~15.9M monthly visits) — 16personalities.com, outgrow.co. Funnel benchmarks: PC7 research corpus (MONEY_DISCOVERY.md Appendix A). Everything else labeled intuition.
