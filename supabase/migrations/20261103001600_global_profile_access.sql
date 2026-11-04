begin;
create table public.user_account_blocks (
  blocker_user_id uuid not null default app_private.verified_user() references public.user_accounts(user_id),
  blocked_user_id uuid not null references public.user_accounts(user_id),
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid not null default app_private.verified_user() references public.user_accounts(user_id),
  primary key(blocker_user_id,blocked_user_id),
  check(blocker_user_id<>blocked_user_id), check(created_by=blocker_user_id)
);
create index user_account_blocks_reverse on public.user_account_blocks(blocked_user_id,blocker_user_id);
alter table public.user_account_blocks enable row level security;
revoke all on public.user_account_blocks from public,anon,authenticated,service_role,ct_api;

-- These predicates disclose no preference values or qualifying affiliations.
-- They run in the same statement snapshot as the returned profile projection.
create function app_private.can_discover_global_profile(p_target uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select app_private.verified_user() is not null and exists(select from public.user_accounts u
    where u.user_id=p_target and u.user_is_discoverable)
    and not exists(select from public.user_account_blocks b where
      (b.blocker_user_id,b.blocked_user_id) in ((app_private.verified_user(),p_target),(p_target,app_private.verified_user())))
$$;
create function app_private.can_inspect_global_profile(p_target uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select app_private.verified_user() is not null and (p_target=app_private.verified_user() or (
    not exists(select from public.user_account_blocks b where
      (b.blocker_user_id,b.blocked_user_id) in ((app_private.verified_user(),p_target),(p_target,app_private.verified_user())))
    and (exists(select from public.user_accounts u where u.user_id=p_target and u.user_is_discoverable)
      or exists(select from public.community_accounts viewer join public.community_accounts target using(tenant_id)
        join public.community_account_preferences prefs on (prefs.tenant_id,prefs.user_id)=(target.tenant_id,target.user_id)
        join public.tenants t on t.id=target.tenant_id
        where viewer.user_id=app_private.verified_user() and target.user_id=p_target
          and viewer.standing in ('approved','suspended') and target.standing in ('approved','suspended')
          and t.operational_status='active' and prefs.show_global_profile))))
$$;
create function app_private.inspect_global_profile(p_target uuid)
returns table(user_id uuid,display_name text,bio text,created_at timestamptz,updated_at timestamptz,created_by uuid,updated_by uuid)
language sql stable security definer set search_path='' as $$
  select p.user_id,p.display_name,p.bio,p.created_at,p.updated_at,p.created_by,p.updated_by
    from public.user_account_profiles p where p.user_id=p_target and app_private.can_inspect_global_profile(p_target)
$$;
create policy api_discoverable_profile on public.user_account_profiles for select to ct_api
  using (app_private.can_discover_global_profile(user_id));

-- The API supplies source selectors; the mutation policy validates the actual
-- currently readable profile. No source boolean or arbitrary identity is proof.
create function app_private.can_block_from_profile(p_target uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select app_private.verified_user() is not null and p_target<>app_private.verified_user() and (
    exists(select from public.user_account_blocks b where (b.blocker_user_id,b.blocked_user_id)=(app_private.verified_user(),p_target))
    or case current_setting('ct.block_source',true)
      when 'global_profile' then app_private.can_inspect_global_profile(p_target)
        and exists(select from public.user_account_profiles p where p.user_id=p_target)
      when 'community_profile' then exists(
        select from public.community_accounts viewer join public.community_accounts target using(tenant_id)
        join public.community_account_profiles p on (p.tenant_id,p.user_id)=(target.tenant_id,target.user_id)
        join public.tenants t on t.id=target.tenant_id
        where t.id=nullif(current_setting('ct.block_tenant',true),'')::uuid
          and viewer.user_id=app_private.verified_user() and target.user_id=p_target
          and ((t.operational_status='active' and viewer.standing in ('approved','suspended')
            and target.standing in ('approved','suspended','inactive'))
            or (t.operational_status='archived' and app_private.is_approved_owner(t.id))))
      else false end)
$$;
revoke all on function app_private.can_discover_global_profile(uuid),app_private.can_inspect_global_profile(uuid),
  app_private.inspect_global_profile(uuid),app_private.can_block_from_profile(uuid) from public,anon,authenticated,service_role;
grant execute on function app_private.can_discover_global_profile(uuid),app_private.can_inspect_global_profile(uuid),
  app_private.inspect_global_profile(uuid),app_private.can_block_from_profile(uuid) to ct_api;
grant select(blocker_user_id,blocked_user_id,created_at,created_by),insert(blocked_user_id),delete on public.user_account_blocks to ct_api;
create policy own_blocks_read on public.user_account_blocks for select to ct_api using (blocker_user_id=app_private.verified_user());
create policy own_blocks_insert on public.user_account_blocks for insert to ct_api
  with check (blocker_user_id=app_private.verified_user() and app_private.can_block_from_profile(blocked_user_id));
create policy own_blocks_delete on public.user_account_blocks for delete to ct_api using (blocker_user_id=app_private.verified_user());
notify pgrst,'reload schema';
commit;
