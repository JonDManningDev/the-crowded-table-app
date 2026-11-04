-- Read-only aggregate evidence. No identities, profile content or credentials.
select jsonb_build_object(
  'tenants',(select count(*) from public.tenants),
  'accounts',(select count(*) from public.community_accounts),
  'community_profiles',(select count(*) from public.community_account_profiles),
  'community_preferences',(select count(*) from public.community_account_preferences),
  'participant_permissions',(select count(*) from public.community_account_permissions),
  'pending_requests',(select count(*) from app_private.community_account_requests),
  'missing_dependents',(select count(*) from public.community_accounts c
    left join public.community_account_profiles p using(tenant_id,user_id)
    left join public.community_account_preferences f using(tenant_id,user_id)
    left join public.community_account_permissions m using(tenant_id,user_id)
    where p.user_id is null or f.user_id is null or m.user_id is null),
  'invalid_owners',(select count(*) from public.tenants t where 1<>(
    select count(*) from public.tenant_staff_assignments s join public.community_accounts c using(tenant_id,user_id)
    where s.tenant_id=t.id and s.role='owner' and s.status='active' and c.standing='approved')),
  'missing_first_approval',(select count(*) from public.community_accounts where standing in('approved','suspended') and first_approved_at is null),
  'copied_profile_matches_source',(select count(*) from public.community_account_profiles p
    join public.user_account_profiles g using(user_id)
    where p.display_name=g.display_name and p.bio is not distinct from g.bio),
  'synthetic_auth_remaining',(select count(*) from auth.users where email like '%@example.test')
) as postflight;
