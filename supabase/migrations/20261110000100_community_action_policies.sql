begin;
lock table public.community_accounts, public.community_account_preferences in access exclusive mode;

-- Product authority, tenant membership and standing belong to community policies.
-- The runtime still cannot read Auth rows; this primitive discloses one boolean
-- and optionally holds the target identity against concurrent Auth changes.
create function app_private.auth_identity_eligible(p_target uuid,p_lock boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_lock then perform id from auth.users where id=p_target for share; end if;
  return exists(select from auth.users where id=p_target and email is not null and email_confirmed_at is not null
    and not coalesce(is_anonymous,false) and (banned_until is null or banned_until<=now()));
end $$;
revoke all on function app_private.auth_identity_eligible(uuid,boolean) from public,anon,authenticated,service_role,ct_api;
grant execute on function app_private.auth_identity_eligible(uuid,boolean) to ct_api;
drop function app_private.is_staff_candidate(uuid,uuid,boolean);

-- A preference opt-in coordinates with lifecycle writers on the account row.
-- The deferred account-side check validates final state, permitting the API's
-- explicit compound transition while rejecting omitted sharing cleanup.
drop trigger clear_inactive_sharing on public.community_accounts;
create or replace function app_private.guard_community_sharing() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='community_account_preferences' then
    perform 1 from public.community_accounts where tenant_id=new.tenant_id
      and user_id=new.user_id and standing <> 'inactive' for update;
    if not found then raise exception 'inactive_community_sharing' using errcode='23514'; end if;
  elsif exists(select from public.community_accounts c
    join public.community_account_preferences p using(tenant_id,user_id)
    where c.tenant_id=new.tenant_id and c.user_id=new.user_id and c.standing='inactive' and p.show_global_profile) then
    raise exception 'inactive_community_sharing' using errcode='23514';
  end if;
  return new;
end $$;
create constraint trigger validate_inactive_sharing after insert or update on public.community_accounts
  deferrable initially deferred for each row execute function app_private.guard_community_sharing();

-- The staff trigger has used protect_staff_assignment since migration 006.
-- Remove only the dormant branch referring to obsolete can_create_admin and
-- owner auto-enabling; retain tenant identity/timezone and account/content keys.
create or replace function app_private.protect_invariants() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_table_name='tenants' and tg_op <> 'DELETE' then
    if tg_op='UPDATE' and (new.id <> old.id or new.slug <> old.slug) then
      raise exception 'tenant_identity_immutable' using errcode='23514';
    end if;
    if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then
      raise exception 'invalid_timezone' using errcode='23514';
    end if;
  elsif tg_op='UPDATE' then
    if to_jsonb(new)->'tenant_id' is distinct from to_jsonb(old)->'tenant_id'
       or to_jsonb(new)->'user_id' is distinct from to_jsonb(old)->'user_id'
       or (tg_table_name='tenant_website_content_overrides'
         and to_jsonb(new)->'content_key' is distinct from to_jsonb(old)->'content_key') then
      raise exception 'account_identity_immutable' using errcode='23514';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
notify pgrst,'reload schema';
commit;
