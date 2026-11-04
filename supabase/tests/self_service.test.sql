begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok(to_regclass('public.my_community_summaries') is null,'legacy summary view retired');
select ok(not has_any_column_privilege(r,t,'SELECT,INSERT,UPDATE') and not has_table_privilege(r,t,'DELETE'),
  r||' cannot bypass API on '||t) from unnest(array['anon','authenticated','service_role']) r cross join unnest(array[
  'public.user_account_profiles','public.community_account_profiles','public.community_account_preferences']) t;
select ok(not has_function_privilege(r,'app_private.my_community_relationships()','EXECUTE'),r||' cannot call private relationship source')
  from unnest(array['anon','authenticated','service_role']) r;
select ok(not has_table_privilege('ct_api','public.user_account_profiles','DELETE'),'runtime cannot delete global profile');
select ok(not has_column_privilege('ct_api','public.user_account_profiles',c,'INSERT,UPDATE'),'runtime cannot forge profile '||c)
  from unnest(array['user_id','created_at','updated_at','created_by','updated_by']) c;
select ok(has_column_privilege('ct_api','public.community_account_profiles','display_name','UPDATE'),'runtime can edit curated name');
select ok(not has_column_privilege('ct_api','public.community_account_profiles','user_id','UPDATE'),'runtime cannot move curated profile');
select ok(not exists(select from pg_policies where schemaname='public' and tablename in ('community_account_profiles','community_account_preferences')
  and cmd='ALL' and 'ct_api'=any(roles)),'new self edits cannot inherit a broad command policy');
select ok(exists(select from pg_policies where tablename='community_account_preferences' and policyname='preference_archive_boundary'
  and permissive='RESTRICTIVE'),'private preference archive guard remains independent');
select * from finish();
rollback;
