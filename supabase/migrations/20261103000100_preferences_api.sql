begin;

-- Roles are cluster-wide, including across disposable migration replay databases.
do $$
begin
  if not exists (select from pg_roles where rolname = 'ct_api') then
    create role ct_api login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  elsif exists (select from pg_roles where rolname = 'ct_api' and
      (not rolcanlogin or rolinherit or rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls))
      or exists (select from pg_auth_members where member = 'ct_api'::regrole) then
    raise exception 'Unsafe existing ct_api role';
  end if;
end $$;

-- Private Auth check. A share lock serializes a confirmed actor's operation with
-- bans, deactivation by Auth and deletion until the preference transaction ends.
create function app_private.lock_eligible_actor() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from auth.users where id = auth.uid()
    and email_confirmed_at is not null and email is not null and not coalesce(is_anonymous, false)
    and (banned_until is null or banned_until <= now()) for share;
  return found;
end $$;
revoke all on function app_private.lock_eligible_actor() from public, anon, authenticated, service_role;
grant usage on schema public, auth, app_private to ct_api;
grant execute on function auth.uid(), app_private.lock_eligible_actor(), app_private.verified_user() to ct_api;
drop policy self_account on public.user_accounts;
drop policy own_preferences_update on public.user_accounts;
revoke all on public.user_accounts from public, anon, authenticated;
revoke update(user_is_discoverable, enable_matchmaking, allow_direct_messages)
  on public.user_accounts from public, anon, authenticated;
grant select(user_id, user_is_discoverable, enable_matchmaking, allow_direct_messages),
  update(user_is_discoverable, enable_matchmaking, allow_direct_messages) on public.user_accounts to ct_api;
create policy api_self_read on public.user_accounts for select to ct_api
  using (user_id = (select app_private.verified_user()));
create policy api_self_edit on public.user_accounts for update to ct_api
  using (user_id = (select app_private.verified_user()))
  with check (user_id = (select app_private.verified_user()));
commit;
