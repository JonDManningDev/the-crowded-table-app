begin;

-- Check the protected owner assignment and its account together. The definer
-- avoids recursive community_accounts RLS and returns only a caller-bound fact.
create function app_private.is_approved_owner(p_tenant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_staff_assignments s
    join public.community_accounts c using (tenant_id, user_id)
    where s.tenant_id = p_tenant and s.user_id = app_private.verified_user()
      and s.role = 'owner' and s.status = 'active' and c.standing = 'approved'
  )
$$;
revoke all on function app_private.is_approved_owner(uuid) from public, anon, authenticated, service_role;
grant execute on function app_private.is_approved_owner(uuid), app_private.active_tenant(uuid)
  to authenticated, ct_api;

-- Independent restrictive guards survive later additions of permissive read
-- policies. The mixed legacy account row still contains a self-only preference.
create policy account_archive_boundary on public.community_accounts
  as restrictive for select using (app_private.active_tenant(tenant_id) or app_private.is_approved_owner(tenant_id));
create policy profile_archive_boundary on public.community_account_profiles
  as restrictive for select using (app_private.active_tenant(tenant_id) or app_private.is_approved_owner(tenant_id));

-- Curated profile fields all share an audience. Unlike the mixed account row,
-- the whole archived profile may be inspected by the community's approved owner.
create policy archived_owner_profile on public.community_account_profiles for select to authenticated
  using (not app_private.active_tenant(tenant_id) and app_private.is_approved_owner(tenant_id));
commit;
