# **Architecture — Relatti / The Polymorphic Coaching Spine** (Stage 1: Relationship)

> **Author:** Thomas Wood + Claude Code (Orchestrator)
> **Date:** June 16, 2026
> **Status:** ✅ APPROVED — BMAD Phase 2 (Architecture). **Gate 2 cleared June 16, 2026** (founder approved all 6 decisions D1–D6 + ADRs R01–R04). Nothing in this doc has been run against the database yet — execution is sequenced in [RELATIONSHIP_SPRINT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/RELATIONSHIP_SPRINT.md).
> **Parent:** [STRATEGY.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/STRATEGY.md) · [RELATIONSHIP_PRD.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/RELATIONSHIP_PRD.md)
> **Engine reference (still valid):** `ARCHITECTURE.md` (§2 stack, §3 schema, §5.2 coaching engine, §6 security), `COACHING_BRAIN.md`, `COACHING_GUARDRAILS.md`, `DECODED_SCHEMA.md`.
> **Scope rule:** Design the spine for all three stages **now** (so career + white-label become config later). **Build only the relationship dyad** in Stage 1. Career/white-label columns exist but stay defaulted/unused.

---

## 0. TL;DR for the founder

- The dyad is **already half-built**. `decoded_invites` links two consenting users + their reports, and the coach already has a **"Layer 4.6 — Shared Relationship Profiles"** block in [`prompt-assembler.ts`](supabase/functions/_shared/prompt-assembler.ts) that injects a partner's archetype + compatibility report when consent is granted. We are **promoting** this, not inventing it.
- We add **one polymorphic spine** of five tables — `workspace`, `program`, `engagement`, `participant`, `accountability_link` — plus a `entry_segment` funnel table. For Stage 1 every row is `workspace='masterytv'`, `program='relationship'`, `engagement.kind='relationship_dyad'`.
- **`workspace_id` goes on every new table from today.** It is a cheap column now (single default workspace) that saves a painful migration when white-label (Stage 3) turns multi-tenancy on.
- The existing per-user coaching data (`messages`, `memory_facts`, `commitments`, …) **stays per-user and private**. The dyad is a *container that links* two private coaching contexts and holds the **shared** artifacts (Blueprint, rituals, the stake). Privacy is preserved by design.
- The prompt-assembler changes from *"your coach happens to know about your partner"* → *"a coach that holds the engagement (both partners) and takes a mediator stance,"* keyed off `engagement` instead of fanning out from `userId`.

> **Decisions needing a 👍 at Gate 2:** (D1) keep `decoded_invites` as the invite/claim transport and *add* `engagement_id` to it rather than retiring it; (D2) per-user coaching data stays private — cross-partner context is assembled server-side under explicit consent, **not** exposed via broad RLS; (D3) `workspace_id` on every new table even though Stage 1 has one workspace.

---

## 1. What actually exists today (ground truth)

Inspected live via Supabase MCP against project **`masterytv-website`** (`lwmadssysqcwbsoiaokc`) — the Decoded + Mastery Coach engine. (Note: "Project Profound" `vnycavclrndjwmpaugju` is the *unrelated* NDE/UAP research DB — not our engine.)

### 1.1 The dyad seed — `decoded_invites` (12 rows)

The embryo of `engagement` + `participant`. Key columns:

