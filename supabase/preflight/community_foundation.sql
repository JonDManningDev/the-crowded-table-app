-- Read-only input to the next coordinated community-account migration. Returns
-- aggregate counts and blockers only. Evaluate against the locked source rows
-- again inside the cutover transaction before applying any backfills.
with accounts as (
  select c.standing, c.show_global_profile, p.user_id is null as missing_profile,
    g.user_id is not null and g.display_name = btrim(g.display_name)
      and char_length(g.display_name) between 1 and 80
      and (g.bio is null or char_length(g.bio) <= 2000) as usable_global
  from public.community_accounts c
  left join public.community_account_profiles p using (tenant_id, user_id)
  left join public.user_account_profiles g on g.user_id = c.user_id
), staff as (
  select s.role, s.status, c.standing
  from public.tenant_staff_assignments s left join public.community_accounts c using (tenant_id, user_id)
), blockers as (
  select
    (select count(*) from staff where role = 'owner' and (status <> 'active' or standing is distinct from 'approved')) as owners_requiring_repair,
    (select count(*) from staff where role <> 'owner' and status = 'active' and standing is distinct from 'approved') as ineligible_active_staff,
    (select count(*) from accounts where missing_profile and not usable_global) as missing_profile_sources,
    (select count(*) from accounts where standing not in ('pending','approved','suspended','removed')) as unknown_standings
), backfills as (
  select count(*) as accounts,
    count(*) filter (where missing_profile and usable_global) as copy_global_profile_once,
    count(*) filter (where not missing_profile) as preserve_curated_profile,
    count(*) filter (where standing = 'pending') as adopt_pending_request,
    count(*) filter (where standing in ('approved','suspended','removed')) as approximate_first_approval,
    count(*) filter (where standing in ('suspended','removed')) as mark_restricted,
    count(*) filter (where standing = 'removed') as convert_to_inactive,
    count(*) filter (where standing = 'removed' and show_global_profile) as clear_inactive_sharing
  from accounts
)
select jsonb_build_object(
  'ready', owners_requiring_repair = 0 and ineligible_active_staff = 0 and missing_profile_sources = 0 and unknown_standings = 0,
  'blockers', to_jsonb(blockers), 'backfills', to_jsonb(backfills)
) from blockers cross join backfills;
