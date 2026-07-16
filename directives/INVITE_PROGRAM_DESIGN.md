# PC2.1h — The invite belongs to a program

> **Status:** ✅ BUILT 2026-07-16 — the FULL design (§6.1–§6.5 including §6.4's read sites), not just the §0 guard. Founder decision same day: *"fix everything before we continue any more testing or users"* — the §0 scoping's premise (spend the time on outreach instead) was explicitly overridden.
> **Build notes:** (1) The index swap shipped in TWO PHASES: phase A (`20260716170010`) adds column + backfill + the per-program unique index but KEEPS the old `(inviter_id, recipient_email)` constraint — old prod code's `onConflict` still targets it during the deploy window; phase B (`20260716200000`, apply only after the app code is live) drops it, repairs any window rows, and adds the invariant-4 guard to `relatti_sync_invite` (a non-relationship invite never touches the spine — without it the fn hardcodes the relationship program id for ANY invite). (2) §6.4 missed an EIGHTH site: `sync-my-report.ts` — PC2.1g verifies the *report* is relationship-program, but its invite-pointer writes and pending→completed promotion filtered by `user_id` alone, so a relationship report would stamp the user's GENERAL broadcast invite (§2 via a second door). Now `.eq("program", "relationship")`. (3) invite-notify's brand now derives from the invite's own program via `brandForProgram()` (registry-derived, no ternary) instead of the inviter's `signup_brand` — Tom is stamped masterytv, which would have mis-branded his relationship-invite notifications.
> **Parent:** [ASSESSMENT_PROGRAM_SCOPING.md](ASSESSMENT_PROGRAM_SCOPING.md) §6.1 (a–g shipped 2026-07-16, `e4210eb`).
> **Written:** 2026-07-16, founder: *"Design the invite for Relatti."*
> **Reprioritised while writing this:** I previously called PC2.1h's live risk "low — Tom has 0 invites." **That was wrong.** He has a broadcast invite carrying his *general* report, and the flow he's about to run corrupts it. See §2.
> **Then RIGHT-SIZED (same day, after the founder asked whether to patch or fix the architecture):** the correction above over-swung. **Build §6.1+§6.2 only — the ~30-minute guard. Skip §6.4's read sites.** See §0.

---

## 0. Scope: build the guard, not the design

Two corrections in one day, so here's the calibrated version:

**The bug is real but its blast radius is one person.** It only misfires for a **dual-brand user**, and that set is `{tom@masterytv.com}`. The three stalled beta testers are single-brand relationship users — **entirely unaffected**. The actual consequence is: *Tom's own Decoded broadcast link — never claimed by anyone — silently starts pointing at a Relatti invite.* If nobody holds that URL, it's a non-event.

**So build the 20% that is load-bearing:**

| Build now (~30 min) | Skip for now |
|---|---|
| **§6.1** the `program` column | **§6.4** the seven read sites — all `{tom}`-only today |
| **§6.2** the unique constraint → `(inviter_id, recipient_email, program)` + `getOrCreateBroadcastInviteUrl` takes `program` | |
| **§6.3** the backfill (needed by §6.2) | |

That stops the corruption before Tom takes the Relatti battery, and it's the foundation §6.4 sits on later. The read sites can land when a second dual-brand cohort exists — i.e. **with the career vertical**, alongside T1–T2 ([TENANCY_AUDIT.md](TENANCY_AUDIT.md) §0).

**Why not the whole design now:** the bottleneck is signup→assessment ~3/5 and **assessment→partner-invite 0/3**. Every hour here is an hour not spent on brand 1's dyad ask. §6.4 is correctness for a cohort that doesn't exist yet.

---

## 1. The question

An invite is the dyad's front door. Which **program** does one belong to — and how do we know?

Today: nothing knows. `decoded_invites` has no program, and it serves **both** brands (Relatti's partner invite *and* Decoded's compatibility share — `CompatibilityHubDecoded`). Every read takes "the inviter's latest report", so a dual-brand user's invite carries whichever program they touched last.

## 2. 🔴 This is live, not theoretical — it breaks the moment Tom takes the Relatti battery

`getOrCreateBroadcastInviteUrl` (`src/lib/relatti/broadcast-invite.ts:30`) upserts:

```ts
{ inviter_id, recipient_email: "broadcast", inviter_report_id: reportId, … }
{ onConflict: "inviter_id,recipient_email" }
```

backed by `decoded_invites_inviter_id_recipient_email_key UNIQUE (inviter_id, recipient_email)` — **exactly one broadcast row per user, across all brands.**

`tom@masterytv.com` already owns one (`b348a6b9`, `inviter_report_id` → his **general** report). PC2.1d now correctly hands the Relatti dashboard his **relationship** `reportId`. So the next relatti.com dashboard load **UPDATEs his Decoded share link in place**, repointing it at the relationship report.

Consequences, all silent:
- His one link **flips program by whichever dashboard he loaded last.**
- Anyone holding his old Decoded link now lands on a **Relatti** invite.
- The `/invite/[code]` landing renders the inviter's archetype from `inviter_report_id` — so the link's *identity* changes under its recipients.

**PC2.1a–g made this reachable** (before them he could never have a second program). It is now the first thing his own next action triggers.

## 3. Evidence (production, 2026-07-16)

| Fact | Value | Consequence |
|---|---|---|
| Invites total | **8** | |
| **Broadcast** (`recipient_email='broadcast'`) | **7 of 8** | The copy-link *is* the invite path; per-recipient email invites are the exception |
| With `engagement_id` | **1 of 8** | ⛔ the spine cannot supply program |
| `program` rows in the spine | **1** — `relationship` only | ⛔ **no `general` program exists** to point a Decoded invite at |
| `RELATTI_DYAD_ENGINE` | default **off** | the spine isn't authoritative yet |
| Invites whose inviter has a report | 6 of 8 (1 general, 5 relationship) | backfill signal #1 |
| Inviters with `signup_brand` | 3 of 8 | backfill signal #2 |

## 4. Decision: stamp `decoded_invites.program`. Do NOT derive it from the spine.

The architecturally "pure" answer is `decoded_invites.engagement_id → engagement.program_id → program.slug`; ORIENT's rule even says *attach to an engagement, not a user*. **Reject it, for now**, on three independent grounds:

1. **A broadcast invite has no engagement, by definition.** It's created *before* a recipient exists; the engagement only forms on claim. 7 of 8 invites are broadcast. The join is null exactly when we need the answer.
2. **There is no `general` program row.** Decoded invites would have nothing to reference. Creating one is a bigger change than it looks — `program` is the spine's selector for battery/persona/funnel, and inventing an executive program row implies the executive product runs on the spine, which it doesn't.
3. **Precedent, three times over.** `conversations.program` (2026-07-15), `assessments.program`, `assessment_reports.program` (both today) are all stamped columns with a single writer. A fourth shape here would be the odd one out.

> **When the spine becomes authoritative** (RELATTI_DYAD_ENGINE on, engagements backfilled, a general program row exists), `decoded_invites.program` becomes a denormalized cache of `engagement.program_id` — verifiable with a one-line assertion, not a rewrite. Stamping now doesn't foreclose that; it's the same move `assessment_reports.program` makes against `assessments.program`.

## 5. What defines an invite's program?

> **The brand the inviter was on when they created it.** Not the inviter's signup brand, not their latest report — the surface they clicked "invite" on.

That's the definition that matches the user's mental model ("my Relatti link" vs "my Decoded link") and it's knowable at creation from the resolved brand, which every route already has via `getBrandFromRequest()` / `getBrand()`.

**Corollary — a user may hold one broadcast invite PER PROGRAM.** That's the unique-constraint change in §6.2 and the actual fix for §2.

## 6. Design

### 6.1 Column

```sql
ALTER TABLE decoded_invites ADD COLUMN program text;   -- bare text, no CHECK (mirrors the other three)
-- backfill: §6.3
ALTER TABLE decoded_invites ALTER COLUMN program SET NOT NULL;
ALTER TABLE decoded_invites ALTER COLUMN program SET DEFAULT 'general';
```

### 6.2 🔴 The unique constraint — the fix for §2

```sql
DROP   INDEX decoded_invites_inviter_id_recipient_email_key;      -- (inviter_id, recipient_email)
CREATE UNIQUE INDEX decoded_invites_inviter_recipient_program_key
  ON decoded_invites (inviter_id, recipient_email, program);
```
…and `getOrCreateBroadcastInviteUrl` upserts `onConflict: "inviter_id,recipient_email,program"`, taking `program` as a parameter.

Then Tom holds **two** broadcast links — a stable Decoded one and a stable Relatti one — and neither clobbers the other. **This must ship in the same PR as the column**; a stamped column with the old constraint still lets the upsert cross programs.

> ⚠️ **Ordering:** drop-then-create is not atomic. Do it inside the migration's transaction, and verify no `(inviter_id, recipient_email, program)` duplicate exists *before* the create (§6.3 guarantees this: the backfill assigns exactly one program per existing row, and today no user has two broadcast rows).

### 6.3 Backfill

Priority order, most authoritative first:

```sql
UPDATE decoded_invites i SET program = COALESCE(
  -- 1. the report the invite actually carries — the strongest evidence
  (SELECT r.program FROM assessment_reports r WHERE r.id = i.inviter_report_id),
  (SELECT r.program FROM assessment_reports r WHERE r.id = i.recipient_report_id),
  -- 2. the inviter's signup brand
  (SELECT CASE WHEN u.signup_brand = 'relatti' THEN 'relationship'
               WHEN u.signup_brand IS NOT NULL THEN 'general' END
     FROM users u WHERE u.id = i.inviter_id),
  -- 3. incumbent
  'general'
) WHERE i.program IS NULL;
```

Expected: 6 rows from signal 1 (1 general — Tom's broadcast; 5 relationship), 0 additional from signal 2, **2 fall through to `'general'`** (`relatti@joannsview.com`, `u.yika…@gmail.com` — both broadcast, both pending, neither has a report *or* a signup_brand).

**Those two are probably Relatti users** (Jo Ann is a beta signup; the u.yika bot-lookalike derives relatti). Mislabelling them is **deliberate and self-healing**: both rows are inert (broadcast + pending + no report), and once §6.2 makes broadcasts per-program, either user's next relatti.com dashboard load simply *creates* their correct `relationship` broadcast. The stale `general` row is never surfaced on relatti.com. Guessing `relationship` to save two inert rows would mean defaulting *away* from the incumbent — the opposite of every other backfill here, and wrong for any future Decoded sharer.

### 6.4 Reads to scope (the rest of PC2.1h)

All currently "the user's **latest** report, any program":

| Site | Today | Scope by |
|:--|:--|:--|
| `broadcast-invite.ts:30` | one row per user | **§6.2 — the load-bearing one** |
| `api/decoded/invite/route.ts:50` | inviter's latest report | route's brand |
| `api/decoded/invite/route.ts:93` | recipient's latest report | route's brand |
| `api/decoded/invite-consent/route.ts:173` | user's latest → `recipient_report_id` | the **invite's** program (not the request's — consent may be actioned from anywhere) |
| `api/decoded/invite-notify/route.ts:73` | recipient's archetype | the invite's program |
| `invite/[code]/page.tsx:98` | "has a report → redirect /dashboard" | the invite's program — **today a Decoded-report holder opening a Relatti invite is bounced to /dashboard and can never take the relationship battery**; this is §2's twin in the *recipient's* direction |
| `claim-invites.ts:62,133` | "do they have a report yet" | the invite's program |

**The rule that falls out:** a route acting on a **specific invite** takes the program **from that invite** (it's stamped — the answer is on the row). Only invite *creation* takes it from the request's brand. That removes the plumbing problem I flagged in ASSESSMENT_PROGRAM_SCOPING §6.1 — most of these don't need brand context at all once the column exists.

### 6.5 Invariants

1. An invite's program is **immutable** after creation. A dyad doesn't change vertical; if it must, that's a new invite.
2. A user holds **at most one broadcast invite per program**.
3. Inviter and recipient reports on an invite are **both** of the invite's program. (`sync-my-report` already refuses to stamp a non-relationship report onto the spine — PC2.1g; this is the same guard, one level out.)
4. `decoded_invites.program` and `engagement.program_id` must agree wherever both exist. Assert it in the migration and in `relatti_sync_invite`.

## 7. Verification

- **Baseline:** record all 8 rows + their signals before the migration; assert the backfill matches §6.3's prediction exactly (6/0/2).
- **Constraint:** prove the old index is gone and the new one exists; attempt a duplicate `(inviter, 'broadcast', 'relationship')` insert in a rolled-back transaction — must fail.
- **The §2 acceptance test:** as `tom@masterytv.com` — load masterytv.com/dashboard, record the broadcast invite id + its `inviter_report_id`; load relatti.com/dashboard; **assert the Decoded row is untouched and a SECOND, relationship row now exists** with a different id.
- **Recipient direction:** a user holding only a *general* report opens a `relationship` invite → must reach `/assess` (the relationship battery), not be redirected to `/dashboard`.
- **Regression:** the existing tester1↔tester2 dyad (the only consented invite, `2a1833db`) still resolves: compat report renders, the S5 pointer resolves, the dyad coach still knows both.
- Gate green; executive prompt byte-identical.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Dropping the unique index on a live table | Same transaction as the create; §6.3 guarantees no duplicates first; the table is 8 rows |
| A stale link a recipient already holds changes meaning | Already true today (§2) and *worse* — this fixes it. Existing ids keep their program; Tom's Decoded link stays Decoded |
| The 2 unclassifiable rows | Inert + self-healing (§6.3) |
| Backfill disagrees with the spine's 1 engagement | Invariant 4 asserts it in-migration; that row is `relationship` on both sides today |

## 9. Not in scope

- Creating a `general` **program** row / putting the executive product on the spine (§4.2). Separate, larger, and not needed for this.
- Retiring Decoded's compatibility hub. It's dormant but live, and this design keeps it working rather than assuming it away.
- `decoded_invites.workspace_id` (the ORIENT rule for new tables). Worth doing when white-label lands; adding it now buys nothing and widens this diff.
