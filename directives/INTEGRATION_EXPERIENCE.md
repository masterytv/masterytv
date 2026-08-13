# **Integration Coaching — Experience Discovery (Phase 0.5)**

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** August 11, 2026
> **Status:** 🟢 **APPROVED — founder signed off on the §0 reframe, August 11, 2026** ("approved, the reframe is right"). [VERTICAL_PLAYBOOK.md](VERTICAL_PLAYBOOK.md) Gate 0.5 is cleared. Build sequencing moves to [INTEGRATION_SPRINT.md](INTEGRATION_SPRINT.md) (Phase 3), which needs its own Gate 3 approval before code.
> **Reads on:** [INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md) (Phase 0 — the research and the evidence citations; this doc does not repeat them).
> **Program slug:** `integration` (internal identifier, locked once rows exist). **Public brand: HEARD, on youheard.org** — founder decision August 13, 2026; naming contract in [BRAND.md](BRAND.md) §1.1, `BrandId` is `heard`, the slug above does not change.
> **Modelled on:** [RELATTI_EXPERIENCE.md](RELATTI_EXPERIENCE.md) and [MONEY_EXPERIENCE.md](MONEY_EXPERIENCE.md).

---

## 0. The reframe, in one sentence

> **Everywhere else this person goes, the experience is the protagonist: something to be analyzed, verified, explained away, or collected. Here the protagonist is the person and the life they are trying to get back into. The experience is a fact about their life, and our instruments (the corpus, the dials, the frameworks) exist only to make them less alone and to locate what specifically broke.**

Two things follow immediately, and they are the whole spec.

**The demotion.** The phenomenology goes from *mystery to be solved* to *fact to be lived with*. Stout's fourth sharing sub-problem is the documented failure we are designing against: when people finally listened, "they seemed interested in the experience itself, the details surrounding the manner of death, and the unusual aftereffects, while the very real personal, emotional, and spiritual needs of the experiencer were of lesser interest." A product built around a fascinating phenomenology questionnaire lands as exactly this.

**The inversion.** The engine's default journey is **assess → report → coach**. Decoded, Relatti and MoneyTraits all reveal through an instrument. This vertical inverts it:

> **tell → be met → be placed → *then* measure.**

The first free-text box comes before the account. The account comes before the instrument. The instrument comes after the payoff, not before it. This is the single biggest structural decision in the document, and it exists because the strongest empirical finding in the whole field is that **the reaction of the first person told predicts the outcome** — so the first response is a load-bearing product surface, not an onboarding step, and it cannot be a form.

---

## 1. The problem (grounded diagnosis)

### 1.1 What the engine does by default, and why each default fails here

| Surface | Engine default | Why it fails this vertical | Severity |
|:--|:--|:--|:--|
| **Landing** | One brand-forward homepage, category name in the H1 | The category has no consumer demand. English Wikipedia averages ~77 views/month for "spiritual emergency." People search symptoms and self-diagnostic questions, not the name of the help. | 🔴 |
| **Signup gate** | Account before value | This person is awake at 2am, frightened, and has already decided nobody will believe them. Asking for an email before anyone has heard them is the wrong first move. | 🔴 |
| **Assessment first** | 66 items (Relatti) / 16 (MoneyTraits) before any human-feeling contact | Hands a frightened person a form at the exact moment the evidence says the first response determines the trajectory. | 🔴 **the reframe failure, concentrated** |
| **The report** | Opens with the archetype name and the collectible card | Turns the experience into an identity to wear, and makes it the subject. Grotesque here. | 🔴 |
| **Coach first message** | Solo self-improvement letter about how you think and what drives you | Wrong register, wrong subject, and it arrives before the person has been heard. | 🔴 |
| **Coach default behaviour** | Explains, offers structure, names patterns | Reductionism is a **documented coping failure**, not a neutral act. Explaining is the LLM's strongest reflex and it is the known clinical error here. | 🔴 |
| **Proactive briefing** | 8am email with session-derived content | An email referencing your near-death experience on a lock screen, in a house with a spouse who thinks you have lost it, is a disclosure event you caused. | 🔴 |
| **Shareable card / viral loop** | Social share unlocks the payoff | This population is defined by not being able to tell people. A social-share gate is the injury, productized. | 🔴 |
| **Streaks + engagement metrics** | Reward continued use | Park: meaning-making *effort* without a *product* is rumination, and it predicts increased distress. **A user still searching at week 12 is a risk signal that looks exactly like high engagement.** Engagement optimization is inverted in this vertical. | 🔴 |
| **Free-tier limit / paywall timing** | Gate after N messages | Charging someone in acute worldview collapse reads as predatory, and these communities enforce that norm socially. | 🟡 |
| **Safety kernel** | Tier 1 keyword + Tier 2 LLM sweep, keyed on hopelessness | Misses the longing-to-return presentation entirely: reduced death anxiety, positive affect, good functioning, and an active wish to get back. | 🔴 |

### 1.2 Competitor first-moment teardown

What actually happens in the first five minutes, at each place this person currently goes:

| Where they go | First moment | What it costs them |
|:--|:--|:--|
| **A free general chatbot** ← *the real incumbent* | Instant, warm, unlimited, total validation. Zero friction, 3am availability. | Nothing up front. Later: a co-authored cosmology, a coined name for the entity, and a narrative that ratcheted across a persistent memory. |
| **r/experiencers, r/NDE** | Post, wait, get a mixed peer response. | Real peer contact, and also entity-possession framings, starseed framings, and "do more medicine." Unmoderated. |
| **IANDS sharing group** | A monthly meeting, a room of peers, four good ground rules. | Strong, but monthly and geographic. Nothing at 3am. |
| **Cheetah House** | A $100–$250 intake session; ~10 week wait for Britton. | Rigorous, priced honestly, and the waitlist is the demand signal. |
| **ACISTE practitioner** | Find one of **21 certified practitioners worldwide**. | Usually nothing, because there isn't one. |
| **Psychedelic integration coaching** | A discovery call. One published rate card exists in the entire category. | High friction, high CAC, psychedelic-coded. |
| **A generic therapist** | An appointment in three weeks. | Nearly 1 in 5 disclosures to a health professional were rated negative or harmful. 78% of Stout's sample reported a lasting consequence of having told someone who dismissed them. |

