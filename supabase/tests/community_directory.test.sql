begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok(not has_any_column_privilege(r,'public.community_accounts','SELECT,INSERT,UPDATE')
  and not has_table_privilege(r,'public.community_accounts','DELETE'),r||' cannot bypass account API')
  from unnest(array['anon','authenticated','service_role']) r;
select ok(not has_function_privilege(r,'app_private.public_community_directory(text,uuid,integer)','EXECUTE'),r||' cannot invoke internal directory projection')
  from unnest(array['anon','authenticated','service_role']) r;
select ok(has_column_privilege('ct_api','public.community_accounts',c,'SELECT'),'runtime reads accepted fact '||c)
  from unnest(array['tenant_id','user_id','standing','first_approved_at','has_disciplinary_restriction','created_at','updated_at','created_by','updated_by']) c;
select ok(not has_column_privilege('ct_api','public.community_accounts',c,'UPDATE'),'runtime cannot forge fact metadata '||c)
  from unnest(array['tenant_id','user_id','first_approved_at','created_at','updated_at','created_by','updated_by']) c;
select ok(not exists(select from pg_policies where tablename='community_accounts' and policyname='self_community'),'legacy browser account policy retired');
select ok(exists(select from pg_policies where tablename='community_accounts' and policyname='account_archive_boundary' and permissive='RESTRICTIVE'),'independent account archive boundary remains');
select ok(exists(select from pg_policies where tablename='community_account_profiles' and policyname='profile_archive_boundary' and permissive='RESTRICTIVE'),'independent profile archive boundary remains');
select ok(not exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v')
  and (has_any_column_privilege(r,c.oid,'SELECT,INSERT,UPDATE') or has_table_privilege(r,c.oid,'DELETE'))),r||' has no remaining ordinary public application relation access')
  from unnest(array['anon','authenticated']) r;
select * from finish();
rollback;
