# **Vertical Launch Playbook — The Standard Way to Build a New Domain**

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** June 26, 2026
> **Status:** 🌱 SEED — captures the standard; to be formalized + first-applied via **PV1** in `PLATFORM_SPRINT.md`.
> **Why this exists:** Relatti taught us that a new vertical is **far more customized than "re-theme the engine."** The flow, the assessment battery, the results/report structure, the coach voice, and nearly all copy are *vertical-specific* — and that customization is driven by **domain-specific human psychology** that must be **researched first**. We discovered this *after* building Relatti's surfaces on the Decoded spine and having to reframe them (see `RELATTI_EXPERIENCE.md`). Next time, the research comes first.

---

## 1. The core lesson

> **What's reusable is the *engine*. What's custom is the *experience* — and the experience is determined by research into how to psychologically move *that specific person in that specific situation*.**

We have strong **technical** multi-tenancy (one app → many domains, verticals-as-config; see `PLATFORM_ARCHITECTURE.md`). We did **not** yet have a standard for the **experience** side. This playbook adds it.

A vertical is **not** "Relatti with different colors." A relationship user, a laid-off career user, and a sport-mindset user need different *heroes*, *first moments*, *assessments*, *result structures*, and *coach voices*. Re-theming alone produces what Relatti became: a personality test wearing a relationship skin.

---

## 2. The standard sequence (insert Experience Discovery *before* build)

This extends the BMAD phases in `CLAUDE.md §8` with one **mandatory new phase** for any new vertical:

| Phase | Artifact | Purpose |
|:--|:--|:--|
| 0 — Discovery | `{VERTICAL}_DISCOVERY.md` | Market, competitor, willingness-to-pay, the external stake (retention thesis for this vertical). |
| **0.5 — Experience Discovery** ⭐ **(NEW, the gap Relatti exposed)** | **`{VERTICAL}_EXPERIENCE.md`** | **Research the psychology of moving *this* user, then spec the relationship-first/outcome-first experience: hero, journey, assessment, results, coach voice, retention mechanic, copy register.** |
| 1 — PRD | `{VERTICAL}_PRD.md` (or folded into Experience) | Features, scope, success criteria. |
| 2 — Architecture | reuse `PLATFORM_ARCHITECTURE.md` + a thin config delta | What config/modules/theme this vertical needs (mostly reuse). |
| 3 — Sprint | sprint epics | Build, sequenced. |
| 4 — Build | code | Implement against the experience spec, not the engine's defaults. |

**Gate 0.5 (advisory):** do not start building a vertical's surfaces until `{VERTICAL}_EXPERIENCE.md` exists and the founder has approved its reframe. Skipping it is *exactly* the cost we paid on Relatti.

---

## 3. What Experience Discovery (Phase 0.5) produces

`{VERTICAL}_EXPERIENCE.md` — model it on `RELATTI_EXPERIENCE.md` (the worked example). Required sections:

- **The reframe** — one sentence: who/what is the *hero* of this vertical, and what is demoted to an *instrument*. (Relatti: hero = the relationship; instrument = personality/attachment.)
- **The evidence base** — research the established science + validated digital-intervention findings for this domain (for relationships: Gottman/EFT/SDT/behavior-design + couples-app studies; for career: job-search psychology, identity/transition research, etc.). Cite sources.
- **Design principles** — the rubric every surface must satisfy.
- **The personalization model** — how the known profile (personality + the vertical's key dimension, e.g. attachment for relationships, RIASEC for career) **tunes the voice per person**. This is the platform's durable edge (we know who the user is; generic competitors don't).
- **Per-surface spec** — journey order, current→target for: marketing, signup, **assessment battery**, **the first result/report**, dashboard, **coach voice/first-message**, shared artifacts, the **retention mechanic**, email/SMS.
- **V1 scope + sequencing**, **open founder questions**, **doc map**.

### Experience Discovery checklist
- [ ] Domain psychology researched (what makes *this* user act / change / stay).
- [ ] Competitor experience teardown (their onboarding, first moment, retention mechanic).
- [ ] The **hero reframe** named and founder-approved.
- [ ] **Assessment battery** decided for this vertical (which instruments are decision-relevant — keep it short; see `STRATEGY.md`: the long test is a conversion tax).
- [ ] **Result/report structure** designed vertical-first (not the engine's default section order).
- [ ] **Coach voice + first message** specified for this vertical.
- [ ] **Retention mechanic** identified (the external stake → a concrete recurring behavior).
- [ ] **Per-person personalization** rules defined.
- [ ] Copy register chosen.

---

## 4. Reusable engine vs. per-vertical custom (set expectations)

| Layer | Reuse (config) | Expect to customize per vertical |
|:--|:--|:--|
| Identity / auth / billing plumbing | ✅ shared | seat model (solo vs dyad vs employer) |
| Assessment **engine** | ✅ shared | the **battery** + framing + the result structure |
| Report **generator** | ✅ shared | **section order, opener, voice, what's the hero** |
| Coach **engine** (memory, safety, channels) | ✅ shared | **first message, voice layer, retention behaviors** |
| Theme tokens / domains | ✅ config | brand spec |
| Dashboard shell / modules | ✅ config-gated | which modules, primary surface, copy |

> Rule of thumb from Relatti: **plumbing is ~80% reusable; the felt experience is ~80% custom.** Budget accordingly.

---

## 5. First application

**Next vertical (career — `mycareercoach.com` / similar): run Phase 0.5 BEFORE building any surfaces.** Produce `CAREER_EXPERIENCE.md` (hero = the job search / the deadline as the external stake; instruments = personality + RIASEC; research job-transition + motivation psychology). Tracked as **PV1.3**.

---

## 6. Doc map

- This playbook = the **process standard** for launching any vertical.
- Worked example = `RELATTI_EXPERIENCE.md`.
- Technical model it rides on = `PLATFORM_ARCHITECTURE.md` (5-layer verticals-as-config).
- Strategy context = `STRATEGY.md` (the relationship → career → white-label roadmap).
