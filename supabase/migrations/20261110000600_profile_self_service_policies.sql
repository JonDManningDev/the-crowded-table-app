begin;
-- API entry points already trim names/bios (including creation and join). Stop
-- repairing writes in PostgreSQL; reject noncanonical new/updated profile text.
-- Earlier cutover deliberately preserved existing biography bytes. NOT VALID
-- keeps those stored values while enforcing the check on every future write.
drop trigger b_normalize on public.user_account_profiles;
drop trigger b_normalize on public.community_account_profiles;
drop function app_private.normalize_editable_text();
alter table public.user_account_profiles add constraint global_profile_canonical_bio
  check (bio is null or (bio=btrim(bio) and bio<>'')) not valid;
alter table public.community_account_profiles add constraint community_profile_canonical_bio
  check (bio is null or (bio=btrim(bio) and bio<>'')) not valid;

-- API predicates own lifecycle/standing authorization. Keep verified-self
-- scoping, exact column grants and all independent restrictive archive fences.
drop policy api_own_profile_edit on public.community_account_profiles;
create policy own_profile_scope_edit on public.community_account_profiles for update to ct_api
  using (user_id=app_private.verified_user()) with check (user_id=app_private.verified_user());
drop policy api_own_preferences_edit on public.community_account_preferences;
create policy own_preferences_scope_edit on public.community_account_preferences for update to ct_api
  using (user_id=app_private.verified_user()) with check (user_id=app_private.verified_user());

-- Caller-only relationship cards, Auth/attribution, immutable identities, G-02
-- and rejection-only sharing constraints/lock coordination remain unchanged.
notify pgrst,'reload schema';
commit;