| Column | Type | Role in dyad model |
|:--|:--|:--|
| `id` | uuid PK | → becomes the basis for an `engagement` |
| `inviter_id` | uuid → `users.id` | → `participant` role `self` |
| `recipient_email` | text | → `participant.invited_email` (pre-claim) |
| `recipient_id` | uuid, **nullable** → `users.id` | → `participant` role `partner` (filled on claim) |
| `status` | text: `pending`→`consented`→`connected` | invite/claim lifecycle (live data: 9 pending, 2 consented, 1 connected) |
| `inviter_report_id` / `recipient_report_id` | uuid → `assessment_reports.id` | each partner's Decoded report |
| `compatibility_report`, `_inviter`, `_recipient` | jsonb | the dyadic "Blueprint" payload (no DB view — it's denormalised JSONB) |
| `share_with_coach` | text: `none` \| `type_compatibility` \| `full` | **consent gate** the coach reads (live: 9 none, 3 full) |
| `share_with_human` | text: same scale | consent for partner-visible sharing |
| `consented_at` / `revoked_at` | timestamptz | consent audit trail |

RLS (already correct and reusable): inviter reads/updates own; recipient claims by matching JWT email (`recipient_id IS NULL AND lower(recipient_email)=lower(jwt.email)`), then reads/updates own; consent is a recipient-scoped update.

> **There is no `compatibility` SQL view.** Compatibility lives as JSONB on `decoded_invites` and is produced by the [`decoded-compatibility-report`](supabase/functions/decoded-compatibility-report) edge function. The "compatibility view" in the brief = these JSONB columns.

### 1.2 Assessment tables (the Decoded battery)

`assessments` → `assessment_scores` (134 rows) → `assessment_reports` (10) → `assessment_report_versions` (voice rewrites). Scores are keyed by `instrument_id`. **The live battery already spans all three roadmap stages:**

- **Relationship-native:** `ecr_r_short` (ECR-R attachment), `csi4` (Couples Satisfaction Index), `ders16` (emotion regulation).
- **Career-native:** `riasec` (Holland codes), `weims` (work motivation).
- **Cross-cutting:** `ipip50` (Big Five), `scs_sf` (self-compassion), `swls`/`flourishing`/`wellness_check` (wellbeing), adaptive clinical `gad7`/`ace3`/`asrs`.

This validates the STRATEGY thesis empirically: the *engine* is already program-agnostic. What's missing is the **container** that says "these two people are a dyad, coach them as one."

### 1.3 Coaching context — all per-user today

`messages` (170), `memory_facts` (227, pgvector embedding), `commitments` (31), `conversation_summaries`, `user_entities`, `scheduled_messages` (0 — table exists, scheduler unbuilt), `coach_profiles` (18, the learned delivery dimensions), `coaching_challenges`, `crisis_flags`. **Every one FKs to `users.id` and is RLS-scoped `auth.uid() = user_id`.** None are engagement-aware. This is the surface the spine must thread through *without* breaking the privacy model.

### 1.4 Identity, roles, latent tenancy

- `public.users.id` mirrors `auth.users.id` (app tables FK to `public.users`; `share_unlocks`/`viral_events` FK straight to `auth.users`).
- **Role system:** `users.role` ∈ `user` \| `admin` \| `superadmin` (+ legacy `is_admin` boolean kept in sync by `trg_sync_is_admin`). Helper `get_auth_user_role()` (SECURITY DEFINER) is the canonical check used in RLS.
- **Latent tenancy already present:** `users.org_id` → `organizations` (0 rows) and `contact_id` → `contacts`. A tenant concept exists but is unused — we will *not* repurpose `org_id` for `workspace` (org = CRM/B2B contact org; workspace = product tenancy; keep them distinct).
- Subscription columns exist: `subscription_tier`, `decoded_tier`, `stripe_customer_id`, `stripe_subscription_id` — all **per-user**. Dual-seat couple billing (PRD §6) will need an engagement-level subscription (see §6.4).

### 1.5 The coach is already dyad-curious — `prompt-assembler.ts` Layer 4.6

`assemblePrompt(userId, userMessage)` already contains a **Shared Relationship Profiles** layer (lines ~694–780): it queries `decoded_invites` for rows touching `userId` with `share_with_coach != 'none'` and `status IN ('consented','connected')`, loads the partner's `assessment_reports`, and injects archetype + compatibility + access rules into the system prompt. **This is the thing we formalise.** Its current limitations define the work:
1. It **fans out from `userId`**, not from an engagement — there's no first-class "this dyad" object.
2. It treats the partner as *reference data bolted onto a solo coach*, not as a **co-participant of one engagement**.
3. Consent is read from `share_with_coach` ad hoc; there's no participant-level consent record or revocation surface beyond the invite row.
4. No mediator stance / no "the couple's coach can be addressed by either partner."

---

## 2. The polymorphic spine (the model)

Five concepts + one funnel table. Intent per STRATEGY §3; concrete shape below. **Relationship Stage-1 binding shown in the right column.**

| Concept | Purpose | Stage-1 (relationship) binding |
|:--|:--|:--|
| **`workspace`** | Top-level tenant isolation. `workspace_id` on every user-data table. | One seed row `masterytv`; everything defaults to it. |
| **`program`** | Selects assessment battery, coach persona layer, funnel, content. `kind ∈ relationship\|career\|white_label_vertical`. | One seed row `relationship`. |
| **`engagement`** | The **container the user is coached within**. Polymorphic by participant count + stakeholder. Coaching artifacts that are *shared* hang here. | `kind='relationship_dyad'`, exactly 2 participants. |
| **`participant`** | Links an account (or a pending email) to an engagement with a `role` + per-participant consent. | 2 rows: `self` + `partner`. |
| **`accountability_link`** | The **external stake as first-class, queryable data**. `stake_type ∈ partner\|cohort\|human_coach\|deadline`. | 1 row, `stake_type='partner'`, binding the two participants. |
| **`entry_segment`** | Marketing slug → program + coach framing + content. Makes multi-funnel/multi-domain data-driven. | Rows like `/couples`, `/engaged` → `relationship`. (Which rows = GTM, out of scope here.) |

**Two-tier data rule (the privacy spine):**

- **Private, per-participant** data stays on the user and stays RLS-locked to that user: `messages`, `memory_facts`, `commitments`, `conversation_summaries`, `user_entities`, `coach_profiles`, `crisis_flags`. We add a **nullable** `engagement_id` for *attribution/threading* (e.g. "this commitment came up in the couples context") but **reading it never crosses to the partner via RLS**.
- **Shared, per-engagement** artifacts live on new engagement-scoped tables readable by *both* participants: the Relationship Blueprint, the shared ritual/streak, the accountability link, and engagement metadata.
- **Cross-partner context** (partner's archetype/Blueprint feeding *your* coach) is assembled **server-side by the edge function under service role**, gated by `participant.share_level` — exactly as Layer 4.6 does today. It is **never** granted by broad table RLS. This is decision **D2** and it's what keeps "neither partner sees the other's private reflections" (PRD §10) true even as the coach speaks to both.

---

## 3. Migration path — promote `decoded_invites`, don't rebuild

The guiding principle (STRATEGY §3): *we are promoting an existing concept.* Concretely:

### 3.1 Keep `decoded_invites` as the invite/claim transport

It already has a working viral loop, claim-by-email flow, and battle-tested RLS. **Do not retire it.** Instead:

1. **Add `engagement_id uuid` to `decoded_invites`** (nullable FK → `engagement.id`).
2. When an invite reaches `consented`/`connected`, an **engagement is materialised** (one dyad) with two `participant` rows and one `accountability_link`. The invite row now points at its durable engagement.
3. The invite remains the *join request + consent capture*; the **engagement is the durable relationship** the coach and scheduler operate on.

### 3.2 Backfill (data migration, run once, after Gate 2)

For every existing `decoded_invites` row (prioritise `status IN ('consented','connected')`, but backfill `pending` too so the funnel is continuous):

```text
engagement        ← one per invite:  workspace=masterytv, program=relationship,
                    kind='relationship_dyad', status = map(invite.status),
                    created_by = inviter_id, source_invite_id = invite.id
participant[self] ← user_id=inviter_id, role='self',
                    report_id=inviter_report_id, share_level=share_with_coach,
                    status = active
participant[ptnr] ← user_id=recipient_id (nullable),
                    invited_email=recipient_email, role='partner',
                    report_id=recipient_report_id,
                    share_level=share_with_coach,
                    status = (recipient_id IS NULL ? 'invited' : map(invite.status))
accountability    ← stake_type='partner', engagement_id, links both participants,
                    status='active' when both consented
blueprint artifact← move compatibility_report* JSONB onto engagement_artifact
                    (kind='relationship_blueprint'); leave originals in place
                    (non-destructive) until the read path is cut over.
```

Status map: invite `pending`→engagement `forming`; `consented`→`active`; `connected`→`active`. Participant consent (`share_level`) is copied from the invite's `share_with_coach`, preserving the existing consent semantics 1:1.

### 3.3 Cutover order (so nothing breaks mid-flight)

1. Apply DDL (new tables + `engagement_id` columns) — additive, zero downtime.
2. Backfill engagements/participants from `decoded_invites` (idempotent, keyed on `source_invite_id`).
3. Dual-write: invite-accept and consent flows write **both** the invite row (unchanged) **and** the engagement/participant rows.
4. Migrate the **read** path (prompt-assembler Layer 4.6 → §7) from `decoded_invites` fan-out to `engagement`/`participant`.
5. Once reads are off the invite JSONB, treat `decoded_invites` as transport-only; Blueprint lives on `engagement_artifact`.

No destructive drops in Stage 1. `decoded_invites` columns are retired (not dropped) only after the read path is fully on the spine.

---

## 4. RLS plan

### 4.1 The membership helper (the one new primitive)

```sql
-- SECURITY DEFINER so it can read participant rows the caller can't see directly,
-- mirroring the existing get_auth_user_role() pattern.
CREATE OR REPLACE FUNCTION public.is_engagement_participant(p_engagement_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM participant
    WHERE engagement_id = p_engagement_id
      AND user_id = auth.uid()
      AND status IN ('active','consented')
  );
$$;
```

### 4.2 Policy tiers

- **Engagement-shared tables** (`engagement`, `participant`, `accountability_link`, `engagement_artifact`, shared rituals): `USING (public.is_engagement_participant(engagement_id))`. Both partners read the shared layer; neither reaches the other's private layer.
  - Exception: `participant` SELECT must let a *pending* partner find their own row by email pre-claim — reuse the `decoded_invites` claim pattern: `... OR (user_id IS NULL AND lower(invited_email)=lower(auth.jwt()->>'email'))`.
- **Private per-participant tables** (`messages`, `memory_facts`, `commitments`, …): **unchanged** — `auth.uid() = user_id`. Adding `engagement_id` does **not** change who can read them.
- **Admin/superadmin:** continue to read via `get_auth_user_role() IN ('admin','superadmin')`, extended onto the new tables for the admin console.
- **Server-side dyad assembly** runs under the **service role** (bypasses RLS) and enforces `participant.share_level` in code — the existing, working pattern.

### 4.3 The `workspace_id` rule (cheap-now / expensive-later)

> **Mandate (STRATEGY §3):** every new user-data table carries `workspace_id uuid NOT NULL DEFAULT <masterytv>` with an FK to `workspace` and an index. In Stage 1 it's a constant; we do **not** add workspace predicates to RLS yet (single tenant). Stage 3 turns enforcement on by adding `workspace_id = current_workspace()` to policies — a contained change because the column and indexes already exist everywhere. Retro-fitting `workspace_id` onto a populated multi-table schema later is the migration we are buying our way out of.

---

## 5. First-cut SQL sketch (PROPOSAL — not applied)

Illustrative DDL for Gate-2 review. Names/types are the proposal; not run against the DB.

```sql
-- ── Tenancy ───────────────────────────────────────────────
CREATE TABLE workspace (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,          -- 'masterytv'
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- seed: INSERT INTO workspace (slug,name) VALUES ('masterytv','MasteryTV');

-- ── Program (which engine config a user sees) ─────────────
CREATE TABLE program (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspace(id),
  kind        text NOT NULL CHECK (kind IN ('relationship','career','white_label_vertical')),
  slug        text NOT NULL,
  name        text NOT NULL,
  config      jsonb NOT NULL DEFAULT '{}',   -- battery ids, coach persona layer, funnel
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);
-- seed: program 'relationship' with config.battery = ['ecr_r_short','csi4','ders16','ipip50',...]

-- ── Engagement (the coached container) ────────────────────
CREATE TABLE engagement (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspace(id),
  program_id    uuid NOT NULL REFERENCES program(id),
  kind          text NOT NULL,               -- 'relationship_dyad' | 'career_solo' | 'whitelabel_coachee'
  status        text NOT NULL DEFAULT 'forming'  -- forming|active|paused|ended
                  CHECK (status IN ('forming','active','paused','ended')),
  title         text,
  created_by    uuid REFERENCES users(id),
  source_invite_id uuid REFERENCES decoded_invites(id),  -- provenance from the seed
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_engagement_workspace ON engagement(workspace_id);
CREATE INDEX idx_engagement_program   ON engagement(program_id);

-- ── Participant (account ↔ engagement, role + consent) ────
CREATE TABLE participant (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspace(id),
  engagement_id uuid NOT NULL REFERENCES engagement(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id),   -- nullable until the partner claims
  invited_email text,                          -- pre-claim address (mirrors decoded_invites)
  role          text NOT NULL CHECK (role IN ('self','partner','coachee','cohort_member')),
  report_id     uuid REFERENCES assessment_reports(id),
  share_level   text NOT NULL DEFAULT 'none'  -- consent the coach reads
                  CHECK (share_level IN ('none','type_compatibility','full')),
  status        text NOT NULL DEFAULT 'invited'  -- invited|active|consented|revoked
                  CHECK (status IN ('invited','active','consented','revoked')),
  consented_at  timestamptz,
  revoked_at    timestamptz,
  joined_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, role),               -- one 'self', one 'partner' per dyad
  CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL)
);
CREATE INDEX idx_participant_user       ON participant(user_id);
CREATE INDEX idx_participant_engagement ON participant(engagement_id);

-- ── Accountability link (the external stake, first-class) ─
CREATE TABLE accountability_link (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspace(id),
  engagement_id uuid NOT NULL REFERENCES engagement(id) ON DELETE CASCADE,
  stake_type    text NOT NULL CHECK (stake_type IN ('partner','cohort','human_coach','deadline')),
  from_participant_id uuid REFERENCES participant(id),
  to_participant_id   uuid REFERENCES participant(id),  -- for 'partner'
  external_ref  text,                           -- cohort_id / coach_id / deadline label
  due_at        timestamptz,                    -- for 'deadline' (career stage)
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','met','broken','ended')),
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_accountability_engagement ON accountability_link(engagement_id);

-- ── Engagement artifact (shared, readable by both) ────────
-- Holds the Relationship Blueprint (promoted from decoded_invites.compatibility_report*).
CREATE TABLE engagement_artifact (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspace(id),
  engagement_id uuid NOT NULL REFERENCES engagement(id) ON DELETE CASCADE,
  kind          text NOT NULL,                 -- 'relationship_blueprint' | 'state_of_the_union' | ...
  content       jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_engagement_artifact_engagement ON engagement_artifact(engagement_id);

-- ── Entry segment (funnels → program). Rows = GTM, out of scope. ──
CREATE TABLE entry_segment (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspace(id),
  program_id    uuid NOT NULL REFERENCES program(id),
  slug          text NOT NULL,                 -- 'couples','married','engaged'
  domain        text,                          -- 'relatti.com'
  coach_framing text,                          -- persona/copy layer key
  content_ref   jsonb NOT NULL DEFAULT '{}',
  is_active     boolean NOT NULL DEFAULT true,
  UNIQUE (workspace_id, domain, slug)
);

-- ── Thread the spine through existing tables (additive, nullable) ──
ALTER TABLE decoded_invites    ADD COLUMN engagement_id uuid REFERENCES engagement(id);
ALTER TABLE messages           ADD COLUMN engagement_id uuid REFERENCES engagement(id);
ALTER TABLE commitments        ADD COLUMN engagement_id uuid REFERENCES engagement(id);
ALTER TABLE scheduled_messages ADD COLUMN engagement_id uuid REFERENCES engagement(id);
-- (memory_facts / conversation_summaries get engagement_id later if needed; not required for V1)
-- workspace_id backfill onto existing user-data tables is a separate, batched step.
```

Notes: every new table has `workspace_id`; FKs reuse `public.users(id)` and `assessment_reports(id)`. `participant` mirrors the invite's nullable-recipient + claim-by-email pattern so the existing partner-onboarding UX is unchanged. RLS policies per §4 are applied immediately after each `CREATE TABLE` (omitted here for brevity).

---

## 6. Where Stage-2/3 plug in (designed-for, not built)

- **Career (Stage 2):** `program.kind='career'`, `engagement.kind='career_solo'`, 1 participant `role='coachee'`, `accountability_link.stake_type='deadline'` (`due_at`) or `'cohort'` (`external_ref=cohort_id`). No schema change — config + content.
- **White-label (Stage 3):** new `workspace` rows; `accountability_link.stake_type='human_coach'` (`external_ref=coach_id`); RLS gains `workspace_id` predicates. The columns already exist everywhere — this is the payoff of the §4.3 mandate.
- **SMS + proactive scheduler (shared dependency, PRD §6 / STRATEGY §5):** build against `scheduled_messages.engagement_id` so "us check-ins" target the *dyad*, not a user. `messages.channel` already accepts arbitrary values — add `'sms'`. This is the one infra investment that serves all three stages; build it once, engagement-scoped.

### 6.4 Dual-seat billing (PRD §6)

Today billing is per-user (`users.subscription_tier`/`stripe_*`). For "one couple sub, two seats," attach the subscription to the **engagement**: add `engagement.subscription_status` / `stripe_subscription_id` (or a thin `engagement_subscription` table), and derive each participant's entitlement from their engagement. Flagged here as an architectural consequence; detailed billing design belongs in the Sprint doc.

---

## 7. Coach prompt-assembler changes (dyad context)

Target file: [`supabase/functions/_shared/prompt-assembler.ts`](supabase/functions/_shared/prompt-assembler.ts). The change is an **evolution of the existing Layer 4.6**, not a rewrite.

**Today:** `assemblePrompt(userId, msg)` → Layer 4.6 queries `decoded_invites` by `userId`, loads the partner's report, injects "shared profile" reference data into a fundamentally solo coach.

**Target:**

1. **Resolve engagement first.** Add an optional `engagementId` param (and/or resolve the user's active `relationship_dyad` engagement). The engagement — not `userId` — becomes the spine of the dyad layer.
2. **Load both participants** via `participant` (replacing the invite fan-out): each participant's `user_id`, `role`, `report_id`, and `share_level`. Pull both Decoded profiles + the `engagement_artifact` Blueprint.
3. **Mediator framing.** When `engagement.kind='relationship_dyad'`, swap/extend Layer 1 base persona with a **dyad/mediator stance**: the coach holds *both* partners, stays even-handed, translates rather than takes sides, and can be addressed by either partner. This is new persona text, gated on engagement kind.
4. **Consent stays code-enforced under service role.** Honour `participant.share_level` exactly as Layer 4.6 does now (`none` → nothing; `type_compatibility` → archetype + Blueprint headline; `full` → full profile). No broadening of RLS (decision D2).
5. **Accountability/stake awareness.** Surface the `accountability_link` ("the stake here is the partner — when one drifts, lean on the shared ritual") so the retention mechanism is *in the prompt*, per the PRD §7 thesis.
6. **Safety extension (PRD §10).** Dyad coaching adds duty-of-care: extend `buildSafetyGuardrails()` / crisis detection with relationship-abuse & coercive-control screening that **routes to human resources and refuses to "mediate" an abusive dynamic.** Flagged as an architectural requirement; content lives in `COACHING_GUARDRAILS.md`.

The per-user layers (memory, commitments, delivery style, Decoded Layer 4.5) are unchanged — each partner keeps their own private coaching context; the dyad layer composes *over* them.

---

## 8. Open architectural decisions for Gate 2

| # | Decision | Recommendation |
|:--|:--|:--|
| D1 | Retire `decoded_invites` or keep as transport + add `engagement_id`? | **Keep + add FK.** Reuse the working viral/claim/RLS flow; promote, don't rebuild. |
| D2 | Cross-partner data via RLS or server-side under consent? | **Server-side under service role + `participant.share_level`.** Preserves "private reflections stay private" (PRD §10). |
| D3 | `workspace_id` on every new table in Stage 1? | **Yes.** Cheap column now; avoids a multi-table retrofit at Stage 3. |
| D4 | Per-user coaching tables get `engagement_id`? | **Nullable, for attribution only** — not a read-path change. Start with `messages`/`commitments`/`scheduled_messages`. |
| D5 | Dual-seat billing location | **Attach subscription to `engagement`** (column or thin table); detail in Sprint. |
| D6 | Blueprint storage | **Move to `engagement_artifact`**; keep `decoded_invites.compatibility_report*` until read path cut over (non-destructive). |

### ADRs (proposed)

- **ADR-R01 — One polymorphic spine, defaulted to the dyad.** Five tables serve all three stages; Stage 1 fills only the relationship case. *Rationale:* STRATEGY mandate; later stages become config not migration.
- **ADR-R02 — Privacy by assembly, not by RLS.** Partner context is composed server-side under explicit `share_level`; per-user data RLS is never broadened. *Rationale:* duty of care + matches the already-working Layer 4.6 pattern.
- **ADR-R03 — `workspace_id` everywhere from day one.** *Rationale:* cheapest possible insurance against the Stage-3 multi-tenancy migration.
- **ADR-R04 — Promote `decoded_invites`, don't replace it.** Engagement is materialised from invites; the invite remains the consent/claim transport. *Rationale:* reuse battle-tested RLS and the viral loop.

---

## 9. Gate 2 checklist (BMAD)

- [x] Tech stack selected with rationale — **inherits engine stack** (`ARCHITECTURE.md` §2: Supabase/Postgres + Edge Functions + Next.js); no new platform.
- [x] Database schema designed — §5 spine sketch.
- [x] API/assembler contracts defined — §7 prompt-assembler evolution.
- [x] Security model defined — §4 RLS tiers + `is_engagement_participant()` + workspace mandate.
- [ ] 3rd-party integrations + costs — **deferred to Sprint** (SMS provider for the shared dependency is the open item).
- [x] **Founder approval of this architecture (Gate 2).** ✅ June 16, 2026.

> **Next:** [RELATIONSHIP_SPRINT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/RELATIONSHIP_SPRINT.md) (Phase 3) sequences the ordered build: spine DDL + backfill → assembler cutover → SMS/proactive scheduler → dual-seat billing. No migrations applied / no code changed until Gate 3.
