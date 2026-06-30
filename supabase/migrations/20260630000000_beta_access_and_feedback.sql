-- Relatti free-beta testing harness: beta access flag + feedback capture.
-- Applied to cloud engine DB (lwmadssysqcwbsoiaokc) on 2026-06-30.

-- 1) Beta access on users: free unlimited coaching during beta (no payment),
--    granted in exchange for a feedback pledge. Bypasses the free-tier daily cap.
alter table public.users
  add column if not exists beta_access boolean not null default false,
  add column if not exists beta_access_granted_at timestamptz;

comment on column public.users.beta_access is
  'Relatti beta: free unlimited coaching in exchange for feedback. Bypasses the free-tier daily message limit in the coach edge fn.';

-- 2) Feedback table — spine-compliant (workspace_id), attaches to a user and
--    optionally an engagement. Testers submit; admins triage.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default '00000000-0000-0000-0000-000000000001',
  user_id uuid not null references public.users(id) on delete cascade,
  engagement_id uuid references public.engagement(id) on delete set null,
  category text not null default 'other'
    check (category in ('bug','idea','confusing','praise','beta_signup','other')),
  message text not null,
  rating int check (rating between 1 and 5),
  page_url text,
  user_agent text,
  status text not null default 'new'
    check (status in ('new','triaged','resolved','wontfix')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_id_idx on public.feedback(user_id);
create index if not exists feedback_status_idx on public.feedback(status);
create index if not exists feedback_created_at_idx on public.feedback(created_at desc);

alter table public.feedback enable row level security;

create policy "feedback insert by self" on public.feedback
  for insert with check (user_id = auth.uid());

create policy "feedback readable by self or admin" on public.feedback
  for select using (
    user_id = auth.uid()
    or get_auth_user_role() = any (array['admin','superadmin'])
  );

create policy "feedback updatable by admin" on public.feedback
  for update using (get_auth_user_role() = any (array['admin','superadmin']));
