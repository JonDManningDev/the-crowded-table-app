begin;
-- Route the newly admitted archived-owner read through the persistent API.
-- Existing direct edits still need their narrow, active-community readback.
drop policy archived_owner_profile on public.community_account_profiles;
grant select(tenant_id, user_id, standing) on public.community_accounts to ct_api;
grant select(tenant_id, user_id, display_name, bio, created_at, updated_at, created_by, updated_by)
  on public.community_account_profiles to ct_api;
create policy api_community_account_facts on public.community_accounts for select to ct_api
  using ((select app_private.verified_user()) is not null);
create policy api_community_profile_read on public.community_account_profiles for select to ct_api
  using ((select app_private.verified_user()) is not null);
-- Both permissive policies still intersect the restrictive archive policies.
commit;
