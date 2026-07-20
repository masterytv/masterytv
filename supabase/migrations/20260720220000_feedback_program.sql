-- Feedback becomes PROGRAM-SCOPED (2026-07-20).
--
-- WHY: the floating feedback widget was Relatti-only (beta harness,
-- 20260630000000); it now mounts on every brand's dashboard (MasteryTV +
-- MoneyTraits too), so a row must say WHICH product the tester was talking
-- about. Without the column, the Relatti beta cockpit and founder triage
-- would mix three verticals' feedback into one undifferentiated list — the
-- same exempt-table blind spot that put executive commitments on the
-- MoneyTraits dashboard (fixed in 20260720210000).
--
-- BACKFILL + DEFAULT 'relationship': every row to date came from the Relatti
-- beta widget (the only writer since 20260630), and during the
-- migration->deploy window the still-deployed Relatti-only route inserts
-- without the stamp — the default keeps those rows correctly filed. All
-- post-deploy writers (/api/feedback + the beta-survey pledge) stamp
-- `program` explicitly.
--
-- No RLS / grant changes; ownership stays user_id-based.

alter table public.feedback add column if not exists program text;

update public.feedback set program = 'relationship' where program is null;

alter table public.feedback alter column program set not null;
alter table public.feedback alter column program set default 'relationship';

-- Admin triage reads are per-vertical (WHERE program = ...); user-facing
-- reads stay user_id-scoped via RLS (feedback_user_id_idx already exists).
create index if not exists idx_feedback_program on public.feedback (program);
