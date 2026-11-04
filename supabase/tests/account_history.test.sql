begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok(not has_any_column_privilege(r,t,'SELECT'),r||' cannot read raw '||t)
from unnest(array['anon','authenticated','service_role']) r cross join unnest(array[
  'public.tenant_admin_actions','app_private.tenant_admin_action_categories']) t;
select ok(not has_function_privilege(r,'app_private.can_read_account_action(uuid,uuid)','EXECUTE'),
  r||' cannot probe history authorization') from unnest(array['anon','authenticated','service_role']) r;
select ok(has_column_privilege('ct_api','public.tenant_admin_actions',c,'SELECT'),'runtime can project '||c)
from unnest(array['id','tenant_id','action','target_user_id','content_key','created_at','created_by','operation_id','reason','details']) c;
select ok((select relrowsecurity from pg_class where oid=t::regclass),'RLS on '||t)
from unnest(array['public.tenant_admin_actions','app_private.tenant_admin_action_categories']) t;
select ok(not exists(select from pg_policies where schemaname='public' and tablename='tenant_admin_actions'
  and cmd='ALL'),'history cannot inherit a broad command SELECT policy');
select ok(not has_any_column_privilege('ct_api','app_private.tenant_admin_action_categories','INSERT,UPDATE')
  and not has_table_privilege('ct_api','app_private.tenant_admin_action_categories','DELETE,TRUNCATE'),
  'runtime cannot reclassify immutable events');
select * from finish();
rollback;
