begin;
drop function public.lookup_tenant(text);
revoke all on public.tenants,public.tenant_settings,public.tenant_website_content_overrides from public,anon,authenticated,service_role;
revoke update(name,country_code,timezone,state_province,city) on public.tenants from public,anon,authenticated,service_role;
revoke insert(tenant_id,content_key,text_value),update(tenant_id,content_key,text_value)
  on public.tenant_website_content_overrides from public,anon,authenticated,service_role;
drop policy owner_tenant on public.tenants;
drop policy owner_details_update on public.tenants;
drop policy owner_settings on public.tenant_settings;
drop policy content_editor_read on public.tenant_website_content_overrides;
drop policy content_editor_insert on public.tenant_website_content_overrides;
drop policy content_editor_update on public.tenant_website_content_overrides;
drop policy content_editor_delete on public.tenant_website_content_overrides;
drop function app_private.can_modify_content(uuid);

create function app_private.can_edit_configuration(p_tenant uuid,p_kind text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select from public.tenant_staff_assignments s
    join public.community_accounts c using(tenant_id,user_id) join public.tenants t on t.id=s.tenant_id
    where s.tenant_id=p_tenant and s.user_id=app_private.verified_user() and s.status='active' and c.standing='approved'
      and (s.role='owner' or t.operational_status='active')
      and case p_kind when 'details' then s.role='owner' when 'settings' then s.can_manage_settings
        when 'copy' then s.can_modify_content else false end)
$$;
revoke all on function app_private.can_edit_configuration(uuid,text) from public,anon,authenticated,service_role;
grant execute on function app_private.can_edit_configuration(uuid,text) to ct_api;
grant select(slug,timezone,created_at,updated_at,created_by,updated_by),update(name,country_code,state_province,city,timezone)
  on public.tenants to ct_api;
-- Non-owners also lock the tenant FOR UPDATE for membership commands. An UPDATE
-- RLS owner predicate would block those row locks; enforce changed values here.
create function app_private.guard_configuration_details() returns trigger language plpgsql set search_path='' as $$
begin
  if session_user='ct_api' and (new.name,new.country_code,new.state_province,new.city,new.timezone,new.operational_status)
    is distinct from (old.name,old.country_code,old.state_province,old.city,old.timezone,old.operational_status)
    and not app_private.can_edit_configuration(old.id,'details') then
    raise exception 'configuration_owner_required' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function app_private.guard_configuration_details() from public,anon,authenticated,service_role,ct_api;
create trigger a_configuration before update on public.tenants for each row execute function app_private.guard_configuration_details();

grant select(pause_community_events,allow_public_chat_visibility,allow_public_activity_visibility,allow_public_directory_visibility,
  created_at,updated_at,created_by,updated_by),update(pause_community_events,allow_public_chat_visibility,allow_public_activity_visibility,
  allow_public_directory_visibility) on public.tenant_settings to ct_api;
-- The existing scope policy also serves atomic creation/join. Its update branch
-- must additionally require current settings authority, including archived owner.
create policy configuration_settings_edit on public.tenant_settings as restrictive for update to ct_api
  using (app_private.can_edit_configuration(tenant_id,'settings')) with check (app_private.can_edit_configuration(tenant_id,'settings'));
create policy settings_archive_boundary on public.tenant_settings as restrictive for select to ct_api
  using (app_private.active_tenant(tenant_id) or app_private.is_approved_owner(tenant_id));

grant select(tenant_id,content_key,text_value,created_at,updated_at,created_by,updated_by),
  insert(tenant_id,content_key,text_value),update(text_value),delete on public.tenant_website_content_overrides to ct_api;
create policy api_copy_read on public.tenant_website_content_overrides for select to ct_api using (
  tenant_id=app_private.command_scope() and (app_private.can_edit_configuration(tenant_id,'copy') or
    (app_private.active_tenant(tenant_id) and exists(select from public.community_accounts c where
      (c.tenant_id,c.user_id)=(tenant_website_content_overrides.tenant_id,app_private.verified_user()) and c.standing in ('approved','suspended')))));
create policy api_copy_insert on public.tenant_website_content_overrides for insert to ct_api
  with check (tenant_id=app_private.command_scope() and app_private.can_edit_configuration(tenant_id,'copy'));
create policy api_copy_update on public.tenant_website_content_overrides for update to ct_api
  using (tenant_id=app_private.command_scope() and app_private.can_edit_configuration(tenant_id,'copy'))
  with check (tenant_id=app_private.command_scope() and app_private.can_edit_configuration(tenant_id,'copy'));
create policy api_copy_delete on public.tenant_website_content_overrides for delete to ct_api
  using (tenant_id=app_private.command_scope() and app_private.can_edit_configuration(tenant_id,'copy'));
create policy copy_archive_boundary on public.tenant_website_content_overrides as restrictive for select to ct_api
  using (app_private.active_tenant(tenant_id) or app_private.is_approved_owner(tenant_id));

-- Deliberately public facts, obtained only by one exact active slug. The private
-- accessor returns no raw pause flag, actor, timestamp, or implicit relationships.
create function app_private.community_landing(p_slug text)
returns table(id uuid,slug text,name text,country_code text,state_province text,city text,timezone text,
  auto_approve_users boolean,allow_public_chat_visibility boolean,allow_public_activity_visibility boolean,
  allow_public_directory_visibility boolean,overrides jsonb)
language sql stable security definer set search_path='' as $$
  select t.id,t.slug,t.name,t.country_code,t.state_province,t.city,t.timezone,s.auto_approve_users,
    s.allow_public_chat_visibility,s.allow_public_activity_visibility,s.allow_public_directory_visibility,
    coalesce((select jsonb_agg(jsonb_build_object('tenant_id',o.tenant_id,'content_key',o.content_key,'text_value',o.text_value) order by o.content_key)
      from public.tenant_website_content_overrides o where o.tenant_id=t.id and o.content_key in (
        'community.hero.eyebrow','community.hero.heading','community.hero.description','community.welcome.eyebrow',
        'community.welcome.heading','community.welcome.body','community.welcome.emphasis')),'[]'::jsonb)
  from public.tenants t join public.tenant_settings s on s.tenant_id=t.id
  where t.slug=p_slug and t.operational_status='active'
$$;
revoke all on function app_private.community_landing(text) from public,anon,authenticated,service_role;
grant execute on function app_private.community_landing(text) to ct_api;
notify pgrst,'reload schema';
commit;
