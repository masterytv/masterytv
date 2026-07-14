# Relatti — Safety & Escalation Protocol (internal engineering/ops)

> **Status:** LIVE as of 2026-07-01 (E15.4). Internal SOP — the *user-facing* Safety & Escalation Policy (plain-language, attorney-reviewed) is a separate doc in the E15.5 set.
> **NOT clinical or legal advice.** This protocol must be reviewed by the licensed couples/crisis clinician (E15.6) before public launch. It describes what the system does *today*.
> **Source:** `directives/PRIVACY_TERMS_LIABILITY_PLAN.md` §3.2/§4/§6; `COACH_SAFETY_AND_TESTING_SPEC.md`.

---

## 1. What we detect

Two tiers, both kernel-level (every program/vertical), running on every coach message.

| Tier | When | How | Blind spots (by design) |
|---|---|---|---|
| **Tier 1 — synchronous keyword hard-stop** | Before the model replies | Pure regex (`crisis-patterns.ts`), FIRST-PERSON + EXPLICIT, high-precision. Self-harm (high/moderate) + intimate-partner abuse/coercive control (high). Moderate self-harm + all abuse get an LLM context-check (`confirmCrisisWithLLM`/`confirmAbuseWithLLM`) to cut false positives. | Third-person ("my husband wants to die"), indirect/emotional-only cues, and **harm-to-others venting** ("I want to kill my husband, he's an asshole") — a keyword cannot tell hyperbole from intent, so it must not hard-stop → owned by Tier 2 + the coach. |
| **Tier 2 — async LLM sweep** | After the reply streams (`EdgeRuntime.waitUntil`, zero user latency) | Haiku classifier (`safety-sweep.ts`) over the recent window. Catches self-harm, abuse, **acute distress**, **harm-to-others** (the user's OWN genuine intent/threat to harm another person — the mirror of abuse, where the user is instead the victim), and **third-party risk including child safety** (`subject_scope: third_party`). | — |

**Categories:** `self_harm`, `harm_to_others`, `abuse`, `acute_distress`. **Subject scope:** `self`, `partner`, `third_party` (a child is `third_party`).

> **Harm-to-others: venting vs. intent.** "I want to kill my husband, he's such an asshole" is hyperbolic frustration, not a threat — Tier 1 deliberately does not fire (a keyword hard-stop here would insult a venting user and train them the product overreacts), and the Tier 2 classifier is instructed to return `none` for it. `harm_to_others` is flagged only on **genuine intent** — a stated plan, access to a means, or a credible present threat ("I've thought about how I'd do it and I don't think I'd stop myself"). That is the one case the old schema (self-harm + user-as-victim abuse only) had no home for.

## 2. What happens when something fires

1. **The user is always routed to real help in-product**, immediately:
   - Self-harm → 988 Suicide & Crisis Lifeline, Crisis Text Line (741741), 911.
   - Abuse/coercive control → National DV Hotline (1-800-799-7233 / text START to 88788 / thehotline.org), 911. The coach does **not** coach, both-sides, or mediate an unsafe relationship.
2. **A `crisis_flag` is logged** (`crisis_flags` table) for the admin crisis queue (`/admin/crisis`) with severity, category, subject_scope, source (`keyword` = Tier 1, `llm_sweep` = Tier 2), coach_handled, and a 200-char excerpt.
3. **High-severity self-harm, harm-to-others, or abuse emails a founder alert** to `tom@relatti.com`.
   - **E15.4 fixed the gap:** *both* tiers now escalate. Previously only Tier 2 emailed; a Tier-1 synchronous hard-stop (the most explicit, highest-signal case) logged a flag but sent no alert.
   - **Dedup:** one email per `(user, conversation, category)` per **12h** window, shared across both tiers, so a burst of crisis messages (or a Tier-1 hit followed by a Tier-2 hit on the same thread) does not flood the inbox. On a dedup-query failure we escalate anyway (a double alert beats a missed one).
   - **Moderate** self-harm and **acute_distress** (except high) are flagged but **not** emailed — matching Tier 2, to keep the alert channel high-signal.

## 3. Human-review path

- **Reviewer:** the founder (Tom) reviews the crisis queue and alert emails. **Target window: within 24h** of the alert (best-effort; see §4 — we do not promise the user a response time).
- **Decision log:** mark the flag `reviewed` in `/admin/crisis` with the action taken. This is the audit trail.
- **Child-safety / third-party (`subject_scope: third_party`, e.g. a parent striking a child — the relatti21 disclosure):** review with **elevated priority**. As an unlicensed AI coaching product there is (generally) **no mandated-reporting duty** — but the moral/reputational/negligence exposure is severe. Document the review and the reasoning. **Do not** contact authorities or third parties on the user's behalf from the product; if action is warranted, it is a human, out-of-band decision made with counsel. This pathway is the open item most needing clinician + attorney sign-off (E15.6).

## 4. What we explicitly DO NOT do (and the coach must never imply otherwise)

- We are **not a crisis service** and provide **no 24/7 monitoring** or emergency response.
- We make **no promise of human follow-up** to the user. The alert is an internal audit signal; it does not guarantee anyone contacts the user. (The alert email says exactly this.)
- We do **not** guarantee a review response time *to the user*.
- We do **not** notify the user's partner, family, employer, or authorities from within the product.
- The coach **never promises absolute confidentiality** (E15.1). It is honest: private *from the partner* (guaranteed in code), but processed/stored by the company, and **a small team may review conversations flagged for safety** — which is precisely this protocol. The escalation email is the mechanism that would otherwise make "I don't report to anyone" a lie.

## 5. Where it lives (code)

- `supabase/functions/_shared/crisis-patterns.ts` — Tier 1 pure detector (+ `scripts/coach-lab/safety-battery.mjs` regression net).
- `supabase/functions/_shared/crisis-detection.ts` — Tier 1 pipeline; logs the flag, computes `escalate` (high + dedup).
- `supabase/functions/_shared/safety-sweep.ts` — Tier 2 sweep + `sendSafetyEscalationEmail` (shared by both tiers).
- `supabase/functions/coach/index.ts` — web path (Tier-1 escalation via `waitUntil`).
- `supabase/functions/_shared/channel-router.ts` — email/Telegram parity (Tier-1 escalation awaited).
- Escalation recipient + dedup window: `ESCALATION_TO` (safety-sweep) / `ESCALATION_DEDUP_MS` (crisis-detection), 12h.

## 6. Partner isolation (E15.3) — verification record

Coaching content is private per person, even inside a shared dyad. Verified on **both** access paths (2026-07-01):

- **Coach edge path (service role — RLS BYPASSED):** isolation is enforced by every read filtering on the requesting user's `user_id`. Locked by an automated regression guard — `scripts/coach-lab/isolation-check.mjs`, gated in `test.mjs` (5/5 content reads user-scoped; negative-control confirmed it catches a dropped scope). Covers `prompt-assembler.ts` (messages / memory_facts / conversation_summaries) + the `match_memory_facts` / `match_messages` semantic RPCs (`match_user_id`).
- **Client path (RLS enforced):** live check of `pg_policy` confirmed RLS is enabled on `messages`, `memory_facts`, `conversation_summaries`, `conversations`, `crisis_flags`; each of the first four has a SELECT policy `auth.uid() = user_id` (conversations: owner-all); `crisis_flags` has no client read policy (default-deny — service-role/admin only).

Net: a partner (a different `auth.uid()` / `user_id`) cannot read the other's coaching messages, memory, or summaries via either path.

## 7. Open items before public launch (blockers)

- [ ] Licensed clinician review of detection thresholds, the coach's safety scripts, and the child-safety pathway (E15.6).
- [ ] Attorney review of the child-safety/DV stance and the user-facing Safety & Escalation Policy (E15.5/E15.6).
- [x] ~~admin-access **audit logging** on reads of `crisis_flags`/messages~~ **DONE 2026-07-01.** New `admin_audit_log` table (migration `20260701140000`, RLS default-deny, excluded from `delete-user-data` by design); the `admin-data` edge fn logs `read_crisis_flags` / `read_debug_trace` / `read_coach_profile` / `resolve_crisis` with admin id+email, target user/row, and detail. Deployed.
- [x] ~~`delete-user-data` out of date for Relatti~~ **DONE + DEPLOYED 2026-07-01 (v8).** Rewrote `supabase/functions/delete-user-data/index.ts` to cover all ~35 user-linked tables in FK-safe (leaf→root) order — **order verified against live data via a rolled-back `DO`-block probe on relatti21** (all deletes incl. `delete from users` ran with zero FK violations; nothing committed). **Founder deletion policy (2026-07-01):** on one partner's deletion we (1) **remove all compatibility data** (deletes the `decoded_invites` rows that hold the couples/compat reports — both sides), (2) **preserve the partner** — detach the leaving user (null `engagement.created_by`/`source_invite_id`, delete their `participant` row) but keep the shared engagement + the partner's conversations/assessments intact, and (3) **email the partner** ("your partner left, the shared compatibility data is gone, your conversations are preserved — keep chatting"). UI: the delete-confirm modal (`dashboard/settings`) shows a Relatti-gated warning that compat data is removed + the partner is notified. Recommended: a real end-to-end throwaway-couple deletion test before public launch.
- [ ] Documented reviewer SLA (internal target is 24h best-effort; not promised to users — see §3–§4).
  *(The isolation regression test — the other E15.3 item — is DONE, above.)*
- [x] ~~Confirm deployment parity: `email-inbound` and `telegram-webhook` also import `channel-router.ts` — redeploy them so those channels get the Tier-1 escalation + the `engagementId` fix.~~ **DONE 2026-07-01** — `email-inbound` v20, `telegram-webhook` v18 (both `verify_jwt: true` preserved). ⚠️ *Correction 2026-07-14: `verify_jwt: true` was itself a bug — it blocks Resend/Telegram at the gateway (no Authorization header), so inbound replies never worked. Both must deploy `--no-verify-jwt`; in-code HMAC is the auth (ARCHITECTURE.md §8.1). Fixed in email-inbound v27 / telegram-webhook v24.*
