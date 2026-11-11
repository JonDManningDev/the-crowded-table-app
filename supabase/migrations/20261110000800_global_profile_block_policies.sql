begin;
-- Product audiences/source proof now belong to API query predicates. Retain
-- verified runtime context and owner-only mutations, not peer-read business RLS.
drop policy api_discoverable_profile on public.user_account_profiles;
create policy api_global_profile_facts on public.user_account_profiles for select to ct_api
  using ((select app_private.verified_user()) is not null);
drop policy api_self_read on public.user_accounts;
create policy api_account_facts on public.user_accounts for select to ct_api
  using ((select app_private.verified_user()) is not null);

-- Read both directions needed for bilateral enforcement. HTTP outgoing lists
-- retain their own explicit caller predicate; no new columns/grants are added.
drop policy own_blocks_read on public.user_account_blocks;
create policy related_block_facts on public.user_account_blocks for select to ct_api
  using ((select app_private.verified_user()) in (blocker_user_id,blocked_user_id));
drop policy own_blocks_insert on public.user_account_blocks;
create policy own_blocks_insert on public.user_account_blocks for insert to ct_api
  with check (blocker_user_id=(select app_private.verified_user()));

-- Exact global reads select only their target's sharing facts across communities.
-- The API supplies this selector; it is neither identity nor product authority.
create policy profile_target_sharing_facts on public.community_account_preferences for select to ct_api
  using ((select app_private.verified_user()) is not null
    and user_id=nullif(current_setting('ct.profile_target',true),'')::uuid);

-- Lock-only peer UPDATE USING permits SELECT FOR SHARE of the target's
-- preference root. WITH CHECK false admits no peer mutation. Ordinary self
-- preference UPDATE retains its existing independent policy and column grants.
create policy profile_target_lock on public.user_accounts for update to ct_api
  using ((select app_private.verified_user()) is not null
    and user_id=nullif(current_setting('ct.profile_target',true),'')::uuid)
  with check (false);

-- Existing restrictive G-02 policies, own write scopes, structural checks,
-- attribution defaults, protected Auth access and external grants are unchanged.
drop function app_private.can_block_from_profile(uuid);
drop function app_private.inspect_global_profile(uuid);
drop function app_private.can_inspect_global_profile(uuid);
drop function app_private.can_discover_global_profile(uuid);
notify pgrst,'reload schema';
commit;
