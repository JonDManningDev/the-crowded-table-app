begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok(not has_any_column_privilege(r,t,'SELECT,INSERT,UPDATE') and not has_table_privilege(r,t,'DELETE'),r||' cannot bypass account record API on '||t)
  from unnest(array['anon','authenticated','service_role']) r cross join unnest(array[
    'public.tenant_staff_assignments','public.community_account_permissions']) t;
select ok(not has_function_privilege(r,'app_private.can_manage_account_records(uuid,text)','EXECUTE'),r||' cannot call the management predicate')
  from unnest(array['anon','authenticated','service_role']) r;
select ok(not has_column_privilege('ct_api','public.community_account_permissions',c,'UPDATE'),'runtime cannot change participant identity or audit: '||c)
  from unnest(array['tenant_id','user_id','created_at','updated_at','created_by','updated_by']) c;
select ok(has_column_privilege('ct_api','public.community_account_permissions','can_post_public_events','UPDATE'),'runtime has only intended participant edit');
select ok(not has_column_privilege('ct_api','public.community_account_permissions','can_post_public_events','INSERT'),'creation cannot inject permission');
select ok(not has_table_privilege('ct_api','public.community_account_permissions','DELETE'),'runtime cannot delete required permission');
select ok(exists(select from pg_policies where tablename=t and policyname=p and permissive='RESTRICTIVE'),'independent archive guard on '||t)
  from (values ('tenant_staff_assignments','staff_archive_boundary'),('community_account_permissions','participant_archive_boundary')) guards(t,p);
select ok(not exists(select from pg_policies where tablename='community_account_permissions' and policyname='command_scope'),'broad permission policy retired');
select ok(not exists(select from pg_policies where tablename='tenant_staff_assignments' and policyname='self_or_owner_staff'),'browser staff policy retired');
select is((select usage from app_private.account_action_types where code='community_permissions_changed'),'command','permission event uses trusted command attribution');
select * from finish();
rollback;
