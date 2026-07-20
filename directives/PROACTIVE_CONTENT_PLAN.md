# Proactive Content Plan — pack-voiced session writing

> **Status:** PLAN (founder-commissioned 2026-07-20, after the mis-branded weekly-session incident). Sender identity is FIXED (`818bc2a`); this plan covers the **content** half: what the weekly sessions, progress reviews, and check-ins actually say.
> **Owner of decisions:** founder (§8). **Prereq reading:** `_shared/packs/types.ts` (`PackBriefing` — the solved template this plan generalizes), COACH_ARCHITECTURE_AUDIT.md (the Coach Pack thesis), RELATTI_EXPERIENCE.md §5 (voice + privacy invariants).

---

## 1. The problem, in this morning's own words

All six 2026-07-20 weekly sessions were authored by ONE vertical-blind planner prompt (gpt-4o, `cron-session-planner`). Verbatim openers:

| User (vertical) | Opener | What's wrong |
|---|---|---|
| Tom (executive) | "how might your perception of feedback change if you viewed it as a stepping stone to…" | Horoscope register; "reframe X as Y" template; nothing only *his* coach could say |
| tester1 (Relatti) | "thinking about your journey, a question comes to mind: How can you find a way to honor your values while also addressing your immediate financial needs?" | Executive/self-help framing for a *relationship* client; "journey" filler |
| tester2 (Relatti) | "What's the one thing you wish you could say to tester1 right before they walk away during a conflict?" | **Privacy breach**: quotes a specific disclosed conflict pattern in plaintext email — violates the 92d221d low-disclosure invariant the relationship briefing enforces |
| money2 (Money) | "How can you transform your mission-driven vision into concrete, actionable steps this week?" | LinkedIn-motivational; zero Money Maps vocabulary (no Maps, no archetype, no Fear) |
| joann (Money) | "what would it mean for you to step boldly into your financial potential without hesitation?" | "Step boldly into your potential" — the exact register MONEY_EXPERIENCE bans (manifestation-adjacent) |

Diagnosis, ranked:

