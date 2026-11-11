begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok(not has_any_column_privilege(r,'public.user_account_blocks','SELECT,INSERT,UPDATE') and not has_table_privilege(r,'public.user_account_blocks','DELETE'),r||' cannot bypass block API')
  from unnest(array['anon','authenticated','service_role']) r;
select ok(to_regprocedure(f) is null,'API-owned profile function retired '||f)
  from unnest(array['app_private.can_discover_global_profile(uuid)','app_private.can_inspect_global_profile(uuid)',
    'app_private.inspect_global_profile(uuid)','app_private.can_block_from_profile(uuid)']) f;
select ok(not has_column_privilege('ct_api','public.user_account_blocks',c,'INSERT'),'runtime cannot inject block attribution '||c)
  from unnest(array['blocker_user_id','created_at','created_by']) c;
select ok(not has_any_column_privilege('ct_api','public.user_account_blocks','UPDATE'),'runtime cannot rewrite block identity/metadata');
select ok(has_column_privilege('ct_api','public.user_account_blocks','blocked_user_id','INSERT'),'runtime selects only the target on creation');
select ok(exists(select from pg_policies where tablename='user_account_blocks' and policyname='own_blocks_insert' and with_check not like '%can_block_from_profile%'),'block storage retains self scope without product source authority');
select ok(exists(select from pg_policies where tablename='user_account_profiles' and policyname='api_global_profile_facts' and cmd='SELECT'),'runtime fact read policy adds no peer writes');
select ok(exists(select from pg_policies where tablename='user_account_profiles' and policyname='api_self_profile'),'self edits retain independent self policy');
select ok(exists(select from pg_policies where tablename='user_accounts' and policyname='profile_target_lock' and cmd='UPDATE' and with_check='false'),'target preference root permits locking but no peer write');
select ok(exists(select from pg_class where oid='public.user_account_blocks'::regclass and relrowsecurity),'directed blocks use RLS');
select * from finish();
rollback;
