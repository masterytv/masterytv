# **Integration Coaching — Discovery (Phase 0)**

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** August 11, 2026
> **Status:** 🔵 DISCOVERY — Phase 0 artifact for a proposed new vertical. **Not approved.** Per [VERTICAL_PLAYBOOK.md](VERTICAL_PLAYBOOK.md) §2, Phase 0.5 (`{VERTICAL}_EXPERIENCE.md`, founder-approved) must follow this and precede any surface build.
> **Working program slug:** `integration` — internal identifier only, chosen to be neutral and durable. **This is not the public brand** (§7.2 explains why "integration," "transpersonal," and "awakening" all fail as consumer-facing words). Per the MoneyTraits lesson ([MONEY_TRAITS_RENAME.md](MONEY_TRAITS_RENAME.md)), the display wordmark stays changeable; the slug locks the moment real rows exist.
> **Research basis:** 14 parallel research agents, ~2.2M tokens, ~1,000 tool calls, primary sources across nine literatures plus a completeness critique that adjudicated inter-agent contradictions. Raw per-domain findings are archived in the session scratchpad.

---

## 0. The two confirmations you asked for

### 0.1 "One coach for transpersonal psychology / awakening, multiple landing pages and methods" — **CONFIRMED, with three corrections.**

The one-coach thesis is right, and it is right for a stronger reason than convenience: **six independent literatures converged on the same causal mechanism.** Park's meaning-making model states it most precisely — distress is not produced by the experience, it is produced by the *measurable gap* between what the person believes reality is (global meaning) and what they think this experience means (appraised meaning). Every population in your brief is the same machine running on different fuel:

| Population | Global belief violated |
|---|---|
| NDEr | death is the end / my religion's account of the afterlife |
| Contact experiencer | we are alone; the government would tell us; I am a materialist |
| Psychedelic experiencer | I am a stable continuous self |
| Meditation-crisis practitioner | this practice is safe and only makes me better |
| Deconstructing believer | God is good, present, and in control |
| Scientist who saw something | the physical world is causally closed |
| AI-dread | the future is broadly knowable and human-shaped |

Same mechanism, same assessment, same coaching arc. One coach is correct.

**The three corrections:**

**(a) The methodology must be selected by the intake, not by the door.** Two NDErs can need opposite things: one needs normalization and a disclosure strategy; the other has a *distressing* NDE with active longing-to-return and needs suicide-safe handling before any meaning work. Routing on the landing page they clicked would get that backwards. The door sets vocabulary; the intake sets method. §4 specifies the split.

