begin;

-- Independent edits use RLS at statement time. The retained administrative
-- commands continue to use lock_tenant for their coordinated transitions.
alter table public.tenant_staff_assignments
  add column can_modify_content boolean not null default false;
-- ALTER TABLE holds an exclusive lock until commit; only this migration may
-- backfill the otherwise immutable owners. Audit triggers remain enabled.
alter table public.tenant_staff_assignments disable trigger a_invariants;
set constraints all immediate;
update public.tenant_staff_assignments set can_modify_content = true where role = 'owner';
alter table public.tenant_staff_assignments enable trigger a_invariants;
set constraints all deferred;
alter table public.tenant_staff_assignments drop constraint owner_permissions;
alter table public.tenant_staff_assignments add constraint owner_permissions check
  (role <> 'owner' or (status = 'active' and can_approve_users and can_create_admin and can_modify_content));

create or replace function app_private.protect_invariants() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'tenants' and tg_op <> 'DELETE' then
    if tg_op = 'UPDATE' and (new.id <> old.id or new.slug <> old.slug) then
      raise exception 'tenant_identity_immutable' using errcode = '23514';
    end if;
    if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
      raise exception 'invalid_timezone' using errcode = '23514';
    end if;
  elsif tg_table_name = 'tenant_staff_assignments' then
    if tg_op = 'INSERT' and new.role = 'owner' then
      new.can_approve_users := true;
      new.can_create_admin := true;
      new.can_modify_content := true;
    elsif tg_op <> 'INSERT' then
      if old.role = 'owner' and (tg_op = 'DELETE' or new is distinct from old) then
        raise exception 'owner_assignment_immutable' using errcode = '23514';
      end if;
      if tg_op = 'UPDATE' and (new.tenant_id <> old.tenant_id or new.user_id <> old.user_id or new.role <> old.role) then
        raise exception 'staff_identity_immutable' using errcode = '23514';
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if to_jsonb(new)->'tenant_id' is distinct from to_jsonb(old)->'tenant_id'
       or to_jsonb(new)->'user_id' is distinct from to_jsonb(old)->'user_id'
       or (tg_table_name = 'tenant_website_content_overrides'
         and to_jsonb(new)->'content_key' is distinct from to_jsonb(old)->'content_key') then
      raise exception 'account_identity_immutable' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

-- Preserve RPC normalization for every write path, not just the browser form.
create function app_private.normalize_editable_text() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'tenants' then
    new.name := btrim(new.name);
    new.state_province := nullif(btrim(new.state_province),'');
    new.city := nullif(btrim(new.city),'');
  else
    new.display_name := btrim(new.display_name);
    new.bio := nullif(btrim(new.bio),'');
  end if;
  return new;
end $$;
create trigger b_normalize before insert or update on public.tenants
  for each row execute function app_private.normalize_editable_text();
create trigger b_normalize before insert or update on public.user_account_profiles
  for each row execute function app_private.normalize_editable_text();
create trigger b_normalize before insert or update on public.community_account_profiles
  for each row execute function app_private.normalize_editable_text();
revoke all on function app_private.normalize_editable_text() from public, anon, authenticated;

-- Omit user_id from INSERT/upsert payloads: Auth supplies it and RLS verifies it.
alter table public.user_account_profiles alter column user_id set default auth.uid();
alter table public.community_account_profiles alter column user_id set default auth.uid();
grant insert(display_name,bio), update(display_name,bio) on public.user_account_profiles to authenticated;
create policy own_profile_insert on public.user_account_profiles for insert to authenticated
  with check (user_id = (select app_private.verified_user()));
create policy own_profile_update on public.user_account_profiles for update to authenticated
  using (user_id = (select app_private.verified_user()))
  with check (user_id = (select app_private.verified_user()));

grant update(user_is_discoverable,enable_matchmaking) on public.user_accounts to authenticated;
create policy own_preferences_update on public.user_accounts for update to authenticated
  using (user_id = (select app_private.verified_user()))
  with check (user_id = (select app_private.verified_user()));

-- PostgREST upsert updates the supplied conflict-key columns too. tenant_id may
-- be restated, but the invariant trigger rejects identity changes on UPDATE.
grant insert(tenant_id,display_name,bio), update(tenant_id,display_name,bio)
  on public.community_account_profiles to authenticated;
create policy own_community_profile_insert on public.community_account_profiles for insert to authenticated
  with check (user_id = (select app_private.verified_user()) and app_private.active_tenant(tenant_id)
    and exists (select 1 from public.community_accounts c
      where c.tenant_id = community_account_profiles.tenant_id and c.user_id = community_account_profiles.user_id
        and c.standing in ('pending','approved')));
create policy own_community_profile_update on public.community_account_profiles for update to authenticated
  using (user_id = (select app_private.verified_user()) and app_private.active_tenant(tenant_id)
    and exists (select 1 from public.community_accounts c
      where c.tenant_id = community_account_profiles.tenant_id and c.user_id = community_account_profiles.user_id
        and c.standing in ('pending','approved')))
  with check (user_id = (select app_private.verified_user()) and app_private.active_tenant(tenant_id)
    and exists (select 1 from public.community_accounts c
      where c.tenant_id = community_account_profiles.tenant_id and c.user_id = community_account_profiles.user_id
        and c.standing in ('pending','approved')));

