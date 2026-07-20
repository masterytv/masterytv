# **Money Coach — Experience-Design Notes (pre-Phase-0.5 seed)**

> **Author:** Claude Code (Orchestrator), commissioned by Thomas Wood
> **Date:** July 17, 2026 · **Status:** 🟡 SEED — thinking captured *before* crafting the experience; feeds the eventual `MONEY_EXPERIENCE.md` (Phase 0.5, per `VERTICAL_PLAYBOOK.md`). Companion to [MONEY_DISCOVERY.md](MONEY_DISCOVERY.md) + [MONEY_VIRAL_GTM.md](MONEY_VIRAL_GTM.md).
> **⭐ PROMOTED:** the formal Phase 0.5 spec is now [MONEY_EXPERIENCE.md](MONEY_EXPERIENCE.md) — the authoritative build artifact. This notes doc is retained as the *reasoning* behind it.
> **Trigger:** the founder ran a live UX dry-run — took the KMSI-R, fed the scores to ChatGPT / Gemini / Fable 5, then added his story and asked for advice. That transcript is the richest product research we have, because it *demonstrates* the experience instead of describing it. This doc extracts what it proves.

---

## 1. The one thing the transcript proves

Watch the arc of what actually happened to the founder as a user:

1. **Test-only → commodity.** Three different LLMs produced near-identical, competent, forgettable reports from the four scores. This is the "chatbot with a test attached" baseline. It is a horoscope with citations. Anyone can build it.
2. **He added his story ("rebuilding after a loss, a spiritual awakening, I miss the chase, I'm afraid I'll crash again") → all three said "this changes things."** The *same four scores* were suddenly reread: vigilance as *scar tissue*, avoidance as a *post-crash pendulum swing*. The score didn't change. The **meaning** did — because it now had a life to interpret through.
3. **The hook wasn't the report — it was the reveal.** The moment that landed was a coach naming the thing he hadn't said out loud: *"you're not afraid of success, you're afraid of becoming the version of yourself that success required."* That sentence is the product.
4. **Then he asked it a real decision** ("build again or get a job?"). That is the instant a test became a coach.

> **The test is the Trojan horse. The story is the product. The reveal is the moment. Design the whole experience to manufacture the reveal — fast, and then again and again.**

A test measures traits. A coach interprets traits *through a life, toward a decision.* That interpretation layer — instrument × narrative × present situation, fused — is the entire moat. Everything below serves it.

---

## 2. Six differentiators from "a chatbot with a test attached"

Name these explicitly; every design choice should serve at least one.