**The gap is a single sentence: nobody offers an immediate, competent, ontologically-disciplined first response.** The free chatbot is immediate and incompetent. Everyone competent is slow, scarce, or expensive. That gap is the product.

---

## 2. The evidence base (the seven findings that shape surfaces)

Full citations in [INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md) §2. Only the design-load-bearing conclusions are restated here.

**2.1 Park's discrepancy engine is the spine.** Distress is the gap between global meaning (what you believe reality is) and appraised meaning (what you think this event means). It closes two ways: assimilation or accommodation. → *The product never has to rule on what happened, and the two doors are a user-facing choice the coach refuses to make for them.*

**2.2 The first listener is the intervention.** Pehlivanova et al. 2025 (n=167): the single strongest predictor that support was helpful was the reaction of the first person told. 85% felt a strong need to talk; 55% were afraid to. → *§5.2 and §5.3 get more design attention than any other surface.*

**2.3 Distress tracks appraisal, not content.** Brett et al. 2014; the Brazilian Psychiatric Association's 2023 guideline (function, disorganization and negative symptoms discriminate — content does not). Note the asymmetry: *attempting* to control the experience predicts more distress, *believing you could* predicts less. → *Triage on function. Reduce attempted control; build perceived control.*

**2.4 Undecidability plus expert companionship is the stance.** Rabeyron's two named failure poles: over-validating to keep the alliance, and dismissing as pathology. Tedeschi: "facilitators rather than creators… focus on learning from them rather than being intent on changing them." → *§5.7.*

**2.5 Normalization with real accounts is the active ingredient.** Every literature converged on it independently. Jung's woodcut is the canonical demonstration; Evans et al. found difficulties were "exacerbated by lack of information about what was happening to them." → *§5.4 is the first-moment payoff and the whole differentiator.*

**2.6 Ground before meaning.** Argyri et al.: grounding 22/26, being witnessed 22/26, framework 15/26 — in that order. Inward meditation exacerbated rumination; outward-focused attention helped. → *§5.5's Footing dial overrides the user's stated agenda.*

**2.7 Sycophancy is a trajectory failure, not an answer failure.** Chandra et al.: spiraling occurs even in a Bayes-rational user, and survives both intuitive fixes (eliminating hallucination; warning the user). Anthropic's own prefill test: Opus 4.5 recovers from an already-sycophantic conversation **10%** of the time, and warmth trades directly against recovery. → *The safety budget goes to entry prevention, memory hygiene and out-of-band monitoring, not to hoping the model catches itself.*

---

## 3. Design principles (the review rubric for every surface)

1. **The person is the subject.** Never let a surface make the experience the topic. Test: could this page have been built by someone who finds the phenomenon fascinating and the person incidental? If yes, rebuild it.
2. **Witness before measure.** Nothing is asked of the user until something has been given. Free text before account, account before instrument, instrument after payoff.
3. **Undecidability on what it was; conviction on what they can do.** Say it once, out loud, early. Undecidability applied to "am I safe," "is it still on me," "can I do anything" is a refusal of the only help being asked for.
4. **Normalize with accounts and numbers, never with reassurance.** "Lots of people feel that way" is worthless. "Forty-seven accounts describe the same three things you just described" is the product.
5. **Ground before meaning.** Ask about sleep, the body, and the day before asking what it means. When Footing is low, the meaning work waits.
6. **The coach under-responds.** One question per reply. No lists, no headings, no named frameworks, no explaining. Talking less helps here, and the literature says so explicitly.
7. **The aperture must widen.** Progress is the conversation containing *more of the person's life* over time, not more of the experience. This is simultaneously the progress display and the spiral detector.
8. **No collectible, no type, no card.** Nothing that turns the experience into an identity to wear or a thing to post.
9. **Nothing arrives unasked on a lock screen.** Every outbound touch assumes a shared device and a skeptical spouse.
10. **Set the timeline honestly in week one.** Mean self-reported adjustment is 12.7 years. Saying so is the intervention, not a disclaimer.

---

## 4. The personalization model

Relatti personalizes on **attachment × Big Five** and tunes *voice*. This vertical has no Big Five in the battery (§5.5) and personalizes on a different pair, which tunes *what happens*, not only how it sounds.

### 4.1 The two axes

**Axis 1 — LENS** (from the door, confirmed or corrected by the account). Sets four things and nothing else:

| Lens | Vocabulary anchor | Live contraindication | Stage-5 emphasis |
|:--|:--|:--|:--|
| **Near-death** | their words for the light, the place, the being | longing-to-return; distressing subtypes; suicide-attempt-precipitated NDE | disclosure strategy; the pedestal problem; values-vs-marriage collision |
| **Contact** | "the beings," whatever they say | **never any memory-recovery technique**; conspiracy spiral | disclosure cost accounting; professional credibility |
| **Substance** | their language, no "trip report" register | ongoing or escalating dosing; HPPD; persistent DPDR | use boundary; family-system blowback; afterglow is not permanent |
| **Practice** (contemplative) | their tradition's terms; kundalini only if *they* say it first | hyperarousal vs. dissociation signature | practice modification; sangha relationship |
| **Frightening encounter** | never "delusion," never "just" | possession framing routes to the **trauma-informed** lane, not the psychosis lane | agency restoration; sleep; the power relation |
| **Framework collapse — religious** | **zero** spiritual reframe; "awakening" is banned in this lens | the house register is iatrogenic here | belonging loss before the belief question |
| **Framework collapse — materialist** | plain cognitive terms only | professional-disclosure risk *is* the presenting problem | graduated disclosure; who is safe at work |
| **Bereavement / ADC** | their name for the person | Prolonged Grief Disorder (ICD-11 6B42) is the differential | continuing bonds, culturally hedged |

