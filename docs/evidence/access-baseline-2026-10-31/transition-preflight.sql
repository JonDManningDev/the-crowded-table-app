-- Aggregate-only migration planning evidence; no user IDs, names or messages.
select jsonb_build_object(
  'captured_at',current_timestamp,
  'community_standing_counts',(select coalesce(jsonb_object_agg(standing,n),'{}'::jsonb) from (select standing,count(*) n from public.community_accounts group by standing) s),
  'staff_status_counts',(select coalesce(jsonb_object_agg(status,n),'{}'::jsonb) from (select status,count(*) n from public.tenant_staff_assignments group by status) s),
  'owners_without_approved_community_account',(select count(*) from public.tenant_staff_assignments s left join public.community_accounts c using(tenant_id,user_id) where s.role='owner' and c.standing is distinct from 'approved'),
  'active_nonowner_staff_without_approved_community_account',(select count(*) from public.tenant_staff_assignments s left join public.community_accounts c using(tenant_id,user_id) where s.role<>'owner' and s.status='active' and c.standing is distinct from 'approved'),
  'community_accounts_missing_profile',(select count(*) from public.community_accounts c left join public.community_account_profiles p using(tenant_id,user_id) where p.user_id is null),
  'global_accounts_missing_profile',(select count(*) from public.user_accounts a left join public.user_account_profiles p using(user_id) where p.user_id is null),
  'first_approved_at_backfill_from_created_at',(select count(*) from public.community_accounts where standing in ('approved','suspended','removed')),
  'pending_first_approved_at_remains_null',(select count(*) from public.community_accounts where standing='pending'),
  'removed_standing_to_inactive',(select count(*) from public.community_accounts where standing='removed'),
  'suspended_or_removed_needing_restriction_flag',(select count(*) from public.community_accounts where standing in ('suspended','removed'))
) as preflight;
