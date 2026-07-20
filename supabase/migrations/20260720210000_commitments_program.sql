-- Commitments become PROGRAM-SCOPED (2026-07-20).
--
-- WHY: the tenancy audit exempted `commitments` as "executive-only machinery",
-- and that premise died when the money vertical enabled the Commitments module
-- (63752ca) — the MoneyTraits dashboard was listing the executive coach's
-- commitments ("ask brother and sister-in-law to test Relatti"). Same-day
-- code changes: the post-processor stamps `program` on insert, and every
-- per-vertical read (dashboard pages, session planner, arc strategist,
-- morning briefings) filters by it. cron-accountability-checkins stays a
-- deliberate cross-program sweep (identity resolves per commitment).
--
-- BACKFILL provenance: the conversation the commitment was extracted from
-- (source_message_id → messages.conversation_id → conversations.program);
-- rows with no traceable source are executive-era → 'general'.
--
-- DEFAULT 'general' guards any writer that predates the stamp (an un-stamped
-- insert lands in the executive vertical rather than failing NOT NULL).
-- No RLS / grant changes; no SECURITY DEFINER involved.

alter table public.commitments add column if not exists program text;

update public.commitments c
set program = coalesce(pc.program, 'general')
from public.messages m
join public.conversations pc on pc.id = m.conversation_id
where c.source_message_id = m.id
  and c.program is null;

update public.commitments set program = 'general' where program is null;

alter table public.commitments alter column program set not null;
alter table public.commitments alter column program set default 'general';

create index if not exists idx_commitments_user_program
  on public.commitments (user_id, program);
