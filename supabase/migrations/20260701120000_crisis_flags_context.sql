-- Crisis flags: add conversation/dyad context + provenance for the Tier 2 safety sweep.
-- Additive + nullable; crisis_flags is empty so no backfill needed.
-- COACH_SAFETY_AND_TESTING_SPEC.md §A.4.

alter table public.crisis_flags
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null,
  add column if not exists engagement_id uuid references public.engagement(id) on delete set null,
  add column if not exists subject_scope text not null default 'self',
  add column if not exists source text not null default 'keyword',
  add column if not exists coach_handled boolean not null default false,
  add column if not exists detail jsonb;

alter table public.crisis_flags drop constraint if exists crisis_flags_subject_scope_chk;
alter table public.crisis_flags add constraint crisis_flags_subject_scope_chk
  check (subject_scope in ('self', 'partner', 'third_party'));

alter table public.crisis_flags drop constraint if exists crisis_flags_source_chk;
alter table public.crisis_flags add constraint crisis_flags_source_chk
  check (source in ('keyword', 'llm_sweep'));

create index if not exists crisis_flags_unreviewed_idx
  on public.crisis_flags (user_id, conversation_id, category)
  where reviewed = false;

comment on column public.crisis_flags.subject_scope is 'Who is at risk: self | partner | third_party (couples context — the at-risk person may be a different user).';
comment on column public.crisis_flags.source is 'Detector that produced this flag: keyword (Tier 1 hard-stop) | llm_sweep (Tier 2 async).';
comment on column public.crisis_flags.coach_handled is 'Did the coach surface crisis resources in its reply (QA signal).';