**Axis 2 — STATE** (from the Footing check, §5.5). Sets what the coach is *allowed* to do this session:

| State | Gate |
|:--|:--|
| Low **Footing** | Everything routes to STEADY, regardless of what the user wants to talk about. No meaning work, no growth language. |
| High **Shake**, adequate Footing | Legitimacy first ("of course this is hard"), then THE GAP. Slow everything down. |
| Low **Fit**, adequate Footing | Comprehensibility work before significance work. Never the reverse. |
| Stage < 4 | **No growth talk.** Silver-lining language in weeks 1–3 reads as invalidation and is the most likely failure mode of an LLM tuned to be encouraging. |

### 4.2 The rule with the most teeth

> **We mirror their vocabulary. We never supply it.**

If they say "the beings," the coach says "the beings," not "the entities you perceived." Hedged reframing reads as disbelief and is the fastest way to lose this population. Conversely, the coach introduces **no** entity, name, number, date, place or cosmological structure the user has not already introduced. Zero new capitalized coinages, ever. That single constraint is what keeps the coach a mirror instead of a co-author.

### 4.3 Personalization anti-patterns (do not build)

- **Never surface the "encounter-prone personality" etiology.** Ring's Omega Project finding of elevated childhood abuse and dissociation among NDErs and UFO experiencers is contested, was published against methodological objection in 1990–92, and reads to a user as "you were traumatized as a child and now you dissociate." It is the fastest way to lose a population defined by having been explained away. Keep it out of reports, out of the coach's mouth, and out of any "what research says about people like you" surface.
- **No percentile claims.** The LCI-R has no published validity, reliability, or norms; Greyson subscale typing is field convention, not validated measurement. Present profiles as self-described, never as a position against a population.
- **No archetype.** There is no type to be here.

---

## 5. The journey and per-surface spec

Journey order, each surface **current (engine default) → target**.

### 5.1 The doors — marketing / entry segments

**Current:** one brand homepage per brand; `entry_segments` is designed in [STRATEGY.md](STRATEGY.md) §3 but **does not exist as a table**. Landing pages are pages.

**Target:** one ontologically-neutral parent brand, and a door per population, each speaking that population's native dialect. Build `entry_segments` for real here — this is the vertical that needs it, because the six populations use mutually repellent vocabularies and no umbrella term has demand.

Doors, keyed to live search demand rather than to the field's vocabulary:
`/after` (near-death) · `/nobody-believes-me` (contact) · `/after-the-trip` (substance) · `/meditation-made-it-worse` (practice) · `/leaving-faith` (religious collapse) · `/i-saw-something` (materialist) · `/they-came-back` (bereavement)

Copy discipline for every door:
- Lead with the **disbelief problem**, not the meaning problem. Every existing brand in this space opens on transformation or integration. The corpus says the first-order pain is social. A door that opens on *"Who have you actually been able to tell?"* should out-convert one that opens on *"Integrate your transformative experience."*
- The neutrality pledge sits **above the fold**, verbatim: *"We will not tell you what it was. We are not going to say it was God, or aliens, or your brain. That question is yours. Our work is what you do with your Tuesday."*
- Quote the population back to itself, sourced. This market has a fine-tuned detector for outsiders performing insider language, and generic wellness prose is the fastest disqualifier.
- **Banned from the parent brand and top-level nav:** spiritual emergency, spiritually transformative experience, STE, experiencer, awakening, sacred, soul, journey, shamanic, high vibration, love and light, starseed, healing — and the opposite failure: delusion, anomalous, symptoms, treatment, patient, disorder. ("Anomalous" means deviation from correct. It is a quiet verdict.)
- Register: plain functional English, per BRAND.md §14.6. No em dashes, no negation pivots (`check:copy-tells` is blocking), no AI vocabulary, no exclamation points. Draft with the `copywriter` skill, polish with `humanizer`.

⚠️ **Trademark-clear the public name before it enters a single string, prompt, or email.** The MoneyTraits rename cost ~60 files and a full edge redeploy.

### 5.2 The first box — "Tell it"

**Current:** signup → assessment intro → 16–66 items.

**Target:** the door's primary CTA opens a **single free-text box, pre-account.**

