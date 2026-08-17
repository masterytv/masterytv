-- I5.5 — the consent record, and the 18+ attestation with it.
-- INTEGRATION_SPRINT.md §3 / I5.5; INTEGRATION_EXPERIENCE.md §5.2.
--
-- ─── WHY A TABLE AND NOT A COLUMN ────────────────────────────────────────
--
-- The existing acceptance lives in `auth.users.user_metadata.legal_version`,
-- written at login. That is fine for "they clicked accept on the terms" and it
-- is the wrong shape for this: a ToS checkbox is statutorily not consent in
-- Illinois, the thing being consented to is per-VERTICAL rather than per-
-- account, and what has to survive an audit is a ROW — which version, at what
-- time, for which program, with the age attestation attached — not a field that
-- the next login overwrites.
--
-- One row per (user, program, version). Re-consenting to a new version adds a
-- row rather than editing one, so the history of what somebody agreed to and
-- when is append-only by construction. Revocation stamps `revoked_at` on the
-- row instead of deleting it, for the same reason.
--
-- ─── WHAT IT GATES ───────────────────────────────────────────────────────
--
-- Two places, and the second is the one that matters:
--   1. The coach refuses turn 2 without a row (the screen lands BEFORE turn 2,
--      not before turn 1 — §5.2 is explicit that nothing stands between a person
--      and the box the first time).
--   2. `post-processor.ts` writes NO derived memory for this program without a
--      row. That is the actual promise: their message is a message they chose to
--      send, and everything the product concludes from it is a stored fact about
--      a person who has not yet agreed to be remembered.
--
-- ─── TENANCY ─────────────────────────────────────────────────────────────
--
-- `program` is carried rather than assumed, on the spine mandate: this table is
-- for the integration vertical today, and a consent record is exactly the sort
-- of thing every later vertical needs. The unique index is per (user, program,
-- version), so a dual-brand person consents to each vertical separately — which
-- is the correct behaviour and not an accident of the schema.

create table if not exists public.coaching_consents (
  id uuid primary key default gen_random_uuid(),
  -- Spine default (matches money_decisions et al.) — the single-workspace tenant.
  workspace_id uuid not null default '00000000-0000-0000-0000-000000000001',
  user_id uuid not null references public.users(id) on delete cascade,
  -- Which vertical they agreed to. Never null: a consent that does not say what
  -- it is for is not a consent record.
  program text not null,
  -- The published revision they were shown, e.g. '2026-08-13'. Stored as text so
  -- a stored record always maps to a specific document rather than to "current".
  version text not null,
  -- 🔑 The 18+ attestation, and it is `not null` on purpose: there is no such
  -- thing as a consent row here that is silent about age. A hard gate in the UI
  -- can be bypassed by anybody who wants to; what this column records is that we
  -- asked, what they answered, and when.
  age_attested boolean not null,
  -- What they were told, in the version they were shown. Free-form so a later
  -- document revision can record a different set without a migration.
  disclosures jsonb not null default '{}'::jsonb,
  accepted_at timestamptz not null default now(),
  -- Revocation stamps rather than deletes: withdrawing consent is itself a fact
  -- about the account, and a deleted row cannot be told apart from one that
  -- never existed.
  revoked_at timestamptz,
  -- Free text if they say why. Never required.
  revoked_reason text,
  created_at timestamptz not null default now()
);

-- The read every gated path makes: does this person have a live consent for this
-- program, at any version. Partial on `revoked_at is null` because a revoked row
-- must never satisfy the gate.
create index if not exists coaching_consents_live_idx
  on public.coaching_consents (user_id, program)
  where revoked_at is null;

-- One row per (user, program, version). A double-submit from a client that
-- retries is the same consent, not a second one.
create unique index if not exists coaching_consents_unique_version_idx
  on public.coaching_consents (user_id, program, version);

alter table public.coaching_consents enable row level security;

-- Readable and insertable by the person it is about, and by nobody else. There
-- is deliberately NO update policy and NO delete policy for the user: a consent
-- record they could edit is not a record. Revocation goes through the service
-- role, which stamps `revoked_at` and keeps the row.
drop policy if exists "coaching_consents readable by self" on public.coaching_consents;
create policy "coaching_consents readable by self" on public.coaching_consents
  for select using (auth.uid() = user_id);

drop policy if exists "coaching_consents insert by self" on public.coaching_consents;
create policy "coaching_consents insert by self" on public.coaching_consents
  for insert with check (auth.uid() = user_id);

comment on table public.coaching_consents is
  'I5.5 — per-user, per-program, per-version consent with an 18+ attestation. Append-only: re-consent adds a row, revocation stamps revoked_at. Gates derived-memory writes in post-processor.ts and turn 2 in the coach.';
