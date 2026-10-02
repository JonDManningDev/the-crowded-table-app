begin;

-- These read helpers consult authoritative Auth state, not user-editable metadata.
create function app_private.verified_user() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from auth.users where id = auth.uid() and email_confirmed_at is not null
    and email is not null and not coalesce(is_anonymous,false)
    and (banned_until is null or banned_until <= now())
$$;

create function app_private.is_owner(p_tenant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tenant_staff_assignments
    where tenant_id = p_tenant and user_id = app_private.verified_user() and role = 'owner' and status = 'active')
$$;

create function app_private.has_permission(p_tenant uuid,p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tenant_staff_assignments s join public.tenants t on t.id = s.tenant_id
    where s.tenant_id = p_tenant and s.user_id = app_private.verified_user() and s.status = 'active'
      and t.operational_status = 'active' and case p_permission
        when 'approve' then s.can_approve_users when 'create_admin' then s.can_create_admin else false end)
$$;

create function app_private.active_tenant(p_tenant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tenants where id = p_tenant and operational_status = 'active')
$$;

-- All tenant mutations acquire this lock first. Permission checks occur after it,
-- serializing archive, setting changes, approvals, assignment and permission edits.
create function app_private.lock_tenant(p_tenant uuid,p_owner_only boolean default false,p_allow_archived boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_status text;
begin
  v_actor := app_private.verified_user();
  if v_actor is null then raise exception 'verified_account_required' using errcode = '42501'; end if;
  select operational_status into v_status from public.tenants where id = p_tenant for update;
  if not found then raise exception 'tenant_unavailable' using errcode = '42501'; end if;
  if p_owner_only and not app_private.is_owner(p_tenant) then
    raise exception 'owner_required' using errcode = '42501';
  end if;
  if v_status <> 'active' and not (p_allow_archived and app_private.is_owner(p_tenant)) then
    raise exception 'tenant_unavailable' using errcode = '42501';
  end if;
  return v_actor;
end $$;

create policy self_account on public.user_accounts for select to authenticated
  using (user_id = (select app_private.verified_user()));
create policy owner_tenant on public.tenants for select to authenticated
  using (app_private.is_owner(id));
create policy owner_settings on public.tenant_settings for select to authenticated
  using (app_private.is_owner(tenant_id));
create policy self_or_owner_staff on public.tenant_staff_assignments for select to authenticated
  using (app_private.is_owner(tenant_id) or
    (user_id = (select app_private.verified_user()) and app_private.active_tenant(tenant_id)));
create policy self_community on public.community_accounts for select to authenticated
  using (user_id = (select app_private.verified_user()) and app_private.active_tenant(tenant_id));
create policy self_profile on public.community_account_profiles for select to authenticated
  using (user_id = (select app_private.verified_user()) and app_private.active_tenant(tenant_id)
    and exists (select 1 from public.community_accounts c where c.tenant_id = community_account_profiles.tenant_id
      and c.user_id = community_account_profiles.user_id and c.standing in ('pending','approved')));
-- Current content keys are for a private page. Participant reads await entitlements.
create policy owner_copy on public.tenant_website_content_overrides for select to authenticated
  using (app_private.is_owner(tenant_id));
create policy owner_audit on public.tenant_admin_actions for select to authenticated
  using (app_private.is_owner(tenant_id));

create function public.lookup_tenant(p_slug text)
returns table(id uuid,slug text,name text,country_code text,state_province text,city text,timezone text)
language sql stable security definer set search_path = '' as $$
  select t.id,t.slug,t.name,t.country_code,t.state_province,t.city,t.timezone
    from public.tenants t where t.slug = p_slug and t.operational_status = 'active'
$$;

create function public.create_tenant(p_slug text,p_name text,p_country_code text,p_timezone text,
  p_state_province text default null,p_city text default null,p_join_community boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := app_private.verified_user(); v_id uuid;
begin
  if v_actor is null then raise exception 'verified_account_required' using errcode = '42501'; end if;
  insert into public.tenants(slug,name,country_code,timezone,state_province,city)
    values (p_slug,btrim(p_name),p_country_code,p_timezone,nullif(btrim(p_state_province),''),nullif(btrim(p_city),'')) returning id into v_id;
  insert into public.tenant_settings(tenant_id) values (v_id);
  insert into public.tenant_staff_assignments(tenant_id,user_id,role) values (v_id,v_actor,'owner');
  if p_join_community then
    insert into public.community_accounts(tenant_id,user_id,standing) values (v_id,v_actor,'approved');
  end if;
  return v_id;
end $$;

create function public.update_tenant_details(p_tenant_id uuid,p_name text,p_country_code text,p_timezone text,
  p_state_province text default null,p_city text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.lock_tenant(p_tenant_id,true,true);
  update public.tenants set name = btrim(p_name),country_code = p_country_code,timezone = p_timezone,
    state_province = nullif(btrim(p_state_province),''),city = nullif(btrim(p_city),'') where id = p_tenant_id;
end $$;

create function public.set_tenant_archived(p_tenant_id uuid,p_archived boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.lock_tenant(p_tenant_id,true,true);
  if p_archived is null then raise exception 'archive_flag_required' using errcode = '22023'; end if;
  update public.tenants set operational_status = case when p_archived then 'archived' else 'active' end
    where id = p_tenant_id and operational_status <> case when p_archived then 'archived' else 'active' end;
end $$;

create function public.set_auto_approve_users(p_tenant_id uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.lock_tenant(p_tenant_id,true,true);
  update public.tenant_settings set auto_approve_users = p_enabled where tenant_id = p_tenant_id;
end $$;

create function public.join_community(p_tenant_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_standing text;
begin
  v_actor := app_private.lock_tenant(p_tenant_id);
  insert into public.community_accounts(tenant_id,user_id,standing)
    select p_tenant_id,v_actor,case when auto_approve_users then 'approved' else 'pending' end
    from public.tenant_settings where tenant_id = p_tenant_id
    on conflict (tenant_id,user_id) do nothing;
  select standing into v_standing from public.community_accounts where tenant_id = p_tenant_id and user_id = v_actor;
  return v_standing;
end $$;

create function public.approve_community_account(p_tenant_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.lock_tenant(p_tenant_id);
  if not app_private.has_permission(p_tenant_id,'approve') then
    raise exception 'approval_permission_required' using errcode = '42501';
  end if;
  update public.community_accounts set standing = 'approved'
    where tenant_id = p_tenant_id and user_id = p_user_id and standing = 'pending';
  if not found then raise exception 'pending_account_required' using errcode = '22023'; end if;
end $$;

create function public.save_community_profile(p_tenant_id uuid,p_display_name text,p_bio text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid;
begin
  v_actor := app_private.lock_tenant(p_tenant_id);
  if not exists (select 1 from public.community_accounts where tenant_id = p_tenant_id
    and user_id = v_actor and standing in ('pending','approved')) then
    raise exception 'community_account_required' using errcode = '42501';
  end if;
  insert into public.community_account_profiles(tenant_id,user_id,display_name,bio)
    values (p_tenant_id,v_actor,btrim(p_display_name),nullif(btrim(p_bio),''))
    on conflict (tenant_id,user_id) do update set display_name = excluded.display_name,bio = excluded.bio;
end $$;

create function public.list_admin_candidates(p_tenant_id uuid)
returns table(user_id uuid,standing text,staff_status text,staff_role text,display_name text)
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.lock_tenant(p_tenant_id);
  if not app_private.has_permission(p_tenant_id,'create_admin') then
    raise exception 'admin_creation_permission_required' using errcode = '42501';
  end if;
  return query select c.user_id,c.standing,s.status,s.role,p.display_name
    from public.community_accounts c join auth.users u on u.id = c.user_id
    left join public.tenant_staff_assignments s on s.tenant_id = c.tenant_id and s.user_id = c.user_id
    left join public.community_account_profiles p on p.tenant_id = c.tenant_id and p.user_id = c.user_id
    where c.tenant_id = p_tenant_id and u.email_confirmed_at is not null and u.email is not null
      and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until <= now())
    order by c.user_id;
end $$;

create function public.list_pending_community_accounts(p_tenant_id uuid)
returns table(user_id uuid,display_name text)
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.lock_tenant(p_tenant_id);
  if not app_private.has_permission(p_tenant_id,'approve') then
    raise exception 'approval_permission_required' using errcode = '42501';
  end if;
  return query select c.user_id,p.display_name from public.community_accounts c
    left join public.community_account_profiles p on p.tenant_id = c.tenant_id and p.user_id = c.user_id
    where c.tenant_id = p_tenant_id and c.standing = 'pending' order by c.created_at,c.user_id;
end $$;

create function public.create_tenant_admin(p_tenant_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.lock_tenant(p_tenant_id);
  if not app_private.has_permission(p_tenant_id,'create_admin') then
    raise exception 'admin_creation_permission_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.community_accounts c join auth.users u on u.id = c.user_id
    where c.tenant_id = p_tenant_id and c.user_id = p_user_id and u.email_confirmed_at is not null
      and u.email is not null and not coalesce(u.is_anonymous,false)
      and (u.banned_until is null or u.banned_until <= now())) then
    raise exception 'verified_community_account_required' using errcode = '22023';
  end if;
  insert into public.tenant_staff_assignments(tenant_id,user_id,role) values (p_tenant_id,p_user_id,'admin');
end $$;

create function public.set_admin_permissions(p_tenant_id uuid,p_user_id uuid,p_can_approve_users boolean,p_can_create_admin boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.lock_tenant(p_tenant_id,true,true);
  update public.tenant_staff_assignments set can_approve_users = p_can_approve_users,can_create_admin = p_can_create_admin
    where tenant_id = p_tenant_id and user_id = p_user_id and role = 'admin' and status = 'active';
  if not found then raise exception 'active_admin_required' using errcode = '22023'; end if;
end $$;

create function public.set_website_content_override(p_tenant_id uuid,p_content_key text,p_text_value text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.lock_tenant(p_tenant_id,true,true);
  -- Validate even resets: unknown keys must not silently succeed.
  if p_content_key is null or p_content_key not in ('community.hero.eyebrow','community.hero.heading','community.hero.description',
    'community.welcome.eyebrow','community.welcome.heading','community.welcome.body','community.welcome.emphasis') then
    raise exception 'unsupported_content_key' using errcode = '22023';
  end if;
  if p_text_value is null then
    delete from public.tenant_website_content_overrides where tenant_id = p_tenant_id and content_key = p_content_key;
  else
    insert into public.tenant_website_content_overrides(tenant_id,content_key,text_value)
      values (p_tenant_id,p_content_key,p_text_value)
      on conflict (tenant_id,content_key) do update set text_value = excluded.text_value;
  end if;
end $$;

-- Deny implicit PUBLIC execution, including on helpers created in this migration.
revoke all on all functions in schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.verified_user(),app_private.is_owner(uuid),app_private.active_tenant(uuid) to authenticated;
-- Explicit allowlist: do not change unrelated functions in an existing project.
do $migration$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(array[
      'lookup_tenant','create_tenant','update_tenant_details','set_tenant_archived','set_auto_approve_users',
      'join_community','approve_community_account','save_community_profile','list_admin_candidates',
      'list_pending_community_accounts','create_tenant_admin','set_admin_permissions','set_website_content_override']) loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $migration$;
grant execute on function public.lookup_tenant(text) to anon;
commit;
