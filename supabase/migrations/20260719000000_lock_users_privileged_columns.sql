-- Security hardening — lock privileged columns on public.users.
--
-- CLASS: RLS scopes ROWS, not COLUMNS. anon + authenticated held a TABLE-LEVEL
-- UPDATE grant on public.users, and the "Users can update own profile" policy
-- (USING auth.uid() = id) only restricts WHICH ROW you may touch — not which
-- COLUMNS. So any logged-in user could, with the public anon key alone:
--     supabase.from('users').update({ role: 'superadmin' }).eq('id', <own uid>)
-- RLS passes (own row); the BEFORE trigger trg_sync_is_admin then flips
-- is_admin = true → self-service escalation to superadmin → read every user's PII
-- and all crisis_flags via the admin surfaces. (Confirmed LIVE 2026-07-19 on the
-- prod DB; see the security-review-2026-07-19 memory.)
--
-- WHY A COLUMN-LEVEL REVOKE IS NOT ENOUGH: Postgres will not carve a single
-- column out of a table-wide UPDATE grant — `REVOKE UPDATE (col)` only removes
-- column-specific grants, so it is a silent no-op while the table grant stands
-- (verified: has_column_privilege stayed true after the column REVOKE). The only
-- correct pattern is an ALLOWLIST: drop the table grant, then re-grant UPDATE on
-- exactly the columns a client legitimately edits.
--
-- ALLOWLIST = the user-editable profile / demographic / preference columns the
-- browser + authenticated routes actually write (verified against src/, 2026-07-19):
--   * onboarding + assess: linkedin_url, website_url, name, age, gender,
--     occupation, relationship_status, has_children
--   * useUser().updateUser: name, timezone, preferred_channel,
--     morning_briefing_time, telegram_chat_id, ai_tools, updated_at
--   * misc profile: email (auth mirror), more_info, disclaimer_last_shown_at
--   * decoded_tier, subscription_tier — written by /api/decoded/alpha-upgrade,
--     which STILL runs as the authenticated role. Granted here to keep alpha
--     plan-changes working; the companion migration (…_lock_invite_consent_columns)
--     REVOKEs them at column level once alpha-upgrade is moved to the service role.
--
-- DENIED (omitted from the grant) — every privileged/entitlement/billing/tenancy
-- column, each written only via service-role / SECURITY DEFINER paths, so denying
-- the client roles is zero-breakage:
--   role, is_admin              → /api/admin/update-role (service) + trg_sync_is_admin
--   beta_access, beta_access_granted_at → beta-survey (service admin)
--   beta_code_id                → redeem_beta_code SECURITY DEFINER RPC
--   stripe_customer_id, stripe_subscription_id → /api/decoded/webhook (service)
--   signup_brand                → /app/auth/callback (service admin)
--   org_id, contact_id          → back-office / no client write path
--   daily_message_count, daily_message_reset_at → rate-limit counters, must be
--                                 server-authoritative (a client that resets its
--                                 own counter defeats the limiter)
--   id, created_at              → identity/audit columns, never client-writable
--
-- anon gets NO grant: the RLS policy needs auth.uid() = id, which anon can never
-- satisfy, so anon has no legitimate UPDATE on this table at all.
--
-- REVERSIBLE: GRANT UPDATE ON public.users TO authenticated to restore prior state.

REVOKE UPDATE ON public.users FROM anon, authenticated;

GRANT UPDATE (
  email,
  name,
  linkedin_url,
  website_url,
  telegram_chat_id,
  timezone,
  preferred_channel,
  morning_briefing_time,
  ai_tools,
  updated_at,
  disclaimer_last_shown_at,
  age,
  gender,
  occupation,
  relationship_status,
  has_children,
  more_info,
  decoded_tier,
  subscription_tier
) ON public.users TO authenticated;

-- Defense in depth: the self-update policy had WITH CHECK NULL, so the NEW row
-- was never re-validated. Require the post-update row to still belong to the
-- caller (a profile UPDATE never changes id, so legit self-edits pass unchanged).
ALTER POLICY "Users can update own profile" ON public.users
  WITH CHECK (auth.uid() = id);