1. **Wrong author.** One generic "coaching strategist" prompt writes for every vertical. The packs already own briefing content (`PackBriefing`); sessions and reviews bypass the pack entirely.
2. **Privacy invariant not enforced.** The planner is *told* to "reference specific names, dates, and commitments" — correct for executive, a breach for relationship email (tester2's email is the live proof).
3. **Register.** Even for the executive vertical the writing is horoscope-flavored: rhetorical reframes, "journey", three stacked questions, no concrete stakes. A coach who *remembered* would name one thing and push on it.
4. **Wrong engine.** Sessions are authored by gpt-4o while every coach voice in the product is Claude-tuned pack persona — the Monday email doesn't sound like the coach they talk to on Tuesday.
5. **No pack gate.** Money receives weekly sessions even though `moneyPack.briefing.enabled=false` was the deliberate "money sends nothing proactive yet" decision — sessions never consulted it.

## 2. Target architecture: `PackSession` (mirror of `PackBriefing`)

The cron stays vertical-blind: **load context → resolve pack → compose → stamp → queue.** All voice, disclosure, and enablement move into the pack — same seam as briefings, so adding a vertical without declaring its session behavior is a compile error.

Extend `CoachPack` in `_shared/packs/types.ts`:

```ts
export interface SessionContext {
  userName: string;
  partnerName: string | null;            // dyad-derived, relationship only
  challenges: ActiveChallenge[];         // executive-shaped, empty for relatti
  commitments: Commitment[];             // status + due dates
  entities: WeekEntities;                // wins / stalled goals / patterns / people
  weekSummaries: string[];               // conversation-summarizer output, NOT raw messages
  lastAgenda: CoachingAgenda | null;
  moneyMap: StoredMoneyMap | null;       // money only — archetype/Maps/Fear vocabulary
}

export interface PackSession {
  /** Does this vertical send weekly session email at all? */
  enabled: boolean;
  /** System prompt for the session author — the pack persona's email voice. */
  system: string;
  /** Compose the generation prompt from context. Pack decides what renders. */
  buildPrompt(ctx: SessionContext): string;
  /** Pack-authored subject. Lock-screen-visible → same disclosure rules as body. */
  subject(ctx: SessionContext): string;
  /** Deterministic fallback when the model returns nothing usable. */
  fallback(ctx: SessionContext): string;
}
```

`cron-session-planner` keeps its REVIEW/ASSESS steps (agenda bookkeeping is shared) but the **session_message authoring moves into `pack.session`**. `cron-arc-strategist` gets the same treatment later (`PackSession` reused with a `cadence: "weekly" | "monthly"` param, or a sibling `review` block — decide at implementation, prefer reuse).

Two structural changes ride along:

- **Raw messages out, summaries in.** The planner currently pastes the last 30 raw messages into the prompt. Feed `conversation_summaries` (the summarizer already runs nightly) instead — cheaper, less leak surface, and the pack chooses how much of even that to use (relationship: none verbatim).
- **Author on Claude.** Use `callClaudeJson()` (`_shared/anthropic.ts` — tool-forced JSON; the assistant-prefill trick is dead on current models, see 2026-07-16 session log) with the existing OpenAI path demoted to fallback, mirroring the coach/briefing engine order. Model per pack config; cost logged per model as reports do.

## 3. Per-vertical content contracts

**Executive (`generalPack`).** High-disclosure is correct — this is the vertical where "you said you'd ship the pricing page by Friday — did you?" is the product. Rules: open with ONE earned question anchored to a named commitment/pattern/win from the week (name + date + stake); celebrate at most one win in one sentence; confront a 3+-occurrence pattern plainly; 120–180 words; end with the question restated as the ask, not three alternates.

**Relationship (`relationshipPack`).** LOW-DISCLOSURE, same invariant as its briefing: the email may know *that* there's momentum, never *what* was said. Shape: a warm two-paragraph invitation that names a **theme at category level only** ("the conversation you two keep circling") and pulls them **into the product** for the substance — "I have a thought about it — open Relatti when you have ten minutes." Subject = greeting only. The session's real content happens in-app where it's authenticated; the email is the doorbell. This retires the tester2 class of breach *by construction*, not by prompt-pleading.

**Money (`moneyPack`).** Speaks Money Maps or stays silent: anchor in the user's stored archetype/dominant Map/Fear band ("Fortress Builder", "GUARD running hot", "the Fear tilted toward success") + one live decision if the Decision Room has an open record; never generic hustle language ("bold", "potential", "vision→action"); never financial advice (the §guardrail applies to proactive too); CTA lands in the Decision Room. **Enablement is a founder call (§8)** — shipping `session.enabled=false` for money until the voice is approved is the honest default, since money proactive (T4) was never consciously turned on.

**Shared craft bar (all packs, encoded in each system prompt):** no "journey/unlock/step into/empower"; no rhetorical-reframe questions ("how might X change if Y"); one question per email, max; every claim traceable to context the pack chose to expose; sound like the same coach they chat with — same person, writing a short note, not a newsletter.

## 4. Subjects

`getSubjectForType()`'s static "Your Weekly Coaching Session" becomes the fallback only; `pack.session.subject(ctx)` owns the line. Executive may carry the hook ("The pricing-page question"); relationship stays generic (lock screens); money may carry archetype language only ("A Fortress Builder question").

## 5. Verification (the gate, before any vertical goes live)

1. **Prompt snapshots.** Extend the `snapshot:prompts` golden pattern: fixture `SessionContext` per pack → `buildPrompt` output pinned as goldens. Byte-drift = intentional or fail. (The edge tree isn't tsc'd — snapshots are the only net; same lesson as money-pack.)
2. **Disclosure lint on relationship output.** A deterministic post-generation check for the relationship pack: reject and use `fallback()` if the generated email contains partner name + conflict/feeling vocabulary or any ≥6-word span matching recent summaries. Cheap, dumb, effective backstop.
3. **Founder sample review.** Before enabling each pack: generate sessions for the real current users of that vertical into a review file (NOT sent), founder reads, thumbs up per pack. This is the writing-quality gate no test can give.
4. **Live checklist per vertical:** correct sender (already fixed) + correct chrome + reply threads into the right pack (`metadata.program` stamp, already live) + nagging strikes recorded.

## 6. What does NOT change

Scheduling/cadence (Sunday 18:00 UTC planner, Monday 09:00 UTC delivery, `0 12 1 * *` reviews), the opt-in gate (`morning_briefing_time IS NOT NULL`), nagging/strike mechanics, agenda bookkeeping (`coaching_agenda` rows), the delivery seam (`cron-process-scheduled` + `channel-delivery`), and the identity/chrome layer shipped in `818bc2a`.

## 7. Rollout

| Phase | Scope | Deadline logic |
|---|---|---|
| **P0 — stop the relatti leak** | Smallest possible change to `cron-session-planner`: for relationship-program users, replace the LLM `session_message` with the pack-voiced low-disclosure invitation template (deterministic string, no model call). Executive/money content untouched. | **Before Sunday 2026-07-26 18:00 UTC** — the next planner run. Otherwise tester1/tester2/david get another leaky/off-voice email Monday the 27th. ~half a day incl. deploy. |
| **P1 — `PackSession` seam** | Types + executive & relationship implementations + Claude authoring + snapshots + disclosure lint. Planner becomes vertical-blind. | Next build session after P0. ~1–2 days. |
| **P2 — money voice** | `moneyPack.session` written against §3; founder sample review; enable (or consciously keep off) with the T4 `briefing.enabled` decision. | With/after the T4 proactive decision. |
| **P3 — progress reviews + check-ins** | `cron-arc-strategist` onto the same seam (before Aug 1 12:00 UTC = next monthly run, else its reviews stay generic-but-correctly-branded); accountability check-in copy pass (already conversation-anchored — lightest touch). | Before 2026-08-01 for reviews. |

## 8. Open founder decisions

1. **P0 shape for relatti:** low-disclosure invitation template (recommended) vs. skip relatti weekly sessions entirely until P1?
2. **Money proactive:** enable money weekly sessions at P2, or keep money fully quiet (sessions + briefings) until after public launch? (Today money users DO receive sessions — that was never consciously decided.)
3. **Executive disclosure ceiling:** commitments/goals in email are the product today — confirm that stands (vs. a softer "theme + pull into app" for everyone).
4. **Subjects carrying content** for executive/money (§4) — yes/no.

---

*Origin: 2026-07-20 mis-brand incident (see logs/session_2026-07-20.md). Identity fix `818bc2a` is deployed + live-verified; this plan is the content follow-through. When implementation starts: update this doc's Status line, and keep storage keys / cron schedules untouched per §6.*
