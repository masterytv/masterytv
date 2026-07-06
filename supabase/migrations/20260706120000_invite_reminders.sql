-- Compatibility redesign: capped invite reminders.
-- Lets an inviter re-send the invite email up to 3× (the UI enforces the cap;
-- these columns persist the count so it survives reloads).
alter table public.decoded_invites
  add column if not exists reminder_count int not null default 0,
  add column if not exists last_reminded_at timestamptz;
