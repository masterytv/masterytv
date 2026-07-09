-- Beta before/after check-ins (the free-access ⇄ two-surveys deal).
--
-- The "before" measurement of relationship satisfaction is the CSI-4 the tester
-- already answered inside the assessment (validated, timestamped); the before
-- row snapshots that baseline into csi_total at unlock time so a later retake
-- can't move it. The "after" row (day 14) re-administers CSI-4 verbatim and the
-- delta powers the marketing stat ("X% scored happier on the Couples
-- Satisfaction Index after two weeks").
--
-- Privacy: coaching content is NEVER read for this. Survey answers are used
-- (a) anonymously in aggregate and (b) as a public quote ONLY when
-- quote_permission is true, attributed per quote_attribution.

create table if not exists public.beta_surveys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default '00000000-0000-0000-0000-000000000001',
  user_id uuid not null references public.users(id) on delete cascade,
  phase text not null check (phase in ('before', 'after')),
  -- The raw answers (question key → value). Kept as jsonb so the form can
  -- evolve without migrations; stable keys documented in the API route.
  responses jsonb not null default '{}'::jsonb,
  -- before: baseline CSI-4 total snapshotted from assessment_scores at unlock.
  -- after: CSI-4 total re-scored from the check-in answers. Range 0–21.
  csi_total numeric,
  testimonial text,
  quote_permission boolean not null default false,
  quote_attribution text check (quote_attribution in ('first_name', 'initials', 'anonymous')),
  -- After-check-in email nudges (tracked on the BEFORE row: it's the row that
  -- exists while the after one is still owed). Max 3 sends, ≥3 days apart.
  reminders_sent int not null default 0,
  last_reminder_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, phase)
);

create index if not exists beta_surveys_user_idx on public.beta_surveys (user_id);

-- RLS: testers can see their own rows (drives the day-14 dashboard banner).
-- No insert/update policies — all writes go through service-role API routes,
-- so answers and consent flags can't be forged client-side.
alter table public.beta_surveys enable row level security;

drop policy if exists beta_surveys_select_self on public.beta_surveys;
create policy beta_surveys_select_self on public.beta_surveys
  for select using (auth.uid() = user_id);

-- Daily nudge job → cron-beta-checkins edge fn (16:00 UTC ≈ 9am PT / noon ET).
-- Idempotent: unschedule any prior job with this name first.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'beta-checkin-nudges') then
    perform cron.unschedule('beta-checkin-nudges');
  end if;
end $$;

select cron.schedule(
  'beta-checkin-nudges',
  '0 16 * * *',
  $$
  select net.http_post(
    url := 'https://lwmadssysqcwbsoiaokc.supabase.co/functions/v1/cron-beta-checkins',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
