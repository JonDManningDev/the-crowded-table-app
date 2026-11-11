begin;
-- All attached writers move together. Existing history/categories are untouched.
drop trigger log_admin_action on public.tenants;
drop trigger log_admin_action on public.tenant_settings;
drop trigger log_admin_action on public.tenant_website_content_overrides;
drop function app_private.append_admin_action();
drop trigger classify_command on public.tenant_admin_actions;
drop function app_private.classify_command();

-- History audiences are API-owned; runtime SQL retains verified tenant scope.
drop policy history_read on public.tenant_admin_actions;
create policy history_scope_read on public.tenant_admin_actions for select to ct_api
  using (tenant_id=app_private.command_scope());
drop function app_private.can_read_account_action(uuid,uuid);
grant insert(content_key) on public.tenant_admin_actions to ct_api;
grant insert(action_id,category) on app_private.tenant_admin_action_categories to ct_api;
create policy category_scope_insert on app_private.tenant_admin_action_categories for insert to ct_api
  with check (exists(select from public.tenant_admin_actions a
    where a.id=action_id and a.tenant_id=app_private.command_scope()));

-- Stamp provenance without interpreting the semantic action code. Action FK,
-- target/tenant references and field/type validation remain storage authority.
create or replace function app_private.attribute_command() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if session_user='ct_api' then
    new.created_by := app_private.verified_user();
    new.operation_id := nullif(current_setting('ct.operation_id',true),'')::uuid;
    if new.created_by is null or new.operation_id is null
      or new.tenant_id is distinct from app_private.command_scope() then
      raise exception 'invalid command attribution' using errcode='42501';
    end if;
  end if;
  return new;
end $$;

-- Retain action-specific field allowlists/required shape, JSON value types,
-- enum/UUID syntax and bounded reason storage. Reason placement is API semantics.
create or replace function app_private.validate_command_details() returns trigger language plpgsql set search_path='' as $$
declare
  fields text[];
  item record;
begin
  if new.action like '%.%' then
    if new.details <> '{}'::jsonb or (new.reason is not null and length(new.reason)>2000) then raise check_violation; end if;
    return new;
  end if;
  fields := case
    when new.action in ('community_join_requested','community_join_withdrawn','community_reactivation_requested','community_reactivation_withdrawn')
      then array['request_id']
    when new.action in ('community_approved','community_reactivated') then array['after_standing','request_id']
    when new.action in ('community_deactivated','community_suspended','community_removed','community_restriction_cleared')
      then array['before_standing','after_standing','before_restricted','after_restricted','request_id']
    when new.action='staff_created' then array['after_status']
    when new.action in ('staff_paused','staff_resumed','staff_revoked') then array['before_status','after_status']
    when new.action='staff_reappointed' then array['before_status','after_status','permissions']
    when new.action='staff_permissions_changed' then array['permissions']
    when new.action='community_permissions_changed' then array['before','after']
  end;
  if fields is null or jsonb_typeof(new.details)<>'object' or new.details-fields <> '{}'::jsonb
    or (new.reason is not null and length(new.reason)>2000) then raise check_violation; end if;
  if new.action in ('community_approved','community_reactivated') then
    if not new.details ?| fields then raise check_violation; end if;
  elsif new.action in ('community_deactivated','community_suspended','community_removed','community_restriction_cleared') then
    if not new.details ?& array['before_standing','after_standing','before_restricted','after_restricted'] then raise check_violation; end if;
  elsif not new.details ?& fields then raise check_violation;
  end if;
  for item in select * from jsonb_each(new.details) loop
    case item.key
      when 'before_standing','after_standing' then
        if item.value not in ('"pending"','"approved"','"suspended"','"inactive"') then raise check_violation; end if;
      when 'before_status','after_status' then
        if item.value not in ('"active"','"paused"','"revoked"') then raise check_violation; end if;
      when 'before_restricted','after_restricted','before','after' then
        if jsonb_typeof(item.value)<>'boolean' then raise check_violation; end if;
      when 'request_id' then
        if jsonb_typeof(item.value)<>'string' then raise check_violation; end if;
        perform (new.details->>'request_id')::uuid;
      when 'permissions' then
        if jsonb_typeof(item.value)<>'object' or item.value-array['can_approve_users','can_grant_staff','can_modify_content','can_discipline_users','can_discipline_staff','can_manage_community_activities','can_manage_official_activities','can_manage_community_permissions','can_see_private_events','can_manage_settings','can_moderate_all_chats','can_audit_community_accounts','can_audit_staff_accounts'] <> '{}'::jsonb
          or exists (select from jsonb_each(item.value) p where jsonb_typeof(p.value)<>'object'
            or p.value-array['before','after'] <> '{}'::jsonb or jsonb_typeof(p.value->'before') is distinct from 'boolean'
            or jsonb_typeof(p.value->'after') is distinct from 'boolean') then raise check_violation; end if;
    end case;
  end loop;
  return new;
end $$;

notify pgrst,'reload schema';
commit;
