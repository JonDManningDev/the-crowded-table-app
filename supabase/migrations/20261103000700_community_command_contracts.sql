begin;
-- A caller may read their retained preferences while inactive, but may edit
-- them only during onboarding or approved membership in an active community.
drop policy own_preferences on public.community_account_preferences;
create policy private_preference_read on public.community_account_preferences for select to authenticated
  using (user_id=app_private.verified_user() and
    (app_private.active_tenant(tenant_id) or app_private.is_approved_owner(tenant_id)));
create policy private_preference_edit on public.community_account_preferences for update to authenticated
  using (user_id=app_private.verified_user() and app_private.active_tenant(tenant_id) and exists (
    select from public.community_accounts c where (c.tenant_id,c.user_id)=(community_account_preferences.tenant_id,community_account_preferences.user_id)
    and c.standing in ('pending','approved')))
  with check (user_id=app_private.verified_user() and app_private.active_tenant(tenant_id));

-- Reject uninterpreted JSON and keep private discipline text out of linked
-- staff events. Legacy rows retain their original evidence.
create function app_private.validate_command_details() returns trigger language plpgsql set search_path='' as $$
declare
  fields text[];
  item record;
begin
  if new.action like '%.%' then
    if new.details <> '{}'::jsonb or new.reason is not null then raise check_violation; end if;
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
  end;
  if fields is null or jsonb_typeof(new.details)<>'object' or new.details-fields <> '{}'::jsonb
    or (new.reason is not null and (new.action not in ('community_suspended','community_removed','community_restriction_cleared','staff_revoked')
      or length(new.reason)>2000)) then raise check_violation; end if;
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
      when 'before_restricted','after_restricted' then
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
create trigger validate_details before insert on public.tenant_admin_actions for each row execute function app_private.validate_command_details();
alter table app_private.account_action_types enable row level security;
revoke all on app_private.account_action_types from public,anon,authenticated,service_role,ct_api;
commit;
