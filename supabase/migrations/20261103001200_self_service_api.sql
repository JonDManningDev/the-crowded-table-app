begin;
drop view public.my_community_summaries;

-- Revoke table and column grants: a table-level revoke alone leaves narrow DML grants.
revoke all on public.user_account_profiles,public.community_account_profiles,public.community_account_preferences
  from public,anon,authenticated,service_role;
revoke insert(display_name,bio),update(display_name,bio) on public.user_account_profiles from public,anon,authenticated,service_role;
revoke update(display_name,bio) on public.community_account_profiles from public,anon,authenticated,service_role;
revoke select(tenant_id,user_id,show_global_profile,allow_direct_messages,allow_private_invitations),
  update(show_global_profile,allow_direct_messages,allow_private_invitations) on public.community_account_preferences
  from public,anon,authenticated,service_role;
drop policy own_profile_read on public.user_account_profiles;
drop policy own_profile_insert on public.user_account_profiles;
drop policy own_profile_update on public.user_account_profiles;
drop policy self_profile on public.community_account_profiles;
drop policy own_community_profile_update on public.community_account_profiles;
drop policy private_preference_read on public.community_account_preferences;
drop policy private_preference_edit on public.community_account_preferences;

grant select(user_id,display_name,bio,created_at,updated_at,created_by,updated_by),
  insert(display_name,bio),update(display_name,bio) on public.user_account_profiles to ct_api;
create policy api_self_profile on public.user_account_profiles for all to ct_api
  using (user_id=(select app_private.verified_user())) with check (user_id=(select app_private.verified_user()));

-- Commands still establish other accounts' rows, but receive no blanket edit
-- or private-preference read authority from their tenant selector.
drop policy command_scope on public.community_account_profiles;
create policy command_insert on public.community_account_profiles for insert to ct_api
  with check (tenant_id=app_private.command_scope());
grant update(display_name,bio) on public.community_account_profiles to ct_api;
create policy api_own_profile_edit on public.community_account_profiles for update to ct_api
  using (user_id=app_private.verified_user() and app_private.active_tenant(tenant_id) and exists(
    select from public.community_accounts c where (c.tenant_id,c.user_id)=(community_account_profiles.tenant_id,community_account_profiles.user_id)
    and c.standing in ('pending','approved','suspended')))
  with check (user_id=app_private.verified_user());

drop policy command_scope on public.community_account_preferences;
create policy command_insert on public.community_account_preferences for insert to ct_api
  with check (tenant_id=app_private.command_scope());
grant select(tenant_id,user_id,show_global_profile,allow_direct_messages,allow_private_invitations),
  update(show_global_profile,allow_direct_messages,allow_private_invitations) on public.community_account_preferences to ct_api;
create policy api_own_preferences_read on public.community_account_preferences for select to ct_api
  using (user_id=app_private.verified_user());
create policy preference_archive_boundary on public.community_account_preferences as restrictive for select
  using (app_private.active_tenant(tenant_id) or app_private.is_approved_owner(tenant_id));
create policy api_own_preferences_edit on public.community_account_preferences for update to ct_api
  using (user_id=app_private.verified_user() and app_private.active_tenant(tenant_id) and exists(
    select from public.community_accounts c where (c.tenant_id,c.user_id)=(community_account_preferences.tenant_id,community_account_preferences.user_id)
    and c.standing in ('pending','approved')))
  with check (user_id=app_private.verified_user());

-- Cards intentionally survive archive. Only these own-relationship facts bypass
-- account archive RLS; no profile, preference or other user's identity is returned.
create function app_private.my_community_relationships()
returns table(tenant_id uuid,is_owned boolean,is_managed boolean,is_member boolean)
language sql stable security definer set search_path='' as $$
  select c.tenant_id,
    coalesce(s.status='active' and s.role='owner' and c.standing='approved',false),
    coalesce(s.status='active' and c.standing='approved',false),
    c.standing in ('pending','approved','suspended')
  from public.community_accounts c left join public.tenant_staff_assignments s using(tenant_id,user_id)
  where c.user_id=app_private.verified_user() and c.standing in ('pending','approved','suspended')
$$;
revoke all on function app_private.my_community_relationships() from public,anon,authenticated,service_role;
grant execute on function app_private.my_community_relationships() to ct_api;
grant select(name,city,state_province,country_code,created_at) on public.tenants to ct_api;
create policy api_own_summary on public.tenants for select to ct_api
  using (id in (select tenant_id from app_private.my_community_relationships()));
notify pgrst,'reload schema';
commit;
