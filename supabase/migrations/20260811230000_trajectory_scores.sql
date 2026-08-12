-- I3.6 — per-user trajectory scores (INTEGRATION_SPRINT.md §3).
--
-- An append-only time series, not a current-state row. I12.2's Aperture shows a
-- person their own change ("a month ago almost everything we talked about was
-- the experience; this month half of it was your sister and your sleep"), and
-- that sentence needs history. Overwriting one row per user would make the one
-- thing the widget exists to say impossible to compute.
--
-- Tenancy: workspace_id per the spine rule, program per PC2.2. Categorized as
-- PROGRAM_SCOPED in scripts/check-tenancy.mjs in the same commit.

create table if not exists public.trajectory_scores (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid not null,
  program       text not null,
  -- 0..1, higher is more narrowing. Never a verdict on its own.
  score         numeric(6,4) not null check (score >= 0 and score <= 1),
  -- The six metrics, so the Aperture can show one dial rather than the sum and
  -- so a later weighting change can be recomputed from stored components.
  components    jsonb not null default '{}'::jsonb,
  turns_early   integer not null default 0,
  turns_recent  integer not null default 0,
  computed_at   timestamptz not null default now()
);

create index if not exists trajectory_scores_user_program_time_idx
  on public.trajectory_scores (user_id, program, computed_at desc);

alter table public.trajectory_scores enable row level security;

-- No policies, deliberately. This is written by a service-role cron job and read
-- by the admin queue and (later) by a server-side Aperture query. A person's own
-- spiral score is not a thing to hand to the browser: it is an internal signal,
-- and the Aperture surfaces a WORDED view of it rather than the number.
-- RLS enabled with zero policies = deny for anon/authenticated, service role
-- bypasses. Revoke the default PUBLIC grants too — enabling RLS does not remove
-- table privileges, and the 2026-07 sweep exists because that was missed before.
revoke all on public.trajectory_scores from public, anon, authenticated;

comment on table public.trajectory_scores is
  'I3.6 per-user narrowing score over the accumulated transcript. Append-only. Service-role only; the Aperture (I12.2) renders a worded view, never the number.';