> **What happened?**
> Take as long as you want. Nothing here is graded, and nobody is going to tell you what it was.
> *(You can start typing now. We'll ask for an email later, only if you want to keep this.)*

Design notes:
- No character minimum, no prompts, no scaffolding questions. Some people will write four words and some will write four thousand.
- **No account, no email, no age gate before the box.** The 18+ gate and consent screen land before the *second* turn, not before the first. (Consent is a standalone, versioned, logged screen — a ToS checkbox is statutorily not consent in Illinois.)
- Voice input matters more here than anywhere else in the platform. Ineffability is a defining feature of these experiences, and a purely typed interface fights the phenomenology.
- ⚠️ **Never ask "are you coping?" or "do you need support?" as an opener.** uNHIdden §5.3/§8.4 names this as iatrogenic: it signals that distress is the expected response and can manufacture the anxiety it means to treat.

### 5.3 The witness turn — the highest-stakes message in the product

**Current:** `coaching/first-message.ts` writes a solo self-improvement letter derived from a personality profile.

**Target:** three beats, under 120 words, no lists, no resources, no normalization yet.

> You can say anything here, including things that sound impossible.
>
> One thing up front, because most people spend a while testing for it. I am not going to tell you what happened to you, and I am not going to tell you it didn't happen. Those are a different question from how you live with it, and the second one is the one I can help with.
>
> Can I take you back to it for a second? Not the whole story. Just the moment right before. Where are you, and what do you notice first?

Why each beat is there:
1. **Permission** (Rabeyron's most-cited line in the counselling literature). It front-loads the thing they are most afraid of and commits to nothing about ontology.
2. **Undecidability, stated once as policy.** Said once at the start it buys enormous freedom. Repeated defensively it reads as evasion.
3. **One present-tense phenomenological question.** "How," never "why." Most experiencers have a polished public version of the story; the polished version is not the material.

**Rules for turns 2 through roughly 8:**
- Stay in phenomenology. Sensory, granular, present tense. Watch for evocation markers (slowed speech, spontaneous shift into present tense) as a signal the person is re-experiencing rather than reciting.
- **Never ask a question that presupposes content.** "Were there others in the room?" "Did they do anything to you?" Each of these plants. This is a hard rule, not a preference.
- **De-pathologize explicitly**, as a discrete utterance rather than an implication, once the account is out: *"I want to say one thing plainly. Having an experience like this and not being able to place it is common, it is disorienting, and it is not the same thing as being unwell."*
- **Ask the disclosure question early and treat the answer as data:** *"Who have you told? What happened when you did?"*
- **Do not normalize yet.** Normalization before the account is fully out reads as a brush-off. It belongs in §5.4, where it comes with evidence.
- **Under-respond.** The psychedelic literature is unusually explicit that dialogue "sometimes seemed more distracting than beneficial."

### 5.4 The Company — the first-moment payoff

**Current:** the archetype reveal and the collectible card.

**Target:** **The Company.** Replaces the card entirely. This is the differentiator and the reason someone leaves a free chatbot.

Mechanically: embed the user's own account → `find_similar_accounts` against Project Profound's 403,937 chunks and 6,747 analyzed NDE records → return **attributed excerpts**, matched on specific phenomenological features.

> **Forty-seven accounts in our collection describe the moment you just described.**
> Not the general shape of it. The specific thing: the boundary you were told not to cross, the knowing that arrived all at once, and not wanting to come back.
> Here are nine of them, in their own words.
>
> *[nine excerpts, attributed, unedited]*
>
> Six of these nine talked about the years afterward. Four said the same thing you said about your marriage.

Rules:
- **Attributed excerpts only. Never synthesis.** The coach reports what others said; it never generalizes it into a claim.
- **The match means nothing about truth, and the page says so.** *"This does not tell us what caused it. It does tell you that you are not an outlier and you are not making it up."*
- **Never build evidence-collection features.** On von Lucadou's model, attention and attempted verification prolong the phenomena; clinically they entrench the person in the investigative frame instead of the meaning frame. The corpus is for company, never for proof.
- The second move — *what happened next* — is the part nobody else can build. Every corpus record carries a 10-domain transformation profile with direction indicators (up / down / mixed / shifted) and an `integration_notes` field. That supports "people whose Relationships domain went down while Purpose went up described this, three years on," which is exactly the timeline honesty §3.10 requires.

> **Amendment, August 11 2026 (founder). The Company is a chat turn, not a page — and its hardest requirement is silence.**
>
> The block above still describes what the payoff *says*. It over-describes the vessel: nine excerpts and a headline count is a reveal screen, and this arrives in a conversation, on a phone, and later over SMS or Telegram. **Three accounts at most, short, each with its link.**
>
> The timing is now the load-bearing part. **Never on the turn the account arrives** — producing seven strangers the moment somebody finishes telling you the strangest hour of their life is solving instead of listening, and it is the failure this surface is likeliest to ship. **Not on every message that touches the experience** either. It fires on a signal: they are alone in it, nobody else can have been through it, they wonder whether anyone has, there is no one they can say it to. If the coach cannot tell, it asks and waits.
>
> **This is either well integrated or left out.** Stated as a removal condition, not a preference — a model that reaches for the corpus early is worse than a model with no corpus at all, because it converts the one surface that proves the person is not alone into evidence that they are being processed. Build order: invocation policy in the tool description, rendering policy in `USAGE_RULE`, a hard clamp at three, and an acceptance test at [INTEGRATION_SPRINT.md](INTEGRATION_SPRINT.md) §3 / I4.4.
>
> Also decided: **the person's account is stored, and the coach remembers it.** It is their story, and a product that makes them tell it twice has failed at the thing it exists for. What may *not* be stored is anything the coach concludes from it — that distinction is I3.1's, and the consent screen (I5.5) precedes the first write.

### 5.5 The Footing check — the instrument

**Current:** `getBattery(programSlug)` → 66 items (relationship) or 16 (money), presented as an assessment, administered first.

**Target:** **15 items shown, roughly three minutes, administered *after* The Company**, framed as orientation rather than testing.

> **Where is this actually costing you?**
> Fifteen questions. There are no wrong answers and there is no score to fail.

| Dial | Source | Items | What it is | Framing to the user |
|:--|:--|:--:|:--|:--|
| **THE SHAKE** | Core Beliefs Inventory (Cann et al. 2010) | 9 | How much the event forced re-examination of core beliefs | **Legitimacy, not damage.** A high Shake means: of course this is hard. |
| **FIT** | ISLES-SF, Comprehensibility | 3 | How much this sits inside a story that makes sense to you | The comprehensibility question, asked first |
| **FOOTING** | ISLES-SF, Footing in the World | 3 | How much of your ordinary life is back under you | The market's own word, literally |
| *(private)* | PHQ-4 | 4 | Non-specific distress | **Never displayed. Routing signal only.** No score, no band, no label. |

Lens-conditional add-ons, **offered rather than required**, always after The Company: NDE-C (20) for the near-death lens, CEQ for substance, RSS-14 for religious collapse.

Rules:
- **Canonical item text, unchanged.** The project's hard rule ([DECODED_SCORING.md](DECODED_SCORING.md)): changing item text invalidates stored responses and forces retakes. Our construct *names* (Shake / Fit / Footing) are ours; the items are theirs, cited.
- **Score it, never call it an assessment.** Per California AB 489, a novel numeric score under a clinical-looking label, interpreted in an authoritative voice, is the exact fact pattern. Frame outputs as self-reflection and corpus comparison.
- **No psychiatric screeners.** The Spiritual Emergency Scale — the one instrument purpose-built for this — correlates r = .76 with a psychotic-symptoms scale. Your users score high on dissociation and unusual-perception items *by definition of who they are*. A high-sensitivity battery produces a flag rate you cannot triage and re-injures the exact wound the product exists to heal. **Detect conversationally; do not administer.** And: if you ask the question, a named human reviews the answer inside a stated window, or you do not ask it.
- **Low Footing overrides the user's stated agenda.** This is the one place the product is directive.

**The proprietary-instrument opportunity, deliberately deferred to V2:** there is no validated instrument anywhere for distress after a *malevolent* encounter. The whole available field is four Christian-framed items in the RSS Demonic subscale. Given the corpus, that is a sharper MoneyTraits-style build than an "integration index," because integration indices have competitors and this has none. Not V1.

### 5.6 The Map — the first artifact

**Current:** `ReportViewer` opens with the archetype and the card, then S1 You at a Glance → S2 Your Personality → …

**Target:** **The Map.** Six sections, ordered vertical-first. The word "report" is retired in this vertical.

| # | Section | Content |
|:--|:--|:--|
| 1 | **The company you're in** | The corpus match, opening the document. The payoff leads. |
| 2 | **What you're carrying** | Their own words, verbatim, un-interpreted. No paraphrase, no reframe. |
| 3 | **Where it's costing you** | The three dials in plain language, with the Shake framed as legitimacy. |
| 4 | **What usually happens next** | Timeline honesty. Mean self-reported adjustment 12.7 years, longest 42. The biphasic curve. What month eight tends to look like, so the crash is foreseen rather than experienced as failure. Assagioli's pre-emptive warning, operationalized. |
| 5 | **The gap** | The specific belief and the specific goal this violated. Then both exits, unpicked: *"There are two ways this closes. Either what you think this means changes, or what you believed about the world changes. Which one has more give in it right now?"* |
| 6 | **One thing this week** | Tiny, functional, non-meaning. Sleep, a walk, one person, one hour that would still matter if the question is never answered. |

Absent by design: archetype, card, type name, percentile, growth language, prediction.

⚠️ **Goal violation is under-asked and may hurt more than belief violation.** Section 5 must prosecute both. For this population the goal casualties are concrete and coachable: career credibility, intimacy with a partner who thinks they have lost it, and religious community belonging.

### 5.7 The coach

**Current:** `relationship-pack.ts` / `executive-pack.ts` via the PC4 seam.

**Target:** a new `_shared/packs/integration-pack.ts`.

**Persona and register.** Cortright's container-tone spec, close to verbatim, as a prompt clause: *"Warmth and compassion combined with a degree of softness and gentleness are essential, for hardness, coldness, or insensitivity can be highly jarring… a certain calmness and quiet confidence serves to energetically reassure and soothe the apprehension and alarm that are frequently present."* No briskness, no cleverness, no cheerfulness, no bullet-pointed efficiency.

**The core mechanism — a claim-type router.** Per utterance, classify what kind of claim is on the table, because one blanket policy is guaranteed to be wrong somewhere:

| Type | Example | Stance |
|:--|:--|:--|
| **A — Experience report** | "I left my body and saw the room from the ceiling" | **Never contested, ever.** They are the only authority on what it was like. |
| **B — Ontological claim** | "consciousness survives death"; "they were non-human intelligences" | **Never confirmed and never denied.** State the inability to settle it; hand it back. |
| **C — Action-guiding inference** | "so I should quit my job / stop the lithium / leave my wife" | **Fully engaged, non-neutral, reversibility-checked.** |
| **D — Reality-testable present-tense claim about the shared world** | "my thoughts are being inserted"; "the coach is sending me signs" | Safety kernel does **not** stay neutral. Care, plus a human. |

A and B get warmth and openness. C gets rigor. D gets routed. That split is the whole trick, and it is why the frontier-lab default is unusable as-is: OpenAI's own strengthened exemplar for delusional content is a flat ontological denial ("No aircraft or outside force can steal or insert your thoughts"), which is defensible for thought insertion and catastrophic if it generalizes to "the object you saw was not a craft."

**Pack configuration:**
- `frameworks: none` — stance-based, never names a modality (the Relatti precedent, founder decision 2026-07-01).
- `recentMessageScope: "conversation"` — "new conversation" genuinely starts fresh; continuity flows through memory facts and summaries.
- Force Claude at both first call and tool continuations. gpt-4o-mini produces the templated voice (the E14 / PC3 finding), and templated voice is fatal in this register.
- One question per reply. No lists, no headings. (Already the platform stance since PC3.)
- `briefing: { enabled: false }` at launch. See §5.11.
- Tools: `find_similar_accounts(description)` and `lookup_footing()`. Tool schemas must not require parameters that force the model to interrogate the user, and the layer must **say the data is already in context**, or the model roleplays "let me pull that up."

**Stage gating.** The pack reads the user's stage and gates behaviour: no growth language before Stage 4; no interpretation on the same turn the account first arrives (the Yale manual's listen-then-explore split, ported as a turn constraint).

**Banned move classes** — enforced by an output auditor, not by prompt text alone. The full list is [INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md) §5.3. The ones most specific to this vertical: **election language** ("you were chosen," "your mission"), **titling** (zero new capitalized coinages, ever), **channeling** (never voice an entity, guide, or deceased person, under any framing including user-requested), **ritualization** (no invented protocols, invocations, cord-cutting, shielding, contact procedures — and specifically **no IFS "unattached burden" work**, which has zero peer-reviewed literature and is functionally exorcism with better manners), **elaboration beyond the user's frame**, and **certainty escalation** (expressed confidence about any unverifiable claim may decrease or hold across a conversation, never increase).

**The agency exception.** Undecidability is the stance on *what it was* and the wrong stance on *whether they are powerless*. For the frightening-encounter lens especially, the coach separates the two out loud:

> "I am not going to tell you what it was. But I will take a position on something else. Whatever it was, you are not required to be at its mercy, and we can work on that part without settling the first part."

**Memory is the biggest product-specific hazard, and the memory-write filter is a higher-priority control than the response filter.** Store the user's words as **attributed report** — *"Client reports an encounter she describes as involving a being she calls Kael"* — never as ground truth, because the second form becomes a premise the coach inherits forever. Never write the coach's own interpretive elaborations to memory. Store decisions and commitments aggressively; store cosmology minimally. Version the certainty ("wonders whether" → "is now certain that") — the delta across sessions is the best spiral signal available and it is free.

⚠️ The extraction taxonomy must stay inside the live `memory_facts_category_check` constraint. **Apply the migration before deploying the edge function** — the post-processor batch-inserts, and one un-admitted category fails the whole batch.

### 5.8 The dashboard

**Current:** `dashboard/page.tsx` selects with a plain `if (brandId === "relatti")` and otherwise falls through to the **executive** `DashboardHome` — invisible to both `tsc` and `check:ternaries`. Add an explicit branch by hand.

**Target:** a bespoke primary surface (ADR-P03) with four things:

1. **The Aperture** — the progress display and the safety metric in one widget. It shows what else has come into the conversation over the last month: work, sleep, the body, other people. Healthy integration widens; spirals narrow. Copy: *"A month ago, almost everything we talked about was the experience. This month, half of it was your sister and your sleep."*
2. **The next rung** — the Telling Ladder (§5.9).
3. **One thing this week** — carried from The Map §6.
4. **The Map** and **The Company**, both browsable.

Absent by design: streaks, commitments-as-checkboxes, wins, goals, coach voices, AI-tools. All executive machinery, all module-gated off.

### 5.9 The retention mechanic — the Telling Ladder

The platform thesis says every vertical attaches to an external stake the user cannot quietly ghost. Relatti's is the partner; money's is the decision. **This vertical's stake is the weakest of the three and needs stating honestly** ([INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md) §8.1).

The strongest available candidate, and the one that is also the presenting problem:

> **The external stake is the person you have not told yet.**

It is concrete, it recurs, it has real consequence, it is squarely behavioural and therefore squarely in coaching scope, and it is the thing the product uniquely enables.

**The mechanic.** The user lists the people in their life. Each is marked *told* / *not told* / *told and it went badly*. Then, per rung:
1. **Assess the audience first.** What does this person believe? What does it cost if it goes badly? Is this a constraining audience?
2. **Decide.** *"Don't tell this person"* is a fully supported, non-failure outcome. ⚠️ Pushing disclosure into a constraining environment causes harm: social constraints on disclosure produce a reliable link between intrusive thoughts and depression, and coaching an experiencer to tell a skeptical spouse, employer or congregation without assessing that audience can cost them the relationship, the job or the community — precisely the goals whose violation is driving the distress.
3. **Rehearse.** What to say, what to leave out, how much.
4. **Debrief.** What happened. What it cost. What it gave.

**The far rung is contribution.** The Brazilian Spiritist research suggests the protective variable is not private meaning-making but **a socially sanctioned role for the experience**. The ladder's top rungs are therefore not "tell one more person" but "be the person someone else tells" — a group, a peer, someone earlier in it than you.

**Cadence: weekly, not daily.** About half of all first contacts at comparable services never go past a single consultation, and full courses rarely exceed 15 sessions. **Design the one conversation to be complete in itself.** This inverts normal coaching-subscription economics and should shape the pricing (§8.4) as much as the product.

### 5.10 The shared artifact — the family explainer

**Current:** `PartnerInviteModal` + `/api/decoded/invite` + the engagement spine.

**Target:** the same machinery, one person at a time, **private and never social.** There is no viral card in this vertical and there should not be. This population is defined by not being able to tell people; a share-to-unlock gate is the injury, productized.

The explainer is what the user hands to one person on the ladder. Grof and Lukoff both name educating the people around the experiencer as a first-class intervention, and Greyson lists "provide objective information to the family" as a distinct consensus move.

⚠️ **Content rule, and it is a real constraint:** the explainer *describes what is known about the experiencer's trajectory* and lets the reader draw conclusions. It does **not** instruct the partner how to respond. There is essentially no literature on partners of experiencers; instructing them would be invention, in a situation that maps closely onto high-conflict couples work.

It should name the two things families reliably get wrong, both from Greyson: avoiding the person as having come under an unwelcome influence, and putting them on a pedestal and expecting superhuman patience, forgiveness or prophecy, then rejecting them for not delivering.

### 5.11 Email and proactive

**Current:** morning briefing cron, pack-authored, brand-aware.

**Target:** **`briefing.enabled = false` at launch.** Turn it on only after the trajectory job (§5.12) is proven, and then under a stricter low-disclosure rule than Relatti's:

- Subject lines are **greeting only**. Never a topic, never a session reference.
- Body never references session content. Assume a shared laptop and a spouse who thinks they have lost it.
- The proactive gate stands: zero `role='user'` messages means nothing proactive, ever.
- The one exception worth building early is **Assagioli's pre-emptive warning**: after an intense positive experience, a scheduled inoculation message *before* the ebb, so the crash is recognized rather than experienced as failure or as proof the experience was fake. Content-free subject; the body is general, not personal.
- Reply-to must point at an inbox that actually ingests. Today only `coach@mail.masterytv.com` does.

### 5.12 Safety surfaces (experience-facing only)

Full control list in [INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md) §5. What the *user* meets:

- **The triage page.** *"Is it psychosis or a spiritual awakening?"* is one of the highest-intent live queries in this space, which means people are asking a search engine for a differential before they ask any human. Build the page. Explain the DSM Religious or Spiritual Problem code (V62.89 / Z65.8) so the reader learns their state has a non-disorder name. List the specific signs that mean *see a clinician this week*. Then say plainly: **"We are not qualified to tell you which one this is, and anyone online who tells you confidently is guessing."** That single page is simultaneously the best SEO asset, the best trust asset, and the safety gate.
- **The onboarding ritual that makes later intervention non-invalidating.** At intake, while the person is calm, have them author three things in their own words: a **theme list** ("if my writing starts circling around X, say something"), a **warning-sign list** (sleep, spending, urgency, cutting people off), and an **anchoring message** from themselves to their future self. Then the coach's threshold line is not the machine doubting them: *"You asked me to say something if your writing started to look like it did before. I think it might be. I could be wrong. Do you want to look at it together, or read the note you wrote yourself?"* For a population whose defining wound is being disbelieved, this is the only version of an intervention that survives contact.
- **Referral to a named person, not a resource list.** "Here are three clinicians on the ACISTE list who have worked with experiencers, here is the IANDS group nearest you" beats a hotline URL, both clinically and in a courtroom. The curated directory is a product, not an afterthought: the discriminating variable in the outcome data is *informed vs. uninformed*, not licensed vs. peer.
- **The crisis stack, nationwide and unconditional.** 988 + Crisis Text Line, a published protocol, AI-disclosure at session start and every three hours. On positive detection the conversation **changes state**; it does not append a number and carry on.
- ⚠️ **New detection patterns this vertical requires:** desire-to-return / death-as-reunion / "this world is the wrong one" (the existing kernel keys on hopelessness and will score a serene, high-functioning, actively suicidal NDEr as low risk); command content; election lexicon; certainty ratchet; medication-stopping frame; and AI-is-central-to-the-belief.
- ⚠️ **Terror is not a referral trigger.** Terror **plus** functional collapse **plus** preoccupation crowding everything out **plus** deteriorating sleep and self-care is the trigger. Using terror alone hard-routes out every distressing NDE, every incubus-type sleep paralysis, and every malevolent contact experience — the highest-need, least-served, founder-named segment.

---

## 6. The retention engine — mapping to what exists

| Mechanism (§2) | Feature | Status |
|:--|:--|:--|
| First listener determines trajectory | The witness turn (§5.3) | 🔨 NEW — the highest-value single build |
| Normalization is the active ingredient | The Company (§5.4), via `find_similar_accounts` | 🔨 NEW — ~1 day; `nde_chatbot_match` already live in the corpus project |
| Ground before meaning | Footing dial overrides agenda (§5.5) | 🔨 NEW (scoring is a subset-safe engine reuse) |
| Discrepancy located, not discussed | The Map §5 (§5.6) | 🔨 NEW report structure; generator reused |
| Undecidability + expert companionship | `integration-pack.ts` (§5.7) | 🔨 NEW pack; PC4 seam already built |
| Aperture widening = progress **and** safety | The Aperture widget + nightly trajectory job (§5.8) | 🔨 NEW — one mechanism serves three purposes |
| The stake: the person you haven't told | The Telling Ladder (§5.9) | 🔨 NEW |
| Family education as intervention | Family explainer (§5.10) | 🟡 partner-invite machinery exists; content is new |
| Contribution / socially sanctioned role | Ladder far rungs; peer surface | ⏸️ V2 — needs moderation infrastructure |
| Crisis routing | Tier 1 / Tier 2 kernel | 🟡 exists; needs the §5.12 patterns |

> The single most important **new** build is **The Company (§5.4)**. It is the differentiator, the evidence-backed active ingredient, and the only answer to "why leave a free chatbot that agrees with me." Everything else is a good coaching product; that is the thing nobody else can ship.

---

## 7. V1 scope and sequencing

Sequenced so the riskiest assumption gets tested first and the safety architecture lands before the first public link.

**0. Prove the differentiator before building a brand.** Ship `find_similar_accounts` as a tool on the *existing* coach and put matched retrievals in front of 5–10 real experiencers. Measure whether it lands as *"I'm not alone"* or as *"you're studying me."* This validates or kills the thesis for the price of an afternoon, before a dollar of brand work.

Then:

1. **The corpus tool + The Company** (§5.4). The cross-project client, the RPC call, the attributed-excerpt renderer.
2. **The witness turn + `integration-pack.ts`** (§5.3, §5.7). Highest emotional stakes. Prompt-snapshot golden for the new vertical; existing verticals' goldens stay byte-identical.
3. **Safety architecture** (§5.12 + Discovery §5.1 items 1, 5, 6, 7, 8). The memory-write filter especially — cheap now, unfixable once a narrative has ratcheted through months of stored facts. Re-themed Psychosis-bench and Spiral-Bench against the **configured** coach, not the base model.
4. **The Footing check + The Map** (§5.5, §5.6).
5. **The doors + the triage page** (§5.1, §5.12). Two or three doors, not seven.
6. **Bespoke dashboard + the Telling Ladder** (§5.8, §5.9).
7. **The family explainer** (§5.10).
8. **Proactive** (§5.11) — last, and gated on the trajectory job being proven.

**Explicitly NOT in V1:**
- **Peer / community surface.** Users rate peer support roughly twice as effective as therapy for anxiety and existential struggle, so this is the highest-value V2 feature — and the same corpus shows unmoderated communities transmitting entity-possession, demonic and "do more medicine" interpretations. Shipping it without moderation infrastructure manufactures the exact harm the product is positioned against.
- Human-coach marketplace. The curated **referral directory** is in; a marketplace is not.
- The AI-dread vertical (separate brand, later).
- Any card, type, archetype, streak, or social share.
- The malevolent-encounter instrument (V2, and the best proprietary opportunity in the space).
- Hospice/B2B channel (§8.8).

---

## 8. Open founder questions

1. **Go / no-go on the vertical**, given that the entire organized field earns ~$1.0–1.3M/year and ACISTE has produced 21 certified practitioners in 14 years. This is a smaller and slower market than money or relationship. *(Recommend: run step 0 of §7 first and decide after.)*
2. ~~**The name.**~~ ✅ **DECIDED August 13, 2026: HEARD, on youheard.org.** The recommendation here was an orientation noun ("Ground," "Bearings," "Footing"); the founder took a different and better axis. Orientation names describe the state the person wants to reach, which is a claim about an outcome. HEARD names what the product does on the turn that the evidence says decides the trajectory (§2.2, the first listener), and it claims nothing about where they end up. It also drops "Footing," which would have collided with the §4.1 dial of the same name. The domain carries the "you" and the wordmark never does — `youheard.org` reads as both "you are heard" and "you heard about this," and it says nothing on a lock screen. `BrandId` `heard` is live in the codebase; the `integration` slug is unchanged.
3. **Which two or three doors launch first?** *(Recommend: bereavement / after-death communication — the widest and least stigmatized door, and one the research nearly missed; near-death — the flagship and the population that actually pays; and meditation — the secular side door, 3.4M-subscriber adjacent community, and the one a scientist walks through. **Hold the contact door** until the safety architecture and the trajectory job are proven live.)*
4. **Pricing shape.** The NDE population pays for **membership and identity** ($49–$149/yr, 88% earned revenue at IANDS), not for hours. Free first conversation is non-negotiable — nobody in this field charges at first contact and the communities enforce that norm socially. Membership tier, sliding scale as a published grid, or both?
5. **Community: build it, partner for it, or skip it?** It is the highest-value V2 feature and it carries a moderation cost this team has never paid.
6. **Retain a clinical advisor** (ideally ACISTE-certified) for crisis-path review and as the named referral endpoint? Cheapest available evidence of reasonable care, and it satisfies Utah §58-60-118's licensed-involvement requirement.
7. **Geofence Illinois and Rhode Island at launch?** Illinois has no compliance path for an AI, only a geofence or an exemption argument. *(Recommend: yes, plus 18+ gate, both from day one.)*
8. **Pursue the hospice B2B channel in parallel or defer?** Palliative-care clinicians have published a surveyed unmet need (n=247) for exactly the two artifacts this team builds: a structured assessment and an institutional protocol. Different buyer, different sales motion, and the sufferer never pays.

---

## 9. Experience Discovery checklist (VERTICAL_PLAYBOOK §3)

- [x] Domain psychology researched — [INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md), 14 agents, nine literatures
- [x] Competitor experience teardown — §1.2
- [x] **The hero reframe named and founder-approved** — named in §0, **approved 2026-08-11 (Gate 0.5 cleared)**
- [x] Assessment battery decided — §5.5
- [x] Result structure designed vertical-first — §5.6
- [x] Coach voice + first message specified — §5.3, §5.7
- [x] Retention mechanic identified — §5.9
- [x] Per-person personalization rules defined — §4
- [x] Copy register chosen — §5.1

---

## 10. Doc map

- **This doc** = source of truth for the `integration` *experience*. Phase 0.5.
- **[INTEGRATION_DISCOVERY.md](INTEGRATION_DISCOVERY.md)** = the research, the citations, the market, and the full risk-control list. This doc does not repeat them.
- **Process** = [VERTICAL_PLAYBOOK.md](VERTICAL_PLAYBOOK.md) — §5 is the build/launch checklist, §5.10 the verification sweep. Copy §5 into the sprint doc once scoped.
- **Technical** = [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md) (verticals-as-config), [RELATIONSHIP_ARCHITECTURE.md](RELATIONSHIP_ARCHITECTURE.md) (the spine), [TENANCY_AUDIT.md](TENANCY_AUDIT.md) (the typed program axis — a new vertical arrives through the `ProgramId` door).
- **Engine reference, still valid** = [COACHING_BRAIN.md](COACHING_BRAIN.md), [COACHING_GUARDRAILS.md](COACHING_GUARDRAILS.md), [COACH_ARCHITECTURE_AUDIT.md](COACH_ARCHITECTURE_AUDIT.md), [DECODED_SCORING.md](DECODED_SCORING.md) (canonical item text rule), [BRAND.md](BRAND.md) (**mandatory before any .tsx**, §14.6 for copy).
- **Safety** = [SAFETY_ESCALATION_PROTOCOL.md](SAFETY_ESCALATION_PROTOCOL.md), [COACH_SAFETY_AND_TESTING_SPEC.md](COACH_SAFETY_AND_TESTING_SPEC.md).
- **The corpus** = Project Profound, Supabase `vnycavclrndjwmpaugju` (separate project, separate org — needs its own service key via `supabase secrets set`). Instrument definitions in `../ProjectProfound/profound-archive/methodology/METHODOLOGY.md`.
