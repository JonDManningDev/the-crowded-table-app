-- The persistent API owns caller audiences. These policies expose only the
-- facts already SELECT-granted to ct_api; the seven restrictive archive fences,
-- grants, storage safeguards and external role privileges remain unchanged.
begin;

-- Separate the six tenant-scoped mixed policies into operation-specific writes.
-- INSERT/UPDATE predicates are the original predicates. DELETE is retained only
-- on the two relations where the runtime has that privilege.
do $migration$
declare relation text; key_column text;
begin
  foreach relation in array array[
    'app_private.community_account_requests', 'public.community_accounts',
    'public.tenant_settings', 'public.tenant_staff_assignments',
    'public.tenant_website_content_overrides', 'public.tenants'
  ] loop
    key_column := case when relation='public.tenants' then 'id' else 'tenant_id' end;
    execute format('drop policy command_scope on %s', relation);
    execute format('create policy command_insert on %s for insert to ct_api with check (%I=app_private.command_scope())', relation, key_column);
    if relation <> 'app_private.community_account_requests' then
      execute format('create policy command_update on %s for update to ct_api using (%I=app_private.command_scope()) with check (%I=app_private.command_scope())', relation, key_column, key_column);
    end if;
    if relation in ('app_private.community_account_requests', 'public.tenant_website_content_overrides') then
      execute format('create policy command_delete on %s for delete to ct_api using (%I=app_private.command_scope())', relation, key_column);
    end if;
  end loop;
end $migration$;

-- The seventh mixed policy is caller-only global-profile storage.
drop policy api_self_profile on public.user_account_profiles;
create policy api_self_profile_insert on public.user_account_profiles for insert to ct_api
  with check (user_id=(select app_private.verified_user()));
create policy api_self_profile_update on public.user_account_profiles for update to ct_api
  using (user_id=(select app_private.verified_user()))
  with check (user_id=(select app_private.verified_user()));

drop policy history_category_read on app_private.tenant_admin_action_categories;
drop policy participant_scope_read on public.community_account_permissions;
drop policy api_own_preferences_read on public.community_account_preferences;
drop policy command_sharing_read on public.community_account_preferences;
drop policy profile_target_sharing_facts on public.community_account_preferences;
drop policy api_community_profile_read on public.community_account_profiles;
drop policy public_read_scope on public.community_account_profiles;
drop policy api_community_account_facts on public.community_accounts;
drop policy public_read_scope on public.community_accounts;
drop policy history_scope_read on public.tenant_admin_actions;
drop policy public_read_scope on public.tenant_settings;
drop policy public_read_scope on public.tenant_staff_assignments;
drop policy public_read_scope on public.tenant_website_content_overrides;
drop policy api_own_summary on public.tenants;
drop policy public_exact_slug on public.tenants;
drop policy related_block_facts on public.user_account_blocks;
drop policy api_global_profile_facts on public.user_account_profiles;
drop policy api_account_facts on public.user_accounts;

do $migration$
declare relation text;
begin
  foreach relation in array array[
    'app_private.community_account_requests', 'app_private.tenant_admin_action_categories',
    'public.community_account_permissions', 'public.community_account_preferences',
    'public.community_account_profiles', 'public.community_accounts',
    'public.tenant_admin_actions', 'public.tenant_settings',
    'public.tenant_staff_assignments', 'public.tenant_website_content_overrides',
    'public.tenants', 'public.user_account_blocks',
    'public.user_account_profiles', 'public.user_accounts'
  ] loop
    execute format('create policy api_runtime_read on %s for select to ct_api using (true)', relation);
  end loop;
end $migration$;

-- Locking SELECTs need UPDATE visibility too. This grants locking, never a
-- successful new row: actual UPDATEs must still satisfy command_update's scope
-- check. The runtime cannot UPDATE id/slug, and protect_invariants independently
-- rejects identity changes, so this cannot move a foreign old row into scope.
drop policy public_root_lock on public.tenants;
create policy api_root_lock on public.tenants for update to ct_api using (true) with check (false);
commit;
