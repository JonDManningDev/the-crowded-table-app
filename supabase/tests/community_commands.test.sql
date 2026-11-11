begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok(to_regprocedure(signature) is null, 'retired command ' || signature)
from unnest(array['public.create_tenant(text,text,text,text,text,text,boolean)','public.join_community(uuid)',
  'public.approve_community_account(uuid,uuid)','public.create_tenant_admin(uuid,uuid)',
  'public.set_admin_permissions(uuid,uuid,boolean,boolean,boolean)','public.set_tenant_archived(uuid,boolean)',
  'public.set_auto_approve_users(uuid,boolean)']) signature;
select ok(not has_any_column_privilege(r,t,'INSERT'),r||' cannot establish '||t)
from unnest(array['anon','authenticated']) r cross join unnest(array['public.tenants','public.tenant_settings',
  'public.tenant_staff_assignments','public.community_accounts','public.community_account_profiles','public.community_account_preferences',
  'public.community_account_permissions','app_private.community_account_requests','public.tenant_admin_actions',
  'app_private.tenant_admin_action_categories']) t;
select ok(not has_column_privilege(r,t,col,'UPDATE'),r||' cannot change '||t||'.'||col) from unnest(array['anon','authenticated']) r
cross join (values ('public.tenants','operational_status'),('public.tenant_staff_assignments','status'),
  ('public.tenant_staff_assignments','can_grant_staff'),('public.community_accounts','standing'),('public.community_accounts','first_approved_at'),
  ('public.community_accounts','revision'),('public.community_accounts','has_disciplinary_restriction'),('public.community_account_profiles','tenant_id')) f(t,col);
select ok(not has_any_column_privilege('ct_api','public.tenant_admin_actions','UPDATE') and
  not has_table_privilege('ct_api','public.tenant_admin_actions','DELETE,TRUNCATE'),'runtime cannot rewrite history');
select ok(not has_column_privilege('ct_api','public.tenant_admin_actions',col,'INSERT'),'runtime cannot supply '||col)
from unnest(array['id','created_at','created_by','operation_id']) col;
select ok(not has_column_privilege('ct_api','public.tenant_staff_assignments','role','UPDATE'),'runtime cannot transfer ownership');
select ok(not has_column_privilege('ct_api','public.community_accounts','first_approved_at','UPDATE'),'runtime cannot forge first approval');
select ok((select relrowsecurity from pg_class where oid=t::regclass),'RLS on '||t) from unnest(array[
  'public.tenants','public.community_accounts','public.community_account_profiles','public.community_account_permissions',
  'public.community_account_preferences','public.tenant_staff_assignments','app_private.community_account_requests','app_private.tenant_admin_action_categories']) t;
select ok(to_regprocedure('app_private.is_staff_candidate(uuid,uuid,boolean)') is null,'mixed staff candidate function retired');
select ok(not has_function_privilege(r,'app_private.auth_identity_eligible(uuid,boolean)','EXECUTE'),r||' cannot probe private Auth eligibility')
from unnest(array['anon','authenticated']) r;
select ok(position('can_create_admin' in pg_get_functiondef('app_private.protect_invariants()'::regprocedure))=0,'dormant obsolete staff invariant removed');
select ok(position('update public.community_account_preferences' in lower(pg_get_functiondef('app_private.guard_community_sharing()'::regprocedure)))=0,'sharing guard has no corrective workflow');
select ok((select tgdeferrable and tginitdeferred from pg_trigger where tgrelid='public.community_accounts'::regclass and tgname='validate_inactive_sharing'),'account sharing invariant checks final state');
select ok(exists(select from pg_trigger where tgfoid=('app_private.'||f||'()')::regprocedure),'retained integrity or platform integration '||f)
from unnest(array['stamp_first_approval','stamp_community_revision','require_tenant_roots','protect_staff_assignment','provision_user_account']) f;
select * from finish();
rollback;
