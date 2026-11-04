begin;
revoke all on public.tenant_staff_assignments,public.community_account_permissions from public,anon,authenticated,service_role;
drop policy self_or_owner_staff on public.tenant_staff_assignments;

create function app_private.can_manage_account_records(p_tenant uuid,p_kind text) returns boolean
language sql stable security definer set search_path='' as $$
  select p_tenant=app_private.command_scope() and exists(
    select from public.tenant_staff_assignments s join public.community_accounts c using(tenant_id,user_id)
    join public.tenants t on t.id=s.tenant_id
    where s.tenant_id=p_tenant and s.user_id=app_private.verified_user() and s.status='active' and c.standing='approved'
      and (s.role='owner' or t.operational_status='active')
      and case p_kind when 'staff' then s.can_grant_staff when 'participant' then s.can_manage_community_permissions else false end)
$$;
revoke all on function app_private.can_manage_account_records(uuid,text) from public,anon,authenticated,service_role;
grant execute on function app_private.can_manage_account_records(uuid,text) to ct_api;

grant select(created_at,updated_at,created_by,updated_by) on public.tenant_staff_assignments to ct_api;
-- Lifecycle commands require scoped target assignments for combined discipline
-- checks. Their full-row HTTP audience remains narrower than runtime command reads.
create policy staff_archive_boundary on public.tenant_staff_assignments as restrictive for select to ct_api
  using (app_private.active_tenant(tenant_id) or app_private.is_approved_owner(tenant_id));

drop policy command_scope on public.community_account_permissions;
create policy command_create on public.community_account_permissions for insert to ct_api
  with check (tenant_id=app_private.command_scope());
create policy participant_read on public.community_account_permissions for select to ct_api
  using (tenant_id=app_private.command_scope() and (
    (user_id=app_private.verified_user() and app_private.active_tenant(tenant_id)) or app_private.can_manage_account_records(tenant_id,'participant')));
create policy participant_edit on public.community_account_permissions for update to ct_api
  using (app_private.can_manage_account_records(tenant_id,'participant'))
  with check (app_private.can_manage_account_records(tenant_id,'participant'));
create policy participant_archive_boundary on public.community_account_permissions as restrictive for select to ct_api
  using (app_private.active_tenant(tenant_id) or app_private.is_approved_owner(tenant_id));
grant select(tenant_id,user_id,can_post_public_events,created_at,updated_at,created_by,updated_by),update(can_post_public_events)
  on public.community_account_permissions to ct_api;
insert into app_private.account_action_types values ('community_permissions_changed','command');

create or replace function app_private.validate_command_details() returns trigger language plpgsql set search_path='' as $$
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
    when new.action='community_permissions_changed' then array['before','after']
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