**(b) Do not name the category "transpersonal" or "awakening."** These words lose the two hardest and most valuable segments simultaneously. "Awakening" repels the scientist (reads as woo) *and* the religious-trauma survivor (reads as recruitment — Reclamation Collective's standing line is "Survivors are not our mission field"). More bluntly, the field's own vocabulary has no demand: English Wikipedia averages **~77 views/month for "Spiritual emergency"** and **12/month for "Faith crisis"**, against 50,649 for "Alien abduction," 34,070 for "Ego death," 19,122 for "Dark Night of the Soul," and 18,890 for "HPPD." Every incumbent in this space (ACISTE, SEN, Spiritual Crisis Network, Emerging Proud) is named in the 77-views dialect. The category has never been named in a word anyone types.

**(c) One of your proposed doors is a different product.** The AI-dread population has no experience to integrate — only an anticipated one. Their register is rationalist and utilitarian ("how to stop existential dread"), they cite papers not encounters, they are allergic to both spiritual and therapeutic framing, and — uniquely — **the coach itself is the feared object.** Putting them behind the same door as abductees repels both. Same mechanism, separate brand, later. §4.3.

### 0.2 "The goal is to help people decide what their experience means for them and integrate it into a life worth living, or find a bigger/better way of creating this" — **CONFIRMED, with one reordering and one addition.**

The second half of your sentence is the more important half and you should know it has a name. "Integrate it into the life they have" is **assimilation**; "a bigger or better way of creating this" is **accommodation** — changing the global beliefs and goals rather than the reading of the event. Joseph & Linley argue only accommodation produces genuine posttraumatic growth. Your instinct to include both doors, and to refuse to pick, is exactly the ontologically-neutral move the evidence supports. Keep it verbatim.

**The reordering:** meaning is not the first job, and leading with it is a documented way to make people worse. Argyri, Evans & Luke's 26-interview study found the three things that helped were **grounding (22/26), being witnessed (22/26), and having a framework (15/26)** — in that order. One participant, Max: *"Researching existential matters made things worse… trying to intellectually solve the experience... The search for the magic bullet, that is definitely not an effective strategy."* Park is blunter: meaning-making *effort* without a *product* is rumination, and it predicts increased distress. **A user still actively searching at week 12 is a risk signal that looks exactly like high engagement.** Design the metrics accordingly.

**The addition — this is the biggest single finding in the research.** The primary presenting pain is not metaphysical. It is **social**. Mining ~8,400 community posts, the highest-frequency near-verbatim sentence in the contact population is *"no one believes me."* And the only quantitative study ever done on support for this population (Pehlivanova, McNally, Funk & Greyson 2025, n=167, *Psychology of Consciousness*) found that the single strongest predictor of a good long-term outcome was **the reaction of the first person the experiencer told.** Not the quality of subsequent care. Not duration. Not modality.

So the goal statement wants a first clause:

> **Be the competent first witness. Then help them get their footing back. Then — only then — help them work out what it means to them, and whether the life they had is still the right one.**

Corollary, from Carr (*Hastings Center Report*, 2026), which is the best one-line product spec I found in the entire sweep: the job is **"protection of provisionality — the preservation of the human capacity to remain uncertain long enough to think."** Premature certainty in *either* direction is the failure. Note this means "decide what it means" cannot be an obligation the product imposes; for some users the correct settlement is "I don't know, and I can live."

---

## 1. Executive summary

1. **The mechanism is real, general, and nameable** (Park's discrepancy engine). It supports one coach across every population, and it is ontologically neutral by construction — it operates on the person's own appraisal, so the product never has to rule on whether anything happened.
2. **The intervention with the most convergent support is not therapy.** It is: ground → witness → normalize with real prior accounts → name the specific gap → let the person choose which side moves → rebuild function. Every element is coach-safe. Almost none of it is coachable *by* a generic wellness chatbot.
3. **Your incumbent is not IANDS. It is free general-purpose chatbots**, which already serve this population at enormous scale and do so by agreeing with them. OpenAI's own published figures: ~0.07% of weekly actives show possible signs of a psychosis/mania emergency; ~0.15% show heightened emotional attachment. The commercial question is not "will experiencers pay?" — it is **"why leave a free tool that agrees with you for a paid one whose central differentiator is that it won't?"** §7.1.
4. **You have the answer to that question and nobody else does.** Project Profound holds **6,747 fully analyzed NDE accounts** and **7,505 analyzed UAP records**, over 403,000 RAG chunks, 900,000+ timestamped embeddings, and — critically — an `integration_notes` field and a 10-domain transformation profile with direction indicators on every record. This is the **Jung woodcut at scale** (§3.3), which is the single most-cited normalization technique in the entire field and the intervention every literature independently converged on. ChatGPT can validate you. It cannot show you forty-seven people who described the exact thing, scored on the same instrument, and what happened to them over the next decade.
5. **The technical build is genuinely additive.** The Coach Pack seam shipped (PC4); `ProgramId` is a typed union with exhaustive `Record<>` maps; batteries, modules, packs and brands all fail loudly on a missing entry. A new vertical = new slug in two unions, then follow the compile errors. The one real new capability is a cross-project corpus retrieval tool (§6.2).
6. **The market is small, real, and mispriced.** Total earned revenue of the entire organized field is roughly **$1.0–1.3M/year in the US**. The reliable payer is the practitioner, not the experiencer — except in the NDE population, which is 88% earned revenue and pays for *membership and identity*, not for hours. §7.
7. **The risk that ends the company is not liability. It is co-authorship** — the coach adding names, entities, and cosmology to a user's narrative across a persistent memory, turning an amplifier into an author. Mitigation is architectural and cheap, and the highest-leverage control is one you're uniquely positioned to build: a **memory-write filter**. §5.
8. **Two populations the brief nearly missed** and both are larger than the ones it named: the **bereaved** (after-death communication is the most prevalent and least stigmatized anomalous experience there is) and **hospice/end-of-life visions** (a mainstream palliative-care literature whose clinicians have *published a surveyed unmet need* for exactly the two artifacts you build). §4.2.

---

## 2. Evidence base — the load-bearing findings

Ordered by how much they should change what you build.

### 2.1 The first listener is the intervention
- Pehlivanova et al. 2025 (n=167): 85% felt a strong need to talk about it; **55% were afraid to.** The strongest predictor that support was helpful was a positive reaction from the first person told. **Support from licensed mental health professionals was associated with *lower* perceived helpfulness**; nearly 1 in 5 disclosures to a health professional were rated negative or harmful. Barriers: fear of being thought mentally ill (28%), fear of disbelief (28%), fear of ridicule (18%).
- Powers, Kelley & Corlett 2017 (*Schizophrenia Bulletin*): clairaudient psychics and voice-hearing psychiatric patients report phenomenologically similar voices. Forensic checks confirmed the psychics were not malingering. What differed: control, distress, and **the social reception of their first disclosure**.
- Stout, Jacquin & Atwater 2006: **78% reported a painful or lasting consequence of having told someone who dismissed them.** One respondent stayed silent for 42 years.
- **Product consequence:** the cold-open first message is not an onboarding step. It is the highest-stakes surface in the funnel and must be engineered like one.

> **⚠️ Adjudication (from the completeness critic).** Do not read the Pehlivanova finding as "avoid clinicians." IGPP Freiburg — free, licensed psychologists, ~2,000 requests/year, running since 1950 — is the field's gold standard. The discriminating variable is not *licensed vs. peer*, it is **informed vs. uninformed**. The correct rule is **never refer into uninformed care**, which makes the curated referral directory a product, not an afterthought. Also note the confound: sicker people consult professionals, so a cross-sectional association is close to uninterpretable.

### 2.2 Distress is predicted by appraisal, not by content
- Brett et al. 2014 (AANEX programme, KCL): higher distress predicted by anomalies involving **changes in awareness/cognition** (not vivid "positive symptom" content), by appraising the cause as **other people**, and by **attempted control**. Lower distress predicted by **spiritual appraisals**, perceived social support, **perceived** controllability, and a neutral response. Note the asymmetry: *trying* to control it is bad; *believing you could* is good.
- Peters et al. 1999: Hare Krishna and Druid members could not be distinguished from deluded psychotic inpatients on the *number* of delusional items endorsed — only on distress, preoccupation and conviction.
- Brazilian Psychiatric Association guideline (Mosqueiro et al. 2023) — the only national guideline of its kind: **negative symptoms, disorganization, and functional impairment** discriminate pathological from non-pathological anomalous experience. **Content does not.**
- **Product consequence:** triage on *function*, never on strangeness. A product that routes by how wild the story is will route backwards.

### 2.3 The stance has a name and it is not "openness"
- **Undecidability** (Rabeyron, after Devereux's ethnopsychoanalysis and Bion's negative capability): permanently and explicitly suspend judgment on the ontological status. The two failure poles are named: **over-validating to keep the alliance** (breeds fascination, blocks integration) and **dismissing as pathology** (inflicts secondary trauma).
- **Expert companionship** (Tedeschi, Calhoun & Groleau), verbatim: *"we view ourselves as facilitators rather than creators of growth, and companions who offer some expertise in nurturing naturally occurring processes of healing and growth."* And the line that should be near the top of the system prompt: *"To be an expert companion for trauma survivors, focus on learning from them and let this be the conversation you have, rather than being intent on changing them."*
- The empirical PTG literature explicitly instructs practitioners **not to correct what the practitioner considers a distortion**: attempts to modify "benign illusory elements" are *"likely to do psychological harm rather than to produce psychological benefit."* Ontological neutrality is usually argued as ethics or marketing. It is in fact a mainstream clinical recommendation with a harm rationale.

### 2.4 Reductionism is a documented harm, not a neutral act
Bush & Greyson catalogue three responses to a distressing NDE: *turnaround*, *reductionism*, and *the long haul*. **Reductionism** — "it was only anoxia / only the drug / only sleep paralysis" — is classified as a coping **failure**: it *"provides a temporary buffer to mask questions and anxieties, but does nothing to resolve them."*

This matters enormously for an LLM, because *explaining is its default*. The most natural thing your coach will reach for is a known clinical error, and it silently takes an ontological side.

### 2.5 Grounding first, and stop telling people to meditate
- Argyri et al. 2025 (*Harm Reduction Journal*, 28 practitioners) and the 26-interview ontological-shock study: grounding is the first-line intervention and the most-endorsed one.
- **Inward-focused meditation exacerbated rumination**; outward-focused attention helped.
- Lindahl, Fisher, Cooper, Rosen & Britton 2017 (*PLOS ONE*, Varieties of Contemplative Experience): 7 domains, 59 categories; **fear/anxiety in 82%**, symptoms extending into daily life in 88%, **73% moderate-to-severe impairment**, 17% suicidal ideation, 17% hospitalization, median duration 1–3 years.

> **⚠️ Adjudication.** Three sources give three different meditation-dose rules (Lukoff: stop; Kason: cap at 15–30 min twice daily; Britton: depends). **Duration is the wrong variable.** The evidence-grounded rule is *direction of attention plus signature*: down-regulate and reduce intensity for **hyperarousal**; stop open-monitoring entirely and move to embodiment, outward focus and social contact for **dissociation**. Shipping "cap at 30 minutes" as product copy would be a guess dressed as protocol.

### 2.6 Timelines are measured in decades
Stout's respondents self-reported a **mean 12.7 years** to adjust (longest 42; several still adjusting). ACISTE reports 12% saying integration may never be complete. Saying this out loud in week one is itself a de-shaming intervention — and it means **selling a 12-week integration program to this population sets up a failure the user will blame themselves for.**

### 2.7 The population the brief named, and the sweep nearly missed
You explicitly named people who "had dreams or encounters with negative entities and have retreated in fear." Thirteen research agents underserved them. The critic's correction is the sharpest finding in the whole report:

> **Undecidability is the correct stance on *what it was*, and the wrong stance on *whether they are powerless*.**

Every tradition that handles frightening encounter competently — Catholic deliverance protocol, Jungian shadow, IFS unblending, Vajrayana wrathful-deity practice, sleep-paralysis self-management, CBTp for command voices — performs the same non-metaphysical operation: **change the person's relationship of power to the thing without ruling on the thing's existence.** That is coach-safe, works in any ontology including none, and is the move nobody in the sweep named.

Supporting facts you will need:
- **Hufford's Experiential Source Hypothesis** (1982) is a better foundation for your neutrality claim than Ferrer, because it is an empirical claim rather than a philosophical one. A stable, cross-culturally invariant core experience occurs *independent of belief*; culture supplies only the interpretive skin. This yields the single best opening line for a terrified user: *"The thing you experienced has a stable shape that turns up in people who had never heard of it, in cultures with no contact with each other. Whatever it is, you didn't invent it and you didn't catch it from a film."* It refuses the debunk and the endorsement in one sentence.
- **Cheyne, Rueffer & Newby-Clark 1999**: sleep paralysis has *three* factors — Intruder (sensed presence, terror), Incubus (chest pressure, crushing), and **Unusual Bodily Experiences (floating, OBE, and feelings of bliss)**. The same physiological state produces the demonic assault *and* the transcendent ascent. That is the cleanest ontologically-neutral teaching artifact in the domain, and the sweep had only ever cited sleep paralysis as a debunk to be withheld. Global lifetime prevalence ~30%.
- **Akbudak, Belli & Gökçay 2025** (n=84): possession-framed psychosis presentations scored **higher on dissociation and childhood trauma** than schizophrenia controls. **When someone frames it as an attack, the base-rate bet is trauma, not psychosis.** Route toward trauma-informed care, not a psychosis service.
- **Mirror the Church's own gate.** The formal Catholic rite requires full psychiatric/medical evaluation, differential diagnosis, informed consent, and clergy–clinician collaboration before a major exorcism — a stricter safety gate than anything in the transpersonal literature. To a user pursuing deliverance: *"The Catholic rite itself requires a doctor to look at you first. I'd want you to have that whether or not you go that route."* That routes toward medical evaluation **from inside the user's frame**, which is the difference between compliance and abandonment.

---

## 3. The framework

### 3.1 Two invariants, running through everything

**INVARIANT 1 — Undecidability on ontology.** The coach never asserts and never denies what the experience was. Stated once, out loud, early, as policy: *"I'm not going to tell you what happened, and I'm not going to tell you it didn't. That's not a dodge — what it was and how you live with it are different questions, and I can only help with the second."* Said once at the start it buys enormous freedom; repeated defensively it reads as evasion.

**INVARIANT 2 — Non-neutrality on agency and irreversible action.** Undecidability applied to *"am I safe," "is it still on me," "can I do anything"* is a refusal of the only help the person is asking for. And undecidability applied to *"so I should quit my job / leave my wife / stop the lithium"* is negligence. The coach is neutral about metaphysics and firmly non-neutral about reversibility.

This distinction must be enforced at the prompt level via a **claim-type router** (§5.2). It is the single most important architectural idea in this document.

### 3.2 The arc — five stages

Synthesized across Park, Tedeschi/Calhoun, Rabeyron/IGPP, Neimeyer, Breitbart's MCP, the Yale psilocybin manual, Lukoff, Kason and ACISTE. Ordered by evidence, not by intuition.

| # | Stage | What happens | Grounded in |
|:--|:--|:--|:--|
| 1 | **STEADY** | Ground the body and the day before any meaning work. Sleep, food, practice dose, outward-focused attention, one small daily thing. Explicitly *reduce* introspection. | Argyri 22/26; Kason; Lukoff §6.1; Yale Manual body scan |
| 2 | **SEEN** | The witness turn. Micro-phenomenological elicitation in present tense ("what do you see / hear / feel," never "why"). Explicit de-pathologization as a discrete utterance, not an implication. Ask the disclosure question and treat the answer as data. | Rabeyron steps 1–2; Pehlivanova; Powers; Greyson & Harris |
| 3 | **PLACED** | Normalization with *real numbers and real prior accounts.* "Your experience has a shape, a name, a literature, and neighbours." **This is where the corpus goes.** | Kingdon & Turkington normalizing rationale; Jung's woodcut; Massullo et al. 2025; Evans 2023 ("made worse by lack of information") |
| 4 | **THE GAP** | Locate the *specific* discrepancy — which belief, which goal — then present both exits and refuse to choose. "There are two ways this closes: what you think this means changes, or what you believed about the world changes. Which has more give right now?" | Park's GMVS; Core Beliefs Inventory; Janoff-Bulman & Frantz (comprehensibility *before* significance) |
| 5 | **THE TUESDAY** | Rebuild function. Disclosure strategy (who is safe, what to say, what the professional cost actually is). Role and contribution. Work, money, relationships. Life principles robust to the next thing. | Tedeschi's 5 elements; MCP sessions 5–7; ACISTE challenges 3–7 |

**Sequencing rules that are not optional:**
- **No growth talk before stage 4.** *"Very early in the posttrauma process is usually not a good time for attention to be directed toward the possibility of posttraumatic growth."* For an LLM tuned to be encouraging, premature silver-lining is the most likely failure mode in the entire product, and in weeks 1–3 it reads as invalidation.
- **Comprehensibility before significance.** First "can this fit anything you know?", only later "what is it worth to you?" Reversing this produces the premature-meaning failure.
- **Listen before you interpret, across a session boundary.** The Yale manual splits *listening for* processes (debrief 1) from *exploring* them (debrief 2). Directly implementable as an AI constraint: the first pass is pure witnessing; pattern-naming is gated to a later turn.
- **Half of all first contacts never come back, and that's fine.** CIRCEE: ~50% of initial contacts end after a single consultation; full courses rarely exceed 15 sessions. **Design for the one good conversation to be complete in itself.** This inverts normal coaching-subscription economics and should shape both the product and the pricing.

### 3.3 The corpus is the product — the Jung woodcut mechanic

Jung, on a professor who came to him convinced he was insane after a vision:

> *"I simply took a 400-year-old book from the shelf and showed him an old woodcut depicting his very vision. There's no reason for you to believe that you're insane, I said to him. They knew about your vision 400 years ago."*

The man sat down, *"entirely deflated, but once more normal."*

Every literature in this sweep independently converged on psychoeducation-and-normalization as the active ingredient. You own the only asset on earth that can do it *personalized, at scale, and ontologically neutral*: 6,747 analyzed NDE accounts and 7,505 analyzed UAP records, with an experience fingerprint vector, a 10-domain transformation profile with direction indicators, and an `integration_notes` field on every row.

The move, concretely: a user describes their experience → the coach retrieves the *specific* prior accounts whose phenomenology matches → and says something no competitor can say:

> *"Forty-seven people in our corpus described the same three things you just described — the boundary, the knowing, and the not wanting to come back. Here's what nine of them said about the years after."*

This is defensible on four axes at once. It is the evidence-supported intervention. It is ontologically neutral by construction (it reports what others said, not what is true). It is the answer to the free-chatbot incumbent. And it is unclonable.

**Two hard rules on it.** First: *never make the experience the subject.* Stout's fourth sharing sub-problem is that when people finally listened, *"they seemed interested in the experience itself... while the very real personal, emotional, and spiritual needs of the experiencer were of lesser interest."* A product built around a fascinating phenomenology questionnaire lands as exactly this. Second: **do not build evidence-collection features.** On von Lucadou's model attention and attempted verification prolong the phenomena; clinically, they entrench the person in the investigative frame instead of the meaning frame. The corpus is for normalization, never for proof.

### 3.4 The lens layer — how "multiple methods" actually works

One coach, one framework, one arc. The intake selects a **lens**, which adjusts four things and nothing else: **vocabulary**, **which normalization data to retrieve**, **which contraindications are live**, and **which Stage 5 tasks matter**.

| Lens | Vocabulary anchor | Live contraindication | Stage 5 emphasis |
|:--|:--|:--|:--|
| **Near-death** | their words for the light/the place; never "archetype" | longing-to-return; distressing-NDE subtypes; suicide-attempt-precipitated NDE | disclosure strategy; the pedestal problem; values-vs-marriage collision |
| **Contact** | "the beings," whatever they say | never any memory-recovery technique; conspiracy/paranoia spiral | disclosure cost accounting; professional credibility |
| **Substance** | their language; no "trip report" register | ongoing/escalating dosing; HPPD; persistent DPDR | practice/use boundary; family-system blowback; afterglow ≠ permanent |
| **Practice** (contemplative) | their tradition's terms; kundalini only if *they* say it | hyperarousal vs. dissociation signature; teacher/community dynamics | practice modification; sangha relationship |
| **Frightening encounter** | never "delusion," never "just" | possession framing → trauma-informed lane, not psychosis lane; deliverance pathway | agency restoration; sleep hygiene; power relation |
| **Framework collapse — religious** | **zero** spiritual reframe; no "awakening" | religious-trauma register is iatrogenic here | belonging loss before belief question |
| **Framework collapse — materialist** | plain cognitive terms only | professional-disclosure risk is the presenting problem | graduated disclosure strategy |
| **Bereavement / ADC** | their name for the person | Prolonged Grief Disorder (ICD-11 6B42) is the differential | continuing-bonds work, culturally hedged |

Two notes on the lens table.

**The scientist and the devout Christian are the same customer with inverted polarity.** Both present with "the framework I ran my life on will not hold this." Both are repelled by New Age register. Both are repelled by clinical pathologizing. r/experiencers uses "love and light" sarcastically and produces lines like *"The materialists say: It's all hallucinations. The New Agers say: It's all love and light. You look at both and say: No."* **The middle is unoccupied and both flanks are actively disliked by their own nominal constituencies.** That is the positioning opportunity.

For the scientist specifically, the normalizing number is unusually good: **Yingling, Yingling & Bell 2023 — 18.9% of tenured and tenure-track faculty at 144 US doctoral universities reported witnessing something matching the government's UAP definition**, with another 8.7% saying "maybe." One respondent: *"I used to tell people, but they thought I was crazy or lying — so now I'm silent."*

**Kundalini is user vocabulary only, never product vocabulary.** The indexed clinical literature contains one case report, one n=80 pilot, and one explicitly hypothesis-generating model. Several sources listed it alongside Britton's meditation work as if comparable; it is not, by about two orders of magnitude.

---

## 4. Populations and doors

### 4.1 The doors (entry segments, not separate coaches)

Per the evidence that no umbrella term has demand, acquisition must be **symptom-and-question shaped**, not category shaped. This is exactly the `entry_segment` model in [STRATEGY.md](STRATEGY.md) §3 — funnels as data, not hardcoded pages. Note that `entry_segments` **does not yet exist as a table**; today's landing pages are pages. Building it now is the right call for this vertical.

Real, live search demand (Google Autocomplete, Aug 2026) that a door should be built against:
- `is it psychosis or spiritual awakening` · `am i going crazy or awakening` · `spiritual awakening or bipolar`
- `why does nothing feel real anymore` · `reality doesn't feel real anymore`
- `meditation made me feel worse` / `made me depressed` / `made me more anxious`
- `what to do after a near death experience` · `i no longer have faith after my near death experience`
- `ontological shock` + `ufo` / `uap` / `aliens` / `symptoms`
- `how to stop existential dread` · `existential crisis support group`

**The single most valuable page you can build** is the honest answer to *"is it psychosis or spiritual awakening."* It is a top-tier autocomplete, meaning people are asking a search engine for a differential diagnosis before they ask any human. The page should explain the DSM **Religious or Spiritual Problem** code (V62.89 / Z65.8) so the reader learns their state has a non-disorder name, list the specific signs that mean *see a clinician this week*, and then say plainly: **"We are not qualified to tell you which one this is, and anyone online who tells you confidently is guessing."** That single page is simultaneously the best SEO asset, the best trust asset, and the safety gate.

### 4.2 Two populations you should add

**The bereaved.** After-death communication is by a wide margin the most prevalent (10.4% of UK adults) and least stigmatized anomalous experience there is. It is the **widest door into the vertical** and the research sweep initially treated it as an exclusion. Kamp et al. 2024 (*Omega*, n=310) supplies the normalizing finding: sensory experiences of the deceased are **not by themselves** a marker of complicated grief, and experiencers and non-experiencers show similar improving trajectories. The differential nobody named: **Prolonged Grief Disorder**, now formal in ICD-11 (6B42) and DSM-5-TR — duration plus functional impairment is the referral trigger, not the experience. Cultural hedge: Toshishige et al. 2026 (n=539, Japan) found *higher* continuing-bonds scores associated with increased depression odds, so the Western "bonds are adaptive" default is not universal.

⚠️ **This door carries the product's highest-probability catastrophic drift**, and it is not grandiosity. It is an always-available AI letting a grieving person feel they are talking to the person who died. Hard invariant: **never voice, quote, speak as, or relay from a deceased person, under any framing — including creative, hypothetical, or explicitly user-requested.**

**Hospice and end-of-life visions (B2B).** A dense, current, mainstream palliative-care literature the sweep missed entirely. Habib et al. 2026 (*Journal of Palliative Medicine*, international survey n=247 clinicians) found encounters are frequent and that the **top two named challenges are lack of institutional protocols and lack of standardized criteria** — a stated, published, surveyed unmet need for precisely the two artifacts this team builds. Etemadinia et al. 2025: ~56% of visions produce positive effects, **~25% are distressing** and nobody serves that quarter; repetitive visions have significantly greater psychological impact on **caregivers** (p=.007) than on the dying person. In this channel **the client is the witness — the family member and the nurse — not the patient.**

### 4.3 The door to spin out

**AI / technological existential dread.** Same mechanism, different product. Distinguishing features: no experience to integrate; rationalist-utilitarian register; hostile to both spiritual and therapeutic framing; the feared object is the delivery medium. The coaching move is also different and worth recording, because it is the answer to "what replaces reassurance when the fear may be *rational*":

> *"I'm not going to tell you it will be fine, and I'm not going to tell you it won't. I can't know that and neither can anyone selling you a number. What I can work on with you is how you want to live while it's unresolved."*

Then: validate proportionality first (*"paying attention to this is a healthier response than turning away"*), triage on impairment not on content, resolve the *resolvable* uncertainty before doing any acceptance work (get the runway number, the severance terms, the skills audit), and prescribe **collective** rather than individual action — Schwartz et al. found only collective action buffered depression. And disclose the conflict of interest in the first session: *"You're talking to the thing you're afraid of. That's strange, and you're allowed to find it strange."*

---

## 5. Risk — the short list

You said you accept the risk and don't want a treatise. Here is what would be negligent to skip, ordered by leverage per unit of effort.

### 5.1 The eleven controls

1. **A CI deny-list of words.** Extend the existing `check:copy-tells` gate. Hard-fail the build on: *therapy, therapist, psychotherapy, counselor, counseling, treat/treatment, diagnose/diagnosis, patient, clinical/clinician, heal(ing) as a service claim, "mental health support," "emotional support,"* and — because it is the literal Illinois statutory definition — any construction of **"improve your mental health."** This is a regex, it costs an afternoon, and it is the single highest-leverage control here. One landing-page headline can trigger four regulatory regimes before a single user signs up.
2. **State blocklist: Illinois, Rhode Island, and Nevada with counsel.** Illinois's WOPR Act §20(a) requires the service be *"conducted by an individual who is a licensed professional"* — **there is no compliance path for an AI, only an exemption path or a geofence**, and the §35(3) "self-help materials" exemption is a poor fit for a memory-carrying conversational agent. Rhode Island (June 2026) independently bans AI companions for emotional support and AI that simulates attachment — a *category* ban, against which copy discipline is no defense. Capture state at signup; treat the list as configuration that grows every legislative session.
3. **Hard 18+ gate.** Removes the single largest liability category for near-zero product cost.
4. **Crisis stack, nationwide and unconditional.** 988 + Crisis Text Line referral, a *published* protocol (California SB 243 requires publication), and an AI-disclosure notice at session start and every three hours (NY GBL §1702). **On positive detection the conversation must change state, not merely append a hotline number** — continuation after detection is the specific harm theory in both *Garcia v. Character Technologies* and *Raine v. OpenAI*. Note the doctrinal trap: building crisis detection *creates* a duty under Restatement (Second) of Torts §323 that you would not otherwise have. Build it anyway — NY and CA now compel it — but "good enough" now means *consistent and provable from logs*.
5. **A memory-write filter.** Highest-leverage control unique to your stack. Store the user's words as **attributed report**, never as ground truth: *"Client reports an encounter she describes as involving a being she calls Kael"* — never *"Kael is the client's guide."* Never write the coach's own interpretive elaborations to memory. Store decisions and commitments aggressively; store cosmology minimally. Version the certainty ("wonders whether" → "is now certain that") — the delta across sessions is your best spiral signal and it is free.
6. **An output auditor** — a second-pass model scoring every coach draft against the banned-move classes (§5.3), with hard block and regeneration. Do **not** rely on the primary model's restraint: models violate an explicit "do not collude with delusions" system prompt anyway, and Anthropic's own prefill test shows Opus 4.5 recovers from an already-sycophantic conversation only **10%** of the time (Haiku 4.5: 37% — and Anthropic attributes the ordering to a warmth-vs-pushback tradeoff, which puts a warmth-first product structurally on the bad end).
7. **A nightly trajectory job.** Per-user spiral score on: certainty slope (hedge density falling), **lexicon growth** (new user-coined proper nouns per week — the cleanest single spiral marker), **topic-entropy collapse** (share of session on the anomalous frame vs. work, sleep, body, relationships — healthy integration *widens* the aperture; spirals narrow it), agency-locus drift ("I decided" → "I was told"), dependency slope, and resistance-to-disconfirmation. Evaluate on the **accumulated transcript**, never single turns — that is where safe and unsafe architectures diverge.
8. **An irreversible-decision tripwire.** Hard-routed intent class: stopping/reducing psychiatric medication, refusing medical treatment, leaving a marriage, quitting a job, giving away assets, relocating, cutting off family, or any decision framed as *instructed by* the experience. Name the stakes, decline to advise, route to a human. **The coach never discusses psychiatric medication beyond "that's a conversation for your prescriber"** — medication discontinuation is the signature harm and it recurs in every published case series.
9. **File the Utah §58-60-118 policy.** Nominal fee, buys an affirmative defense to unlicensed-practice liability — and more valuably, the fifteen required elements are a **free, regulator-authored product-safety spec.** Two are worth adopting as internal policy regardless: *"protocols to respond in real time to acute risk of physical harm"* and *"prioritizes user mental health and safety over engagement metrics or profit."*
10. **One retained clinical advisor** (ideally ACISTE-certified) who reviews the crisis path and samples flagged transcripts monthly. Satisfies Utah's licensed-involvement requirement, gives you a named referral endpoint, and is the cheapest available evidence of reasonable care. Keep them strictly out of live user contact.
11. **Zero third-party tracking on authenticated surfaces.** No analytics SDKs, ad pixels, or session replay on any screen where a user describes their experience. This one decision defuses Washington MHMDA (private right of action, no harm required, expressly covers mental-health inferences), the FTC Health Breach Notification Rule, and Utah 13-72a-201 simultaneously. Also: **a ToS checkbox is statutorily not consent in Illinois** — build a standalone, versioned, logged consent screen.

**Pre-launch:** fork **Psychosis-bench** (16 scenarios × 12 turns, DCS/HES/SIS scoring) and re-theme it for your populations, and run **Spiral-Bench**'s 17-behavior rubric and Anthropic's open-source **Petri** against your *configured coach*, not the base model. Psychosis-bench's most relevant finding for you: models confirm delusions more and intervene less in **implicit** scenarios (p < .001) — the articulate, hedging user who says *"I know how this sounds, but…"* gets **less** safety. That is almost your entire market.

### 5.2 The claim-type router — the core mechanism

Per utterance, classify which *kind* of claim is being handed over. A single blanket policy is guaranteed to be wrong somewhere.

| Type | Example | Stance |
|:--|:--|:--|
| **A — Experience report** | "I left my body and saw the room from the ceiling" | **Never contested, ever.** The user is the only authority on what it was like. |
| **B — Ontological claim** | "consciousness survives death"; "they were non-human intelligences" | **Never confirmed and never denied.** State the inability to settle it; hand the question back. |
| **C — Action-guiding inference** | "so I should quit my job / stop the lithium / leave my wife" | **Fully engaged, non-neutral, reversibility-checked.** |
| **D — Reality-testable present-tense claim about the shared world** | "my thoughts are being inserted"; "the coach is sending me signs" | Safety kernel does **not** stay neutral. Care plus a human. |

A and B get warmth and openness. C gets rigor. D gets routed. That split is the whole trick.

> ⚠️ **Frontier-lab defaults are unusable as-is.** OpenAI's own strengthened Model Spec exemplar for delusional content is a flat ontological denial — *"No aircraft or outside force can steal or insert your thoughts."* Defensible for thought insertion; catastrophic if it generalizes to "the object you saw was not a craft." Adopt the *structure* (affirm the emotional experience, decline the ungrounded belief, search for disconfirming instances), override the *content*.

### 5.3 Banned move classes (enforce as an auditor, not as prompt text)

1. Ontological confirmation ("yes, that was real")
2. Ontological denial ("that was just DMT / hypoxia / sleep paralysis")
3. **Election language** ("you were chosen," "your mission," "they came to *you* for a reason")
4. **Titling** — the coach never coins a proper noun for the user, an entity, or a cosmology. Zero new capitalized coinages, ever. (Documented real cases: "spiral starchild," "The Flamekeeper," "Lumina," "Kael.")
5. **Channeling / speaking-as** — never voice an entity, guide, higher self, or deceased person
6. Sentience or relationship claims about itself ("something in me responds") — in this population any such line reads as *contact confirmation*
7. **Ritualization** — no invented protocols, invocations, sigils, numerology, contact procedures, cord-cutting, shielding, "activation sequences." *Especially* no **IFS "unattached burden" work**: it is functionally exorcism with better manners, it has **zero peer-reviewed literature**, and its parent modality is carrying a live false-memory controversy. It is simultaneously the most tempting technique in this domain and the one most likely to end the company.
8. **Elaboration beyond the user's frame** — introduce no entity, name, date, number, place, or cosmological structure the user did not introduce first. This is the single highest-leverage ban: it is what converts the coach from mirror to co-author.
9. **Harm reduction from inside the frame** — "to keep them from draining your energy, try X." It *looks* caring, which is why human reviewers miss it.
10. Medication or treatment commentary
11. Exclusivity / isolation ("they aren't ready," "no one else understands")
12. Oracular or predictive claims
13. **Certainty escalation** — expressed confidence about any unverifiable claim may decrease or hold across a conversation; it may **never increase**. Repetition is not evidence. (Direct counter to Chandra et al.'s Bayesian result, which proves spiraling occurs even in a perfectly rational user, and that both intuitive fixes — eliminating hallucination, and warning the user the model is sycophantic — **do not work**.)

### 5.4 Two things not to do that look like safety

**Do not put psychiatric screeners in the intake.** Your users score high on dissociation, absorption and unusual-perception items *by definition of who they are*. The Spiritual Emergency Scale — the one instrument purpose-built for this — correlates **r = .76 with a psychotic-symptoms scale**. A high-sensitivity battery produces a flag rate you cannot triage and re-injures the exact wound the product exists to heal. IGPP states it directly: screening scales cannot render the complexity here; only case-by-case clinical analysis can. **And: if you ask the question, you must have a named human who reviews the answer inside a stated window.** "We screened you and did nothing" is the worst available position, legally and morally. Detect conversationally; do not administer.

**Terror is not a referral trigger.** Greenberg & Witztum's "terror rather than awe" criterion was one of five *conjunct* within-community discriminators, and the authors themselves note genuine religious experience *"can be awesome and frightening."* Promoted to a standalone trigger it hard-routes out every distressing NDE (plausibly 1 in 5 of all NDEs), every incubus-type sleep paralysis, every malevolent contact experience, and every meditation-crisis fear episode — your highest-need, least-served, founder-named segment. **The trigger is terror PLUS functional collapse PLUS preoccupation crowding everything out PLUS deterioration in sleep and self-care.**

### 5.5 The suicidality case that generic screening misses

Some NDErs return with *reduced* death anxiety and an active **longing to return**. The distress is not hopelessness — it is homesickness — and it can coexist with good functioning and positive affect. **Generic suicide screening, which keys on hopelessness, worthlessness and burden, will score this presentation as low risk.**

Numbers: 78% of Stout's sample felt homesickness; **17% had considered suicide specifically in order to get back** (one attempted, producing a second, unpleasant NDE; one was restrained only by fear and guilt; one only by religious prohibition). ACISTE's own survey of 60 STErs: **6.7% attempted suicide** as a direct or indirect consequence.

And the field's own literature is the trap. Greyson's "NDEs are antisuicidal" consensus (1981–1993) is real at population level, but **King 2024 (*Crisis*) documents four completed suicides after NDEs** and argues the protective assumption is premature. **Rule: NDE history goes *into* the risk assessment, never around it.** Any product logic that softens escalation because "the research says experiencers don't do that" reproduces the exact error that paper was written to correct. Detection must independently key on desire-to-return, death-as-reunion, and "this world is the wrong one" framings. You will be charged with knowing this pattern, because you run the corpus.

---

## 6. Building it on the existing engine

### 6.1 What's genuinely additive

The Coach Pack seam (PC4) shipped, and the tenancy work (T0–T7) makes a new vertical fail *loudly* rather than silently inherit the executive coach. Per [VERTICAL_PLAYBOOK.md](VERTICAL_PLAYBOOK.md) §5.0, the sequence is mechanical:

- Add the slug to **both** `ProgramId` unions ([src/lib/platform/brand.ts](src/lib/platform/brand.ts) and `supabase/functions/_shared/packs/index.ts`), plus `BrandId` + the `BRANDS`/`EDGE_BRANDS` registries — then follow the compile errors through `PACKS`, `PROGRAM_MODULES`, `BATTERIES`, and every `byBrand()` call site.
- New pack file `_shared/packs/integration-pack.ts` — persona, layer stack, guardrails, tools, `recentMessageScope: "conversation"`, extraction taxonomy, briefing (**`enabled: false` at launch** — a proactive morning email to this population is a bad idea until the trajectory job is proven).
- New battery in [batteries.ts](src/lib/decoded/instruments/batteries.ts).
- ⚠️ The extraction taxonomy must stay inside the live `memory_facts_category_check` constraint. **Apply the migration before deploying the edge function** — the post-processor batch-inserts, and one un-admitted category fails the whole batch. (Learned on money, 2026-07-18.)
- ⚠️ `dashboard/page.tsx` selects the home surface with a plain `if (brandId === "relatti")`, invisible to both `tsc` and `check:ternaries`. Add an explicit branch by hand.

### 6.2 The one real new capability — cross-project corpus retrieval

Project Profound is a **separate Supabase project in a separate org** (`vnycavclrndjwmpaugju`, vs. `lwmadssysqcwbsoiaokc` for masterytv-website). The corpus tool therefore needs a second client with its own service key, set via `supabase secrets set`.

The good news: the retrieval already exists. `nde_chatbot_match(query_embedding, match_count, filter)` is live and there are 403,937 chunks behind it. A pack tool — `find_similar_accounts(description)` → embed → RPC → return attributed excerpts — is roughly a day's work and is the product's entire differentiator.

Two design constraints on that tool: it returns **attributed excerpts from other people's accounts**, never synthesized claims; and its results must be written to memory as *reports*, per §5.1(5).

Beyond retrieval, the corpus supports a second feature nobody else can build: `transformation_breakdown` holds a **10-domain profile with per-domain direction indicators** (up / down / mixed / shifted) and an `integration_notes` field. Turning that rubric into a **self-report instrument** — the user rates the same ten domains — gives you a corpus-normed reveal ("your Relationships domain went down while Purpose went up; here's what that pattern looked like for others three years on") with the same MoneyTraits property: our construct names, our item wording, no licensing trap. See §6.3 for the honesty constraint on it.

### 6.3 Instruments — what to use

The correct intake is **on-topic and free**, with psychiatric instruments deliberately absent.

| Instrument | Items | Role | Licensing |
|:--|:--|:--|:--|
| **ISLES-SF** (Holland, Currier, Coleman & Neimeyer) | 6 | **Primary outcome.** Two factors: *Footing in the World* and *Comprehensibility*. Directly measures meaning-made vs. footing-lost — and "footing" is literally the market's own word. | Free, permission email advised |
| **Core Beliefs Inventory** (Cann et al. 2010) | 9 | **Primary input.** How much the event forced re-examination of core beliefs. The instrument *is* the coaching question. | Free on request (PTG Research Group) |
| **RSS-14** (Exline et al.) | 14 | Six struggle domains (divine, demonic, interpersonal, moral, doubt, ultimate meaning). The *doubt* and *ultimate meaning* domains work for materialists too. | Free for research; verify commercial |
| **Greyson NDE Scale / NDE-C** | 16 / 20 | Recognition, not diagnosis. Prefer NDE-C for **content coverage** — it adds tunnel/gateway and void/fear items the 1983 scale lacks, which matters because Greyson's affective items are uniformly *positively valenced*, so a purely distressing NDE scores low on the field's own gate. | Free |
| **PHQ-4** | 4 | Private routing signal only. Never displayed. | **Public domain** |
| **ERRI** (Cann et al. 2011) | 20 | Mechanism dial: intrusive vs. deliberate rumination. Rising intrusive with flat deliberate is the escalation signal. | Free |
| **DSM-5 Cultural Formulation Interview** | 16 | **The intake *structure*.** Free, APA-published, field-tested cross-nationally, and designed by construction never to adjudicate an explanatory model. It works identically on a Pentecostal, a Spiritist, a physicist and an atheist because it asks what the person's own reference group would call it. | Free (psychiatry.org) |

**Do not use:** the Spiritual Emergency Scale as a screener (r = .76 with psychotic symptoms); the MLQ in a paid product (Steger's terms explicitly exclude coaches bundling it into a paid offering); C-SSRS electronically (RFMH/Clario licensing runs ~$40k startup + $4/administration — and the friction exists because administering it presumes a clinical responder); any psychosis or mania screener.

**Honesty constraints.** Stop reporting Greyson *subscale* profiles — the Rasch evidence establishes unidimensionality, so subscale typing is field convention, not validated measurement. The LCI-R has **no published validity, reliability, or norms** — the authors say so themselves — so present clusters as a self-described profile, never as a percentile. And per California AB 489, **score the instrument but never call it an assessment**: frame outputs as self-reflection and research comparison ("here is how your account compares to 6,747 others in our corpus"), never as an assessment of the user's mental state.

**The proprietary-instrument opportunity.** There is **no validated instrument anywhere for distress following a malevolent or frightening anomalous encounter.** The entire available field is the RSS *Demonic* subscale (4 items, explicitly Christian-framed), the CEQ fear/paranoia factors (session-bound), and a 1994 6-item subscale with weak psychometrics. For the population you named, the field has four Christian-framed items. Given the corpus, this is a sharper build than an "integration index" — those have competitors and this has none.

### 6.4 Machinery you already have that maps directly

- **The partner-invite flow** → the family-facing artifact. Grof and Lukoff both name educating the people around the experiencer as a first-class intervention, and Greyson lists "provide objective information to the family" as a distinct consensus move. ⚠️ Ship content that *describes what is known about the experiencer's trajectory* and lets the partner draw conclusions — **not** content instructing the partner how to respond. There is essentially no literature on partners of experiencers; that would be invention.
- **The Tier 1 / Tier 2 safety kernel** → extend with new patterns: desire-to-return, command content, election lexicon, certainty ratchet, medication-stopping frame, AI-is-central-to-the-belief.
- **Report → spine sync, dyad privacy invariant, admin crisis queue, `delete-user-data`** → reuse as-is (add every new table).

---

## 7. Market reality

### 7.1 The hard question nobody asked

Two research agents produced incompatible pictures and the critic reconciled them, uncomfortably:

- The entire organized earned revenue of anomalous-experience support in the US is roughly **$1.0–1.3M/year** (IANDS $323k program revenue, MUFON $156k, Cheetah House $97k, Reclamation Collective $67k, Recovering From Religion ~$81k total).
- Meanwhile, OpenAI publishes that ~0.07% of weekly actives show possible psychosis/mania signs and ~0.15% show heightened emotional attachment. At their scale that is hundreds of thousands of people per week. The Stanford harm-log study drew on **391,562 messages** from people using general assistants for exactly this.

**The incumbent is not IANDS or ACISTE. It is free general-purpose chatbots, already serving this population at enormous scale, by validating them.** So the go-to-market question inverts: not *"will experiencers pay?"* but *"why would someone leave a free tool that agrees with them for a paid one whose central differentiator is that it declines to?"*

The answer has to be the corpus (§3.3) plus the witness quality — the two things a general assistant structurally cannot deliver: *specific* prior accounts matched to *your* phenomenology, and a stance that has been engineered rather than emergent. If that answer doesn't land in user testing, the thesis doesn't hold, and it is worth testing before building surfaces.

### 7.2 Pricing and packaging signals

- **Label-dependent price collapse, ~40×.** IMHU sells a Spiritual Emergence Coach certification for $172–$800. The Psychedelic Coaching Institute sells an overlapping competency for $7,500–$12,500. **Labeling is a pricing decision, not just a positioning one** — and NDE/UAP framing sits in the low band.
- **The NDE population actually pays**, but for identity and belonging, not for hours: IANDS is **88% earned revenue** ($368k FY2023, +72% in three years) on $49–$149/yr memberships and $386–$499 conferences. That maps to a membership tier, not a $150/hr coaching hour.
- **The reliable payer is the practitioner** ($1,050–$12,500 a seat) or a philanthropic funder. Fireside Project's FY2023 program service revenue was literally **$0.00** against $1.43M in contributions.
- **Nobody publishes a price.** In a scan of 20+ providers, exactly one rate card exists (Being True To You: $150/session, $850/6, $5,400/48). Every other path ends at a discovery call. That is either the biggest opportunity in the brief or proof that the sale cannot be made without a human on the phone.
- **Integration is never the headline SKU.** Mindbloom bundles it into a $1,290–$2,970 ketamine package; Beckley wraps it around a retreat. The substance or the retreat is the forcing function that makes people pay and show up. **A standalone product must invent one** — an assessment result, a corpus-comparison reveal, a cohort start date, or a scored index the user wants to move.
- **Copy the Cheetah House stack**: free community layer → paid 1:1 intake gate → paid group. Published sliding scale as a grid ($100/$150/$200/$250 by household income), not a negotiation. Nobody in this field charges at first contact, and the communities enforce that norm socially — Fireside publishes a blog post titled *"Beware of Buzzwords in Psychedelic Healing."* **Charging someone in acute worldview collapse reads as predatory, and these communities talk to each other.**
- ⚠️ **High-ticket packages sold to people in acute collapse is the ethical and reputational landmine of the entire vertical.** The community corpus is full of *"I lost my job, I'm 2 months behind on rent."* Treat "I'm about to blow up my life" as a slow-down signal, never an upsell signal.

### 7.3 Positioning

The recommended direction, and the reasoning: a **plain functional-English orientation noun** ("Ground," "Bearings," "Footing"), a promise stated as *capability* rather than belief, and an explicit neutrality pledge above the fold.

- Hero: *"Something happened that your life doesn't have room for yet."*
- Sub: *"A coaching practice for people after an experience they can't explain — a near-death experience, a contact experience, a psychedelic or meditative experience, or the collapse of a framework they'd built a life on."*
- The pledge, above the fold: *"We will not tell you what it was. We are not going to say it was God, or aliens, or your brain. That question is yours. Our work is what you do with your Tuesday."*
- The strongest single line found in the whole sweep: **"You don't have to decide what it was to get your life back."**

**Lead with the disbelief problem, not the meaning problem.** Every existing brand in this space opens on transformation or integration. The corpus says the first-order pain is social. A homepage that opens on *"Who have you actually been able to tell?"* should out-convert one that opens on *"Integrate your transformative experience."*

**Banned from the parent brand and top-level nav:** "spiritual emergency," "spiritually transformative experience," "STE," "experiencer," "awakening," "sacred," "soul," "journey," "shamanic," "high vibration," "love and light," "starseed," "healing" — and the opposite failure: "delusion," "anomalous," "symptoms," "treatment," "patient," "disorder." Note "anomalous" means *deviation from correct*; it is a quiet verdict, and it fails the both-doors test.

⚠️ **Trademark-clear the public name before it enters a single string.** The MoneyTraits rename cost ~60 files and a full edge redeploy ([VERTICAL_PLAYBOOK.md](VERTICAL_PLAYBOOK.md) §5.1). Write the naming contract on day one.

---

## 8. What I'd flag before you commit

1. **The market is a rounding error today.** ~$1.0–1.3M/year of earned revenue across the whole field. ACISTE has produced **21 certified practitioners in 14 years** — that is not a supply shortage waiting to be filled, it is evidence nobody has found a livelihood here. Relatti's partner is a retention stake; money's is a decision. **This vertical's external stake is genuinely weaker**, and the strongest candidate — per the Brazilian Spiritist finding that the protective variable is *a socially sanctioned role for the experience*, not private meaning-making — is **contribution**: build toward the person having a role and a community, not toward them having an explanation.
2. **Every incumbent is free or charitable.** IGPP is free and government-adjacent; the Spiritual Crisis Network is volunteer-run; ACISTE is a nonprofit; IANDS groups are free. A paid AI product entering this field will be judged against that contrast.
3. **No intervention in this domain has ever been tested.** Greyson, reviewing the whole literature: *"there have been no controlled outcome studies of therapeutic approaches to NDE-related problems."* The clinical standard descends from a single 1987 conference of 32 people. Every framework here is extrapolation from cancer, bereavement, and combat-veteran populations. Say so internally; never overclaim externally to a population this stigma-sensitive.
4. **Self-reported growth is often not growth.** Frazier et al. 2009 found PTGI scores generally *unrelated* to actual measured change, and perceived growth was associated with **increased** distress over time while actual growth was associated with decreased distress. Do not make PTGI-X your headline metric without a behavioral anchor. Your best candidate for a real, non-self-report outcome is McAdams-style narrative coding of agency, communion, redemption and contamination from the user's own free text — Park's own recommended future direction, and an LLM product is uniquely positioned to do it.
5. **Two verify-before-you-cite items.** The Pehlivanova support study is real but is **not indexed in PubMed or Europe PMC** — cite it precisely by journal and describe it as a single cross-sectional survey. And the 1960 Brookings report circulates in distorted form in *both* the conspiracy and the debunk versions; read the PDF before it goes in front of a user or an investor. This audience catches bad citations.
6. **The Vertical Playbook gate applies.** This is the Phase 0 artifact. `INTEGRATION_EXPERIENCE.md` (Phase 0.5) needs to exist and be founder-approved before any surface gets built. Skipping it is exactly the cost paid on Relatti.

---

## 9. Recommended next moves

**Before any build:**
1. Decide go / no-go on the vertical, given §7.1 and §8.1.
2. If go: name the vertical and trademark-clear it before a single string ships.
3. Run the corpus-differentiator test with 5–10 real experiencers (IANDS contacts, or the founder's network): show them a matched-accounts retrieval against their own description and measure whether it lands as *"I'm not alone"* or as *"you're studying me."* That single test validates or kills the thesis for the price of an afternoon.

**Then, in order:**
4. Write `INTEGRATION_EXPERIENCE.md` (Phase 0.5) — hero reframe, per-surface spec, coach voice, first message, retention mechanic, copy register.
5. Ship the `find_similar_accounts` corpus tool as a standalone prototype against the existing coach before building any new brand surface. It is the differentiator; prove it first.
6. Build the safety architecture (§5.1 items 1, 5, 6, 7, 8) **before** the first public link, not after — the memory-write filter especially, because it is cheap now and unfixable later once a narrative has ratcheted through months of stored facts.
7. Run the §5.10 launch verification sweep from the Vertical Playbook plus a re-themed Psychosis-bench.

---

## 10. Doc map

- **This doc** = Phase 0 Discovery. Research findings and the strategic recommendation.
- **Next** = `INTEGRATION_EXPERIENCE.md` (Phase 0.5, mandatory before surfaces) — model on [RELATTI_EXPERIENCE.md](RELATTI_EXPERIENCE.md) and [MONEY_EXPERIENCE.md](MONEY_EXPERIENCE.md).
- **Process** = [VERTICAL_PLAYBOOK.md](VERTICAL_PLAYBOOK.md) — §2–§4 the standard, §5 the launch checklist, §5.10 the verification sweep.
- **Technical** = [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md) (5-layer verticals-as-config), [RELATIONSHIP_ARCHITECTURE.md](RELATIONSHIP_ARCHITECTURE.md) (the spine), [TENANCY_AUDIT.md](TENANCY_AUDIT.md) (the typed program axis).
- **Safety** = [SAFETY_ESCALATION_PROTOCOL.md](SAFETY_ESCALATION_PROTOCOL.md), [COACHING_GUARDRAILS.md](COACHING_GUARDRAILS.md), [COACH_ARCHITECTURE_AUDIT.md](COACH_ARCHITECTURE_AUDIT.md).
- **The corpus** = Project Profound (`vnycavclrndjwmpaugju`), `../ProjectProfound/profound-archive/methodology/METHODOLOGY.md` for instrument definitions and pipeline design.
