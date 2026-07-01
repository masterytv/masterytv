# Relatti — Privacy, Terms & Liability Plan

> **Date:** 2026-07-01
> **NOT LEGAL ADVICE.** This is an engineering/product assessment to scope the attorneys and clinician you engage. Relatti processes DV, child-safety, mental-health, grief, and third-party data — get a qualified privacy/health-tech attorney and an AI-therapy-law specialist before public launch.
> **Evidence:** relatti21 coaching conversation `85950a7f-aaa2-4a02-a316-251e6d5f20ec` ("I don't know how to start here", 78 messages, 2026-07-01).

---

## 1. What this one conversation contained (why the stakes are this high)

A single reluctant-husband session escalated, over 78 messages, into:
- A **domestic-violence disclosure** (wife hits/"swings at" him — n67).
- A **child-endangerment disclosure**: "she raises her hands to strike them, but never follows through" (n71) — plus kids with bruises (n69).
- **Grief/loss** underneath (a "devastating" event ~6 months ago — the miscarriage from the partner's parallel thread; the coach correctly did not cross-reference it).
- **Third-party allegations** about a non-consenting person: wife is "not stable," "psychopathic," could "hurt someone" (n57–n59).
- And it ended with the user **explicitly asking whether his disclosures are private** — from his wife, from the company, and from the AI model provider (n75, n77).

The coaching quality was genuinely high. The danger is everything *around* the coaching: what we now store, what we promised, and what we're obligated to do.

---

## 2. Clinical assessment (therapist lens)

**Strong:**
- Excellent EFT-style reframe — named his anger as grief, surfaced the pursue/withdraw cycle, located the problem in the distance between them, not in "fixing" the wife (n40–n48). Graceful de-escalation when he got angry (n56).
- **Good safety instincts:** caught the wife→husband DV, stopped coaching, gave the DV hotline + text line, named CPS and a family lawyer as options, and asked the single most important question — "Are your kids safe right now, today?" (n68, n72).

**Concerning:**
1. **A child-endangerment disclosure was handled by an unlicensed AI with no human in the loop.** Routing to the hotline is reasonable for a non-clinician, but the product has **no path** for a child-safety disclosure to reach a human who can act or document. A human therapist here would be a **mandated reporter** in most US states.
2. **The coach made confident procedural/legal claims** about what the hotline/CPS/police do ("It's not a call to CPS or the police," "No one finds out," "Nothing gets set in motion" — n74). Reassuring, but it's an AI making guarantees about others' legal processes in a child-safety context.
3. **The confidentiality reassurances** (n76, n78) — see §3.1. This is the biggest problem, and it's ours, not the model's.

---

## 3. Liability assessment (lawyer lens), ranked

### 3.1 🔴 #1 — The coach promises confidentiality the system does not keep
At n76 the coach said: *"I don't report to anyone, I don't contact your wife, I don't share what you tell me with her or anyone else. You're safe to talk here."* And n78 reassured his wife can't see it.

This is a **material misrepresentation** in a safety-critical moment the user is relying on to disclose DV/child-safety. In reality:
- Conversation content is sent to a **third-party LLM provider** (OpenAI/Anthropic) for processing.
- It is **stored** by the company and is **readable by admins** (the crisis queue, admin-data, DB access).
- **The safety system now emails his disclosures to the founder.** The Tier-2 sweep (and, once wired, Tier-1) escalate high-severity flags to `tom@relatti.com`. So *"I don't report to anyone"* is now **literally false** — our own (correct) safety feature contradicts the coach's promise.
- Couples features share data across partners; coaching *messages* are user-scoped (verified), but the coach's blanket *"safe here / I don't share with anyone"* over-promises.

Exposure: FTC Act §5 / state UDAP (deceptive practice), negligent misrepresentation, and — if a disclosure later surfaces (breach, subpoena, partner access) after this promise — reliance damages. **This must be fixed before launch** (see §4).

### 3.2 🔴 #2 — Child-safety disclosure with no escalation protocol
We now hold records suggesting a parent raises hands to strike children. There is (generally) **no mandatory-reporting duty for an unlicensed AI coaching product** — but: (a) it attaches the instant a licensed human joins the workflow; (b) the moral/reputational/negligence exposure if those kids are later harmed and it emerges we had this transcript and no protocol is severe; (c) marketing that implies clinical care can change the legal posture. **Need a documented child-safety + DV protocol** (what we detect, who reviews, what we do/don't do, what we tell the user).

### 3.3 🟠 #3 — Third-party (non-user) data
The husband's disclosures create a sensitive dossier on **people who never consented** — his wife (alleged "psychopathic," a DV perpetrator) and his **children**. Issues: GDPR/CCPA processing of third-party data; **defamation** risk on the "psychopathic"/abuse allegations if ever surfaced or leaked; and a **catastrophic, dangerous** outcome if couples data-sharing or a bug ever exposed this to the wife. Need an explicit third-party-data stance + airtight partner isolation.

### 3.4 🟠 #4 — Discovery / subpoena in divorce & custody
These transcripts are **gold in a custody fight** — his DV disclosure, his admitted yelling/anger, her grief and (in the parallel thread) her despair. Relatti will be subpoenaed. Without a retention limit + a subpoena/law-enforcement policy + minimization, we become a weaponizable evidence store for the exact relationships we're trying to help.

### 3.5 🟠 #5 — AI-therapy-law exposure (IL WOPR, NV AB406, UT, others — 2025)
A 78-message DV/mental-health/crisis session looks a great deal like therapy/crisis counseling. The coach disclaimed ("I'm an AI coach") — good — but the scope drift is real. Need enforced scope limits, standing disclaimers, and copy reviewed against each state's AI-therapy statute.

### 3.6 🟡 #6 — Unauthorized practice / advice in licensed domains
Definitive statements about CPS/police/hotline procedure (n74) edge toward legal advice. Mostly it redirected; keep it to "a family lawyer / the hotline can walk you through that."

### 3.7 🟡 #7 — Duty-to-warn optics (third-party harm)
A disclosure of possible harm to the children. No Tarasoff duty for an unlicensed AI — but if inaction is followed by harm, "they had the transcript and did nothing" is a devastating narrative. The protocol in §3.2 addresses this.

### 3.8 🟡 #8 — Minors' data
Children are discussed; if any user is under 18 or minor data is meaningfully processed, COPPA and heightened obligations apply. Confirm the age gate + stance.

---

## 4. The urgent product fix (do this regardless of the legal docs)

**The coach must never promise confidentiality the system can't keep.** Rewrite the identity/safety layer so that, when asked (as here), it is honest and specific:
- ✅ *"Your conversations are private from your partner — they can't see what you tell me."* (true; keep it guaranteed in code)
- ✅ *"I'm an AI. Your messages are processed and stored securely by the company that runs Relatti, and a small team may review safety concerns like the ones you've raised."* (true — matches the escalation)
- ✅ *"For exactly what's kept and how, here's the privacy policy: [link]."*
- ❌ Never *"I don't report to anyone,"* *"I don't share what you tell me with anyone,"* or *"you're safe to talk here"* as an unqualified guarantee.

This is a persona/guardrail change (`prompt-assembler.ts` relationship guardrails + safety layer) plus a just-in-time privacy notice. It's the single highest-leverage fix and it's a launch blocker. Add a coach-lab scenario that asserts the coach never makes an absolute confidentiality promise.

---

## 5. Documents to build (the "rock-solid" set)

| Doc | Purpose / must-nail |
|---|---|
| **Privacy Policy** | What's collected (incl. sensitive + third-party data), why, who processes it (subprocessors), retention, deletion, user rights, safety review/escalation, LLM-provider handling, breach notice. |
| **Terms of Service** | License, acceptable use, **not therapy / not legal advice / not a crisis service**, disclaimers of warranty, limitation of liability, indemnity, dispute resolution (arbitration + class waiver), governing law, age gate. |
| **AI & Coaching Disclaimer** | Standing, prominent: AI, not a human; coaching/education, not therapy/diagnosis/treatment or legal advice; in an emergency call 911/988/DV hotline. (Already partly in the footer — formalize + gate acceptance.) |
| **Safety & Escalation Policy** | What we detect (self-harm, abuse, **child safety**), who reviews, response times, what we do and explicitly do NOT do (we are not a crisis service; no promised human follow-up unless built), and the child-safety pathway. |
| **Data Retention & Deletion** | Retention windows, user-initiated deletion (a `delete-user-data` function already exists — verify coverage incl. `messages`, `memory_facts`, `crisis_flags`), what safety records survive deletion and why. |
| **Couples Data-Sharing & Consent model** | Granular: coaching content is private per-person; only consented assessment data crosses to a partner or their coach; how consent is captured, shown, and revoked. |
| **Subpoena / Law-Enforcement Response** | How we handle legal process, user notice where lawful, data minimization to limit what's producible. |
| **DPA + subprocessor list** | OpenAI, Anthropic, Supabase, Resend, Vercel — each with a signed DPA; **LLM zero-retention / no-training** confirmed (see §6). |

---

## 6. Engineering to make the promises TRUE (privacy-by-design)

1. **LLM provider data handling — the thing the user literally asked (n77).** Confirm and configure: OpenAI API (**zero-data-retention** eligibility; default no-training) and Anthropic API (default no-training; confirm retention). Get it in writing (DPA). Then the privacy policy can honestly say "not used to train third-party models."
2. **Partner isolation guarantee + a regression test.** Coaching messages/memory are `user_id`-scoped today (verified) — add an automated test so it can never regress, because §3.3 makes a leak catastrophic (he called her psychopathic; she disclosed a miscarriage).
3. **Admin-access controls + audit logging** — log who reads `crisis_flags`/messages; least-privilege.
4. **Encryption** at rest + in transit (Supabase provides at-rest; consider app-level encryption for message content given the sensitivity).
5. **Deletion tooling** — verify `delete-user-data` covers every table holding content; decide what safety records are retained and disclose it.
6. **A real human review path for child-safety / high-severity flags** — even if minimal: founder reviews within a defined window, documented, with a decision log. Ties to the clinician-review launch blocker.
7. **The coach-script fix** (§4) + the confidentiality scenario in the test harness.

---

## 7. Who to engage + sequencing (this is a launch blocker)

- **Privacy / health-tech attorney** (multi-state, AI-aware) — drafts ToS, Privacy Policy, DPA; advises on sensitive + third-party data.
- **AI-therapy-law specialist** — scope + disclaimers vs. IL WOPR / NV AB406 / UT and the moving 2025 landscape. (May be the same firm.)
- **Licensed couples/crisis clinician** (already an open launch blocker) — the safety + child-safety escalation protocol and the coach's safety scripts.

**Sequence:**
1. **Now:** the coach-script fix (§4) + confirm LLM zero-retention/no-train (§6.1) + the partner-isolation test.
2. **Pre-launch:** draft the §5 docs; stand up the acceptance gate; build the child-safety/DV protocol.
3. **Pre-launch review:** attorney + clinician sign-off.
4. **Publish** Privacy + Terms + Disclaimer, gate signup on acceptance, then launch.

Do **not** open Relatti to the public (beyond the current Vercel-protected beta) until at least §4, §6.1–6.2, and published Privacy + Terms exist.
