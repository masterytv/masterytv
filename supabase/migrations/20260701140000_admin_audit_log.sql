-- E15.3 — Admin-access audit logging (Trust, Privacy & Legal).
--
-- Records who (which admin) read or acted on sensitive user data through the
-- admin-data edge function: crisis flags, message debug traces, and coach
-- profiles. This is the "who read what" trail the Privacy Policy commits to and
-- that PRIVACY_TERMS_LIABILITY_PLAN.md §6.3 requires (least-privilege + audit).
--
-- Written only by the admin-data edge function (service role). RLS is enabled
-- with NO policies → default-deny for every client role; the service role
-- bypasses RLS. The log is intentionally NOT covered by delete-user-data: an
-- audit trail that a user could erase is not an audit trail (disclosed in the
-- Privacy Policy as a retained safety/operational record).

create table if not exists public.admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  -- The admin who performed the access. SET NULL (not CASCADE) so the trail
  -- survives even if that admin account is ever removed; admin_email preserves
  -- attribution.
  admin_user_id uuid references public.users(id) on delete set null,
  admin_email   text,
  -- What they did, e.g. 'read_crisis_flags', 'read_debug_trace',
  -- 'read_coach_profile', 'resolve_crisis'.
  action        text not null,
  -- Whose data was accessed (nullable — list views span all users).
  target_user_id uuid,
  -- The specific record id accessed/acted on (flag id, message id, …).
  target_id     text,
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_admin_idx
  on public.admin_audit_log (admin_user_id);
create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_user_id);

alter table public.admin_audit_log enable row level security;
-- No policies on purpose: default-deny for anon/authenticated; service role only.

comment on table public.admin_audit_log is
  'E15.3 — audit trail of admin reads/writes of sensitive user data (crisis_flags, messages, coach profiles). Written by the admin-data edge fn (service role). RLS default-deny; no client access. Excluded from delete-user-data by design.';
