-- Money Decision Room — the decision log (MONEY_EXPERIENCE.md §8, the V1 spine).
--
-- The Decision Room is money's home surface: a user brings a live money decision
-- ("raise or bootstrap?", "drop the price?"), the money coach applies their whole
-- Money Map profile to it (Layer 4.5), and the user leaves a WRITTEN DECISION
-- RECORD here. This table is that record — the Money OS's (§9) first durable
-- artifact and the retention spine (leaving means abandoning your own decision log).
--
-- ⚠️ STAGED — DO NOT APPLY WITHOUT AN EXPLICIT FOUNDER "GO". apply_migration /
-- the Supabase CLI writes straight to the LIVE engine DB serving Relatti +
-- executive-coach users (MONEY_BUILD_HANDOFF.md §5 HARD STOP). The Decision Room
-- code degrades gracefully until this lands (an absent table → an empty log, no
-- crash), so committing this file does not ship anything to live users.
--
-- pg_constraint note: this is a NEW, self-contained table — it extends no existing
-- status/category vocabulary (memory_facts_category_check et al.), so the 44-vs-7
-- history-gap risk does not apply here. Its only CHECK (status) is defined inline.
-- No SECURITY DEFINER RPC, so no REVOKE … FROM PUBLIC is needed.

create table if not exists public.money_decisions (
  id uuid primary key default gen_random_uuid(),
  -- Spine default (matches beta_surveys et al.) — the single-workspace tenant.
  workspace_id uuid not null default '00000000-0000-0000-0000-000000000001',
  user_id uuid not null references public.users(id) on delete cascade,
  -- Tenancy: the Decision Room is money-only today, but carrying `program` makes
  -- brand isolation explicit and gate-enforced (check-tenancy PROGRAM_SCOPED) —
  -- a dual-brand user's decisions never cross verticals, and a future vertical
  -- that grows a decision surface reuses this table by carrying its own program.
  program text not null default 'money',
  -- The coach thread where this decision is thought through. Client-generated at
  -- creation (crypto.randomUUID) so the Decision Room deep-links straight back to
  -- the exact conversation; the coach fn upserts the conversations row with this
  -- id on the first turn. Nullable for a decision captured without a thread.
  conversation_id uuid,
  -- The decision itself, in the user's words ("Raise a round or bootstrap?").
  title text not null,
  -- open = still thinking it through · decided = a record was written ·
  -- parked = set aside (kept, not deleted, so the pattern history stays intact).
  status text not null default 'open' check (status in ('open', 'decided', 'parked')),
  -- The written decision record (§8): what they decided and why. Filled when they
  -- mark it decided; the honest artifact they can hand to a partner or advisor.
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz
);

-- The Decision Room lists a user's decisions scoped by (user, program), newest
-- activity first — the shape of every dashboard read.
create index if not exists money_decisions_user_program_idx
  on public.money_decisions (user_id, program, updated_at desc);

-- RLS: a user owns their own decisions and writes them directly (client-side,
-- under their JWT) — RLS is the enforcement, so no service-role route is needed.
-- Own-row CRUD only; no admin/cross-user policy (decision records are private).
alter table public.money_decisions enable row level security;

drop policy if exists "money_decisions readable by self" on public.money_decisions;
create policy "money_decisions readable by self" on public.money_decisions
  for select using (auth.uid() = user_id);

drop policy if exists "money_decisions insert by self" on public.money_decisions;
create policy "money_decisions insert by self" on public.money_decisions
  for insert with check (auth.uid() = user_id);

drop policy if exists "money_decisions update by self" on public.money_decisions;
create policy "money_decisions update by self" on public.money_decisions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "money_decisions delete by self" on public.money_decisions;
create policy "money_decisions delete by self" on public.money_decisions
  for delete using (auth.uid() = user_id);
