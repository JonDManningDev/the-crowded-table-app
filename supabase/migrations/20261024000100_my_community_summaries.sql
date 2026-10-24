begin;

-- A restricted projection: base tenants RLS remains owner-only, including audit IDs.
-- Definer view deliberately bypasses base RLS; every join and visibility predicate
-- below is bound to the verified caller, never to caller-supplied user IDs.
create view public.my_community_summaries
with (security_barrier = true, security_invoker = false) as
select t.id, t.name, t.city, t.state_province, t.country_code,
       t.operational_status, t.created_at,
       coalesce(s.status = 'active' and s.role = 'owner', false) as is_owned,
       coalesce(s.status = 'active', false) as is_managed,
       coalesce(c.standing in ('pending','approved','suspended'), false) as is_member
from public.tenants t
cross join (select app_private.verified_user() as user_id) actor
left join public.community_accounts c on c.tenant_id = t.id and c.user_id = actor.user_id
left join public.tenant_staff_assignments s on s.tenant_id = t.id and s.user_id = actor.user_id
where actor.user_id is not null
  and c.standing is distinct from 'removed'
  and (s.status = 'active' or c.standing in ('pending','approved','suspended'));
alter view public.my_community_summaries owner to postgres;
revoke all on public.my_community_summaries from public, anon, authenticated;
grant select on public.my_community_summaries to authenticated;

-- Reading one's retained relationship does not confer participation/management.
alter policy self_community on public.community_accounts
  using (user_id = (select app_private.verified_user()));
alter policy self_or_owner_staff on public.tenant_staff_assignments
  using (app_private.is_owner(tenant_id) or user_id = (select app_private.verified_user()));

commit;
