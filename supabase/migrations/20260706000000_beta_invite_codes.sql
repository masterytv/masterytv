-- Relatti beta admission: invite codes + per-code cap.
-- Gates free beta_access behind a redeemable code with a use cap, replacing the
-- open self-serve pledge before the public (Reddit) phase. Additive + safe:
-- existing beta_access grants are untouched; only the unlock path changes.

-- 1) The codes. Each grants up to max_uses free beta unlocks.
create table if not exists public.beta_invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,
  max_uses int not null default 1 check (max_uses > 0),
  uses int not null default 0 check (uses >= 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists beta_invite_codes_code_upper_idx on public.beta_invite_codes (upper(code));

-- No client RLS policies: only the service role (admin routes + the funnel
-- aggregation) reads/writes these. Redemption goes through redeem_beta_code().
alter table public.beta_invite_codes enable row level security;

-- 2) Which code a user redeemed (null for legacy self-serve grants).
alter table public.users add column if not exists beta_code_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_beta_code_id_fkey') then
    alter table public.users
      add constraint users_beta_code_id_fkey
      foreign key (beta_code_id) references public.beta_invite_codes(id) on delete set null;
  end if;
end $$;

-- 3) Atomic redemption. Claims a slot under a row lock (UPDATE ... WHERE
-- uses < max_uses) so the cap can't be over-run by concurrent redemptions, then
-- grants beta_access. Returns a status the API maps to a user-facing message.
--   'ok' | 'already' | 'invalid' | 'expired' | 'exhausted'
create or replace function public.redeem_beta_code(p_code text, p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code_id uuid;
  v_norm text := upper(trim(coalesce(p_code, '')));
begin
  if v_norm = '' then
    return 'invalid';
  end if;

  -- Already have beta access → don't consume a slot (idempotent).
  if (select beta_access from public.users where id = p_user_id) then
    return 'already';
  end if;

  -- Atomically claim a slot. The row lock during UPDATE means two concurrent
  -- redemptions of the last slot can't both satisfy uses < max_uses.
  update public.beta_invite_codes
    set uses = uses + 1
    where upper(code) = v_norm
      and active
      and (expires_at is null or expires_at > now())
      and uses < max_uses
    returning id into v_code_id;

  if v_code_id is null then
    if not exists (select 1 from public.beta_invite_codes where upper(code) = v_norm) then
      return 'invalid';
    end if;
    if exists (
      select 1 from public.beta_invite_codes
      where upper(code) = v_norm and (not active or (expires_at is not null and expires_at <= now()))
    ) then
      return 'expired';
    end if;
    return 'exhausted';
  end if;

  update public.users
    set beta_access = true,
        beta_access_granted_at = coalesce(beta_access_granted_at, now()),
        beta_code_id = v_code_id
    where id = p_user_id;

  return 'ok';
end;
$$;

-- Service-role only (called from server routes). NOT client-callable — the P0
-- lesson: SECURITY DEFINER functions are PostgREST-exposed to anon/authenticated
-- by default, so revoke them explicitly.
revoke all on function public.redeem_beta_code(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_beta_code(text, uuid) to service_role;
