-- Display name of the OTHER participant in an engagement the caller belongs
-- to. SECURITY DEFINER because users-table RLS is self-only (the dashboard
-- showed "your partner" instead of the partner's name); membership is
-- verified explicitly. STABLE + parameterized; returns null for non-members.
create or replace function public.get_engagement_partner_name(p_engagement_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(u.name, nullif(split_part(p.invited_email, '@', 1), ''))
  from participant p
  left join users u on u.id = p.user_id
  where p.engagement_id = p_engagement_id
    and (p.user_id is distinct from auth.uid())
    and exists (
      select 1 from participant me
      where me.engagement_id = p_engagement_id and me.user_id = auth.uid()
    )
  limit 1;
$$;

-- SECURITY DEFINER default PUBLIC grant is the leak vector — lock it down,
-- then grant the one audience that needs it (client RPC for logged-in users).
revoke all on function public.get_engagement_partner_name(uuid) from public, anon;
grant execute on function public.get_engagement_partner_name(uuid) to authenticated;
