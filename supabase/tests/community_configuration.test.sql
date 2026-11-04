begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok(to_regprocedure('public.lookup_tenant(text)') is null,'public landing RPC retired');
select ok(to_regprocedure('app_private.can_modify_content(uuid)') is null,'obsolete content helper retired');
select ok(not has_any_column_privilege(r,t,'SELECT,INSERT,UPDATE') and not has_table_privilege(r,t,'DELETE'),r||' cannot bypass configuration API on '||t)
  from unnest(array['anon','authenticated','service_role']) r cross join unnest(array[
    'public.tenants','public.tenant_settings','public.tenant_website_content_overrides']) t;
select ok(not has_function_privilege(r,f,'EXECUTE'),r||' cannot invoke '||f)
  from unnest(array['anon','authenticated','service_role']) r cross join unnest(array[
    'app_private.can_edit_configuration(uuid,text)','app_private.community_landing(text)']) f;
select ok(not has_column_privilege('ct_api','public.tenants',c,'UPDATE'),'runtime cannot update tenant '||c)
  from unnest(array['id','slug','created_at','updated_at','created_by','updated_by']) c;
select ok(not has_column_privilege('ct_api','public.tenant_website_content_overrides',c,'UPDATE'),'runtime cannot move or forge copy '||c)
  from unnest(array['tenant_id','content_key','created_at','updated_at','created_by','updated_by']) c;
select ok(exists(select from pg_trigger where tgrelid='public.tenants'::regclass and tgname='a_configuration' and tgenabled='O'),
  'runtime detail writes enforce ownership without breaking membership row locks');
select ok(exists(select from pg_policies where tablename=t and policyname=p and permissive='RESTRICTIVE'),'independent archive guard on '||t)
  from (values ('tenant_settings','settings_archive_boundary'),('tenant_website_content_overrides','copy_archive_boundary')) guards(t,p);
select * from finish();
rollback;