grant update(show_global_profile) on public.community_accounts to authenticated;
create policy own_community_preferences_update on public.community_accounts for update to authenticated
  using (user_id = (select app_private.verified_user()) and app_private.active_tenant(tenant_id)
    and standing in ('pending','approved'))
  with check (user_id = (select app_private.verified_user()) and app_private.active_tenant(tenant_id)
    and standing in ('pending','approved'));

grant update(name,country_code,timezone,state_province,city) on public.tenants to authenticated;
create policy owner_details_update on public.tenants for update to authenticated
  using (app_private.is_owner(id)) with check (app_private.is_owner(id));

create function app_private.can_modify_content(p_tenant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tenant_staff_assignments s join public.tenants t on t.id = s.tenant_id
    where s.tenant_id = p_tenant and s.user_id = app_private.verified_user()
      and s.status = 'active' and s.can_modify_content
      and (s.role = 'owner' or t.operational_status = 'active'))
$$;
revoke all on function app_private.can_modify_content(uuid) from public, anon, authenticated;
grant execute on function app_private.can_modify_content(uuid) to authenticated;
alter policy owner_copy on public.tenant_website_content_overrides
  using (app_private.can_modify_content(tenant_id));
alter policy owner_copy on public.tenant_website_content_overrides rename to content_editor_read;
grant insert(tenant_id,content_key,text_value), update(tenant_id,content_key,text_value), delete
  on public.tenant_website_content_overrides to authenticated;
create policy content_editor_insert on public.tenant_website_content_overrides for insert to authenticated
  with check (app_private.can_modify_content(tenant_id));
create policy content_editor_update on public.tenant_website_content_overrides for update to authenticated
  using (app_private.can_modify_content(tenant_id)) with check (app_private.can_modify_content(tenant_id));
create policy content_editor_delete on public.tenant_website_content_overrides for delete to authenticated
  using (app_private.can_modify_content(tenant_id));

-- One signature: legacy four-argument calls preserve the new flag. Omitted
-- existing flags also remain unchanged, allowing a content-only permission edit.
drop function public.set_admin_permissions(uuid,uuid,boolean,boolean);
create function public.set_admin_permissions(p_tenant_id uuid,p_user_id uuid,
  p_can_approve_users boolean default null,p_can_create_admin boolean default null,
  p_can_modify_content boolean default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.lock_tenant(p_tenant_id,true,true);
  update public.tenant_staff_assignments set
    can_approve_users = coalesce(p_can_approve_users,can_approve_users),
    can_create_admin = coalesce(p_can_create_admin,can_create_admin),
    can_modify_content = coalesce(p_can_modify_content,can_modify_content)
    where tenant_id = p_tenant_id and user_id = p_user_id and role = 'admin' and status = 'active';
  if not found then raise exception 'active_admin_required' using errcode = '22023'; end if;
end $$;
revoke all on function public.set_admin_permissions(uuid,uuid,boolean,boolean,boolean) from public, anon, authenticated;
grant execute on function public.set_admin_permissions(uuid,uuid,boolean,boolean,boolean) to authenticated;

-- Deliberately definer projections: base tables stay private. Authorization is
-- in the view itself, bound to the verified caller, even without a tenant filter.
create view public.tenant_admin_candidates with (security_barrier = true, security_invoker = false) as
select c.tenant_id,c.user_id,c.standing,s.status as staff_status,s.role as staff_role,p.display_name
from public.community_accounts c
join public.tenants t on t.id = c.tenant_id
join auth.users u on u.id = c.user_id
left join public.tenant_staff_assignments s on s.tenant_id = c.tenant_id and s.user_id = c.user_id
left join public.community_account_profiles p on p.tenant_id = c.tenant_id and p.user_id = c.user_id
where t.operational_status = 'active'
  and exists (select 1 from public.tenant_staff_assignments actor where actor.tenant_id = c.tenant_id
    and actor.user_id = (select app_private.verified_user()) and actor.status = 'active' and actor.can_create_admin)
  and u.email_confirmed_at is not null and u.email is not null and not coalesce(u.is_anonymous,false)
  and (u.banned_until is null or u.banned_until <= now())
order by c.user_id;
create view public.tenant_pending_community_accounts with (security_barrier = true, security_invoker = false) as
select c.tenant_id,c.user_id,p.display_name
from public.community_accounts c
join public.tenants t on t.id = c.tenant_id
left join public.community_account_profiles p on p.tenant_id = c.tenant_id and p.user_id = c.user_id
where t.operational_status = 'active' and c.standing = 'pending'
  and exists (select 1 from public.tenant_staff_assignments actor where actor.tenant_id = c.tenant_id
    and actor.user_id = (select app_private.verified_user()) and actor.status = 'active' and actor.can_approve_users)
order by c.created_at,c.user_id;
alter view public.tenant_admin_candidates owner to postgres;
alter view public.tenant_pending_community_accounts owner to postgres;
revoke all on public.tenant_admin_candidates,public.tenant_pending_community_accounts from public, anon, authenticated;
grant select on public.tenant_admin_candidates,public.tenant_pending_community_accounts to authenticated;

drop function public.save_user_account_profile(text,text);
drop function public.set_user_account_preferences(boolean,boolean);
drop function public.save_community_profile(uuid,text,text);
drop function public.set_community_global_profile_visibility(uuid,boolean);
drop function public.update_tenant_details(uuid,text,text,text,text,text);
drop function public.set_website_content_override(uuid,text,text);
drop function public.list_admin_candidates(uuid);
drop function public.list_pending_community_accounts(uuid);

notify pgrst, 'reload schema';
commit;
