begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at) values
 ('10000000-0000-0000-0000-000000000001','profile-a@example.test',now()),
 ('10000000-0000-0000-0000-000000000002','profile-b@example.test',now()),
 ('10000000-0000-0000-0000-000000000003','profile-unverified@example.test',null);

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.save_user_account_profile('Alex','Hello')$$,'verified caller creates own profile without community');
select lives_ok($$select public.save_user_account_profile('Alex Updated','Updated')$$,'own profile update succeeds');
select is((select display_name from public.user_account_profiles),'Alex Updated','updated name is readable');
select is((select created_by from public.user_account_profiles),auth.uid(),'creation actor is trusted caller');
select is((select updated_by from public.user_account_profiles),auth.uid(),'update actor is trusted caller');
select ok((select updated_at >= created_at from public.user_account_profiles),'audit timestamps populated');
select throws_ok($$select public.save_user_account_profile(' ')$$,'23514',null,'blank name rejected');
select throws_ok($$select public.save_user_account_profile(repeat('a',81))$$,'23514',null,'long name rejected');
select throws_ok($$select public.save_user_account_profile('Alex',repeat('a',2001))$$,'23514',null,'long bio rejected');
select lives_ok($$select public.save_user_account_profile(repeat('a',80),repeat('a',2000))$$,'documented maximum lengths accepted');
select lives_ok($$select public.save_user_account_profile('Alex','')$$,'empty bio accepted');
select is((select bio from public.user_account_profiles),null::text,'empty bio remains empty, no community fallback');
select throws_ok($$update public.user_account_profiles set display_name='Hijacked'$$,'42501',null,'direct browser writes denied');
select ok((select user_is_discoverable and enable_matchmaking from public.user_accounts),'global defaults are true');
select lives_ok($$select public.set_user_account_preferences(false,null)$$,'search can be opted out independently');
select ok((select not user_is_discoverable and enable_matchmaking from public.user_accounts),'search opt-out preserves matchmaking');
select lives_ok($$select public.set_user_account_preferences(null,false)$$,'matching opt-out is independent');
select ok((select not user_is_discoverable and not enable_matchmaking from public.user_accounts),'partial update preserves prior search preference');
select set_config('test.profile_tenant',public.create_tenant('profile-test','Profile test','HN','UTC',null,null,true)::text,true);
select is((select show_global_profile from public.community_accounts),false,'community sharing defaults false');
select lives_ok($$select public.set_community_global_profile_visibility(current_setting('test.profile_tenant')::uuid,true)$$,'caller controls own community sharing');
select ok((select show_global_profile from public.community_accounts),'community sharing independent of search and matching');
select lives_ok($$select public.join_community(current_setting('test.profile_tenant')::uuid)$$,'repeat join succeeds');
select ok((select show_global_profile from public.community_accounts),'repeat join preserves explicit consent');
select is((select count(*) from public.community_account_profiles),0::bigint,'global edits do not create curated profiles');

select lives_ok($$select public.set_tenant_archived(current_setting('test.profile_tenant')::uuid,true)$$,'owner archives test community');
select throws_ok($$select public.set_community_global_profile_visibility(current_setting('test.profile_tenant')::uuid,false)$$,'42501',null,'community preference respects archived lifecycle');
select lives_ok($$select public.save_user_account_profile('Still editable','Global')$$,'global profile independent of archived community');
select lives_ok($$select public.set_user_account_preferences(true,true)$$,'global preferences independent of tenant lifecycle');
select lives_ok($$select public.set_tenant_archived(current_setting('test.profile_tenant')::uuid,false)$$,'owner restores test community');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select count(*) from public.user_account_profiles),0::bigint,'other account cannot read profile');
select throws_ok($$select public.set_community_global_profile_visibility(current_setting('test.profile_tenant')::uuid,true)$$,'42501',null,'unassociated caller cannot change community sharing');
select ok((select user_is_discoverable and enable_matchmaking from public.user_accounts),'other account preferences untouched');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.save_user_account_profile('Unverified')$$,'42501',null,'unverified user cannot create profile');
select throws_ok($$select public.set_user_account_preferences(false,false)$$,'42501',null,'unverified preferences denied');
set local role anon;
select throws_ok($$select * from public.user_account_profiles$$,'42501',null,'anonymous reads denied');
reset role;
select * from finish();
rollback;