1. **The reveal, not the report.** A test outputs a document you read once. A coach produces a moment where it says something *truer than you expected it to know.* The report is a byproduct; the reveal is the product. → This is a **writing/prompt-engineering discipline**, and it is the hardest and most important part of the build.
2. **Hypothesis, not verdict.** The score *opens* a conversation the coach is willing to lose. "Your Vigilance came in high — but let me check something. Does that feel lifelong, or newer, like it showed up after something?" A chatbot-with-a-test asserts; a coach inquires — and is willing to say *the number is wrong for you right now.* (This is exactly the founder's own frustration: "it didn't ask me if I was happy where I am.")
3. **It remembers and returns.** A test is a one-night stand; a coach is a relationship. Proactive outreach ("last spring you almost quit two weeks before your biggest win — this feeling has a history") is the thing no quiz can do. **We already built this** (memory + proactive layer).
4. **It's willing to disagree.** The sharpest moment in the transcript was a coach *pushing back*: "a job taken purely as retreat would be its own trap — the avoidance swing wearing a costume of wisdom." A sycophantic coach that validates everything is worse than useless for this psychology. Anti-sycophancy is a **safety feature**, not just a quality one (this segment makes desperate money decisions).
5. **It shows change over time.** Re-administer the instruments quarterly and *show the delta*: "your Money Focus moved 3.6 → 3.1." The test measures once; the coach measures the trajectory. This is retention **and** proof-of-value in one object.
6. **It catches the contradiction.** "You told me family is priority #1; you also told me you worked 84 hours and called home once. Is that the trade you meant to make?" A test has nothing to compare against; a coach holds you to your own stated values.

---

## 3. Reorder the founder's ingredients: form → conversation (the "Reveal Ladder")

The founder's proposed intake — Money Map + Money Story + Goals/Dreams + Values + What's Stopping You — has the **right ingredients in the wrong order.** Collect-everything-then-analyze rebuilds the exact 10–30-minute wall we already diagnosed as the core friction problem (`STRATEGY.md`: "the assessment is a conversion tax"; PC7 chat-first). The fix is not fewer ingredients — it's **sequencing them as a conversation where every disclosure is *purchased* with a reveal.** More input does yield better analysis (his correct instinct); the discipline is to *earn* each input by proving the last one was worth it.

| Rung | User gives | Coach returns (the payoff that buys the next rung) |
|:--|:--|:--|
| **0 — Money Map** | 12–16-item quiz (the trademarked instrument — see §5) | Named type + shareable card. Framed as a **hypothesis, not a verdict**: "here's what this suggests — but a score lies without a story. Want me to check if it's actually true for you?" |
| **1 — The one question** | ONE answer, in their words, to a question the *type* makes relevant ("Does 'enough' have a number, or does the finish line keep moving?") | The engineered **"this changes things"** — a reveal fusing score × answer. This is the conversion moment (and the GTM doc's "coach reads your card"). |
| **2 — Money Story** | The narrative — conversationally, never a form ("what did money feel like in your house growing up? your biggest win, your worst loss?") | Pattern reflection: the coach names the throughline. The richest personalization data enters here — and the coach **goes first on the shame** to lower the disclosure cost. |
| **3 — Situation + the fork** | Where they are now + the live decision they're facing | The coach applies the whole profile to a **real decision.** This is where an assessment becomes a coaching relationship. |
| **4 — Goals / values / "enough" / guardrails** | Co-created, not filled in | These emerge as **outputs** of the coaching, not intake fields — and become the living artifacts (§4) the product revisits. |

Each rung is a valid stopping point that has already delivered value — which is exactly what makes the next rung feel like an invitation instead of a wall.

> **✅ ENTRY DECISION — LOCKED (founder, 2026-07-17):** **quiz first → results delivered in chat → the coach's questions come with pre-written, clickable answer chips.** Rationale (from the friction analysis): open-ended chat *feels* lighter but is actually higher-friction — it makes a busy skeptic generate material cold and reads as therapy. A fast, sharp quiz is bounded, gamified, and hands the coach a *lens* on message one (the reveal in the transcript was only possible because the score already existed). "Chat-first, then recommend the quiz" is the weakest path — it stacks two efforts and delays both the lens and the shareable card.
>
> **The clickable-chip mechanic is the same friction principle applied one level deeper.** After the reveal, the coach's follow-up questions each surface **2–4 tappable suggested answers + an always-present free-text box.** Chips reduce the effort of *generating* a reply to a tap, kill blank-page paralysis, and keep momentum — while each chip is itself a mini-diagnostic (the option they pick is data). The free-text escape hatch is mandatory so it never feels like a boxed-in decision tree. Design rule: **chips to move fast, free-text to go deep — the user chooses the depth every turn.** This threads through every rung of the ladder, not just the first.
>
> **Design target restated:** minimize *time-to-first-reveal*, not number-of-steps. A 3-minute quiz that ends in a scary-accurate reveal is lower friction than 3 minutes of open chat that hasn't paid off yet. Keep a chat-first door as a *secondary* ramp for the quiz-averse (coach steers to the Map fast: "90 seconds and I'll have a real read on you"). A/B-test once live; metric = time-to-first-reveal × completion.

---

## 4. Things not on the founder's list (his item 4)

- **The living "Money OS" document.** Both LLMs independently converged on this (ChatGPT's "Operating System," Fable's "terms of re-entry" guardrail doc). Make it a **first-class product object**: a single evolving manual the coach maintains and the user watches grow — *who I am at my best · my self-sabotage patterns · my triggers · what restores me · my non-negotiables · my "enough" number · my mission.* It is the retention spine (leaving means abandoning a version of yourself), the exportable proof (hand it to a therapist/advisor/partner), and the most screenshot-worthy artifact in the product.
- **The Decision Room — the killer use case is the *decision*, not the daily check-in.** Every product like this designs around a morning-question habit loop. But look at what actually hooked the founder: a high-stakes decision. Entrepreneurs face money-psychology decisions constantly (raise or bootstrap, hire or wait, take the deal, drop the price, quit). A "think this through with me" mode that applies the user's whole psychological profile to a live decision is **higher-value, more defensible, more viral** ("I make my big calls with this thing"), and it's the truest expression of the /edge positioning. This may be the real wedge feature, above the daily loop.
- **Just-in-time instruments (answers his item 3 directly).** Do *not* administer the 13-instrument battery the transcript brainstormed as an intake wall. Start with the Money Map because it's concrete, fast, shareable, and status-safe for founders. Then the coach **requests** each further instrument only when the conversation reveals the need ("you keep mentioning you freeze before launches — want to look at where that comes from? Four minutes"). Every added assessment becomes a re-engagement + deepening event, never onboarding friction.
- **Reframe-as-edge, not wound-to-heal.** For the consumer money-avoider the coach helps them *face* money; for this founder segment the job is Fable's move — *keep the drive, change what it serves.* Gemini's "your vigilance is a superpower, slightly overclocked" is the exact register: trait-as-asset-with-a-governor. This shapes the coach voice/pack for the /edge door.
- **Passive emotional timeline.** ChatGPT's daily mood-1-to-10 tracker is right in theory but wrong for this user: busy high-status founders won't self-track reliably, and for a Money Focus type a daily numeric dial becomes *another number to obsess over* (the gamification trap both LLMs flagged). **Infer** the emotional timeline from the natural-language check-ins the coach is already having. Passive > active data capture here.
- **Anti-sycophancy as a spec'd, tested behavior.** Because this segment is crisis-adjacent (financial ruin correlates with suicidality; the founder literally "crashed once"), the coach's willingness to disagree is a safety requirement. It must resist cheerleading a desperate all-in bet. The crisis kernel (we have it) plus a "coach the psychology of the decision, never make the decision or give financial/securities advice" boundary (ties to `MONEY_DISCOVERY.md` §6) are non-negotiable.

---

## 5. IP reality on "MoneyTraits™" (the founder's one risky instinct → a clean opportunity)

Verified this turn: **"Money Scripts®" is a registered trademark and the KMSI-R is a copyrighted instrument** (Klontz Consulting Group / Financial Psychology Institute; DataPoints is the exclusive online commercial publisher). The four constructs (avoidance / worship-focus / status / vigilance) are *ideas* and not copyrightable — but the **item wording is**, and the name is trademarked. So the one path to avoid is exactly the tempting one: renaming KMSI-R items and trademarking the result. Three clean paths instead:

1. **White-label / license the KMSI-R from Klontz.** Fast, legally clean, and *adds* credibility (published validity studies). Potential bonus: a relationship with **Brad Klontz himself** — the science-first face of this niche (150M+ video views, national bestseller) — is a marketing asset, not just a compliance cost. Diligence: DataPoints' "exclusive online commercial publisher" status may route or constrain an independent app; check the terms.
2. **Build an original instrument (MoneyTraits™).** Measure the same constructs with our *own* items under our *own* validated name — owned forever, trademarkable, tunable to the founder segment. Cost: real psychometric validation work.
3. **Hybrid (recommended to evaluate):** license the KMSI-R for launch credibility while building + validating MoneyTraits™ in parallel, then swap. Ship legitimacy now, own the asset later.

This is a genuine Phase-0.5 decision with a legal and a partnership dimension. Flagging it now so "MoneyTraits™" doesn't get built on the one foundation that invites a lawsuit.

---

## 6. What we already have vs. what's genuinely new

The transcript's "here's the system to build" lists are ~80% things **we already run for Relatti.** That's the strategic point (weeks, not months):

- **Reuse:** long-term memory + semantic recall · proactive outreach (email/Telegram) · Coach Pack architecture (persona/guardrails/voice per vertical) · report generator · goal/commitment tracking with automated follow-up · crisis kernel + safety · the program-typed spine (add `money`, follow the compile errors).
- **New build:** the money instrument(s) + scoring · **the reveal choreography** (the prompt-engineering discipline of §1–§2 — the hardest, highest-leverage work) · the **Money OS** living-document object · the **Decision Room** mode · the /edge-segment coach voice (reframe-as-edge, willing-to-disagree, decision-first).

---

## 7. The golden example is already in your transcript

The **Fable 5 response** in the founder's dry-run is the quality bar for the coach: it held the score as a hypothesis, reread it through the story, *named the unspoken fear*, was willing to disagree ("a job as retreat is its own trap"), and offered a concrete artifact ("want me to draft your terms of re-entry?"). Use it (and the sharpest moves from the ChatGPT "Chief Psychology Officer" framing) as **golden fixtures** for the coach-lab prompt battery — the target the money pack must hit, byte-checked like the Relatti goldens.

---

## 8. Open questions for Phase 0.5 (`MONEY_EXPERIENCE.md`)

1. **The hero reframe** (playbook §3): candidate is *"your relationship with money, decoded — turned into your edge."* Confirm register: /edge (founder performance) leads; /unblock second.
2. **Instrument decision** (§5): license KMSI-R, build MoneyTraits™, or hybrid — and the Klontz-partnership question.
3. **Decision Room vs. daily loop** — which is the V1 spine? (Leaning Decision Room for the /edge segment.)
4. ~~**How much story before value**~~ — ✅ **DECIDED 2026-07-17:** quiz first → results in chat → clickable answer chips + free-text (see §3 decision block). Activation metric = time-to-first-reveal. Rungs 2–4 stay progressive.
5. **The Money OS artifact** — what's in v1, and is it the shareable/exportable object.
6. **Coach voice calibration** — does the user pick a register (challenge vs. wise-friend) at intake, à la ChatGPT's "coaching style calibration"?
7. **Boundary lines** — the coaching-not-therapy / not-financial-advice framing, given the coach will opine on venture readiness (crisis kernel + referral path + the §6 disclaimers).
