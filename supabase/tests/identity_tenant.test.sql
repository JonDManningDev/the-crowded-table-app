begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

-- Fixture Auth identities exercise the real signup trigger, not mocked accounts.
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-0000-0000-000000000001','owner-a@example.test',now()),
 ('00000000-0000-0000-0000-000000000002','owner-b@example.test',now()),
 ('00000000-0000-0000-0000-000000000003','admin@example.test',now()),
 ('00000000-0000-0000-0000-000000000004','member@example.test',now()),
 ('00000000-0000-0000-0000-000000000005','unverified@example.test',null);
select is((select count(*) from public.user_accounts where user_id::text like '00000000-%'),5::bigint,'signup provisions accounts');
select is((select created_by from public.user_accounts where user_id='00000000-0000-0000-0000-000000000001'),
 '00000000-0000-0000-0000-000000000001'::uuid,'signup attributes human actor');
select is((select count(*) from public.community_accounts),0::bigint,'signup does not join communities');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('test.tenant_a',public.create_tenant('community-a','Community A','HN','America/Tegucigalpa')::text,true);
select is((select count(*) from public.user_accounts),1::bigint,'account RLS is self-only');
select is((select count(*) from public.community_accounts),0::bigint,'owner can opt out of participation');
select ok((select can_approve_users and can_create_admin from public.tenant_staff_assignments),'owner flags initialize true');
select is((select auto_approve_users from public.tenant_settings),false,'auto approval defaults false');
select is((select created_by from public.tenants),'00000000-0000-0000-0000-000000000001'::uuid,'tenant actor is caller');
select throws_ok($$select public.create_tenant('UPPERCASE','X','HN','UTC')$$,'23514',null,'reject uppercase slug');
select throws_ok($$select public.create_tenant('auth','X','HN','UTC')$$,'23514',null,'reject reserved slug');
select throws_ok($$select public.create_tenant('community-a','X','HN','UTC')$$,'23505',null,'reject duplicate slug');
select throws_ok($$select public.create_tenant('bad-timezone','X','HN','not/a/timezone')$$,'23514',null,'reject bad timezone');
select throws_ok($$select public.create_tenant('no-country','X',null,'UTC')$$,'23502',null,'country required');
select throws_ok($$select public.create_tenant('bad-country','X','ZZ','UTC')$$,'23514',null,'country must be a recognized code');
select is((select count(*) from public.tenants),1::bigint,'failed creation leaves no partial tenant');
select throws_ok($$update public.tenants set slug='changed'$$,'42501',null,'direct tenant writes denied');
select throws_ok($$update public.user_accounts set created_by=null$$,'42501',null,'audit spoofing denied');
select throws_ok($$select app_private.lock_tenant(current_setting('test.tenant_a')::uuid)$$,'42501',null,'internal command helper not callable');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select set_config('test.tenant_b',public.create_tenant('community-b','Community B','HN','UTC',null,null,true)::text,true);
select is((select standing from public.community_accounts),'approved','creator optional account approved');
select is((select count(*) from public.tenants),1::bigint,'owner cannot read other tenant base records');
select throws_ok($$select public.set_auto_approve_users(current_setting('test.tenant_a')::uuid,true)$$,'42501',null,'cross tenant management denied');
select is((select count(*) from public.tenant_admin_actions where tenant_id=current_setting('test.tenant_a')::uuid),0::bigint,'cross tenant audit reads denied');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
select is((select count(*) from public.user_accounts),0::bigint,'unverified cannot read authenticated account');
select throws_ok($$select public.create_tenant('unverified','X','HN','UTC')$$,'42501',null,'unverified cannot create tenant');
select throws_ok($$select public.join_community(current_setting('test.tenant_a')::uuid)$$,'42501',null,'unverified cannot join');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select is(public.join_community(current_setting('test.tenant_a')::uuid),'pending','join requires approval by default');
select lives_ok($$select public.save_community_profile(current_setting('test.tenant_a')::uuid,'Admin Candidate','Private biography')$$,'pending user can set own profile');
select is((select count(*) from public.community_account_profiles),1::bigint,'self profile readable');
select throws_ok($$select public.list_admin_candidates(current_setting('test.tenant_a')::uuid)$$,'42501',null,'ordinary participant cannot list candidates');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select is((select count(*) from public.community_account_profiles),0::bigint,'owner has no blanket profile read');
select is((select count(*) from public.list_admin_candidates(current_setting('test.tenant_a')::uuid)),1::bigint,'owner sees narrow candidate list');
select lives_ok($$select public.create_tenant_admin(current_setting('test.tenant_a')::uuid,'00000000-0000-0000-0000-000000000003')$$,'owner assigns existing community account');
select throws_ok($$select public.create_tenant_admin(current_setting('test.tenant_a')::uuid,'00000000-0000-0000-0000-000000000002')$$,'22023',null,'other tenant account cannot be assigned');
select throws_ok($$select public.create_tenant_admin(current_setting('test.tenant_a')::uuid,'00000000-0000-0000-0000-000000000003')$$,'23505',null,'repeat admin creation cannot overwrite grants');
select lives_ok($$select public.set_auto_approve_users(current_setting('test.tenant_a')::uuid,true)$$,'owner enables auto approval');
select is((select count(*) from public.list_pending_community_accounts(current_setting('test.tenant_a')::uuid)),1::bigint,'setting does not approve existing pending account');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select ok((select not can_approve_users and not can_create_admin from public.tenant_staff_assignments),'new admin flags false');
select throws_ok($$select public.approve_community_account(current_setting('test.tenant_a')::uuid,'00000000-0000-0000-0000-000000000003')$$,'42501',null,'admin role alone cannot approve');
select throws_ok($$select public.create_tenant_admin(current_setting('test.tenant_a')::uuid,'00000000-0000-0000-0000-000000000003')$$,'42501',null,'admin role alone cannot create admins');
select throws_ok($$select public.set_admin_permissions(current_setting('test.tenant_a')::uuid,'00000000-0000-0000-0000-000000000003',true,true)$$,'42501',null,'admin cannot self grant');
select throws_ok($$delete from public.tenant_staff_assignments where role='owner'$$,'42501',null,'admin cannot delete owner');
select throws_ok($$update public.community_accounts set standing='removed'$$,'42501',null,'admin cannot remove community accounts');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
select is(public.join_community(current_setting('test.tenant_a')::uuid),'approved','new join auto approved');
select lives_ok($$select public.save_community_profile(current_setting('test.tenant_a')::uuid,'Member')$$,'member saves profile');
select is((select count(*) from public.community_account_profiles),1::bigint,'no fellow member directory');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.set_admin_permissions(current_setting('test.tenant_a')::uuid,'00000000-0000-0000-0000-000000000003',true,true)$$,'owner grants flags');
select throws_ok($$select public.set_admin_permissions(current_setting('test.tenant_a')::uuid,'00000000-0000-0000-0000-000000000001',false,false)$$,'22023',null,'command cannot disable owner flags');
select lives_ok($$select public.set_website_content_override(current_setting('test.tenant_a')::uuid,'community.hero.heading','Hello community')$$,'owner edits website copy');
select throws_ok($$select public.set_website_content_override(current_setting('test.tenant_a')::uuid,'unknown',null)$$,'22023',null,'unknown key rejected on reset');
select throws_ok($$select public.set_website_content_override(current_setting('test.tenant_a')::uuid,'community.hero.heading',repeat('x',201))$$,'23514',null,'slot text limit enforced');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select lives_ok($$select public.approve_community_account(current_setting('test.tenant_a')::uuid,'00000000-0000-0000-0000-000000000003')$$,'delegated approval works');
select lives_ok($$select public.create_tenant_admin(current_setting('test.tenant_a')::uuid,'00000000-0000-0000-0000-000000000004')$$,'delegated admin creation works');
select is((select count(*) from public.tenant_website_content_overrides),0::bigint,'admin does not gain private copy reads');
select throws_ok($$select public.set_website_content_override(current_setting('test.tenant_a')::uuid,'community.hero.heading','Hacked')$$,'42501',null,'admin flags do not authorize copy editing');
select throws_ok($$select public.set_auto_approve_users(current_setting('test.tenant_a')::uuid,false)$$,'42501',null,'approval flag does not authorize settings');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*) from public.lookup_tenant('community-a')),1::bigint,'anonymous lookup works');
select is((select count(*) from jsonb_object_keys((select to_jsonb(t) from public.lookup_tenant('community-a') t))),7::bigint,'public result has exactly seven fields');
select throws_ok($$select * from public.tenants$$,'42501',null,'anonymous cannot read full tenant rows');
select throws_ok($$select * from public.community_account_profiles$$,'42501',null,'anonymous cannot read profiles');
select throws_ok($$select public.join_community(current_setting('test.tenant_a')::uuid)$$,'42501',null,'anonymous cannot execute join');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.set_tenant_archived(current_setting('test.tenant_a')::uuid,true)$$,'owner archives');
select is((select count(*) from public.lookup_tenant('community-a')),0::bigint,'archived public lookup empty');
select is((select count(*) from public.tenants),1::bigint,'owner retains archived management read');
select lives_ok($$select public.set_website_content_override(current_setting('test.tenant_a')::uuid,'community.hero.heading',null)$$,'owner resets archived copy');
select throws_ok($$select public.join_community(current_setting('test.tenant_a')::uuid)$$,'42501',null,'owner cannot participate while archived');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.list_admin_candidates(current_setting('test.tenant_a')::uuid)$$,'42501',null,'archived admin action denied');
select throws_ok($$select public.set_tenant_archived(current_setting('test.tenant_a')::uuid,false)$$,'42501',null,'admin cannot restore');
select is((select count(*) from public.community_account_profiles),0::bigint,'archive hides participant profile');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.set_tenant_archived(current_setting('test.tenant_a')::uuid,false)$$,'owner restores');
select is((select count(*) from public.tenant_admin_actions where created_by='00000000-0000-0000-0000-000000000003'
  and action in ('community_accounts.update','tenant_staff_assignments.insert')),2::bigint,'delegated actions retain actor');

reset role;
-- Privileged writes still exercise structural safeguards, separate from RLS tests.
select throws_ok($$update public.tenants set slug='changed' where id=current_setting('test.tenant_a')::uuid$$,'23514',null,'slug immutable in database');
select throws_ok($$update public.tenant_staff_assignments set can_approve_users=false where role='owner'$$,'23514',null,'owner false permission rejected in database');
select throws_ok($$delete from public.tenant_staff_assignments where role='owner'$$,'23514',null,'owner deletion rejected in database');
select throws_ok($$update public.tenant_staff_assignments set role='owner' where role='admin'$$,'23514',null,'ownership promotion rejected');
select throws_ok($$delete from public.user_accounts where user_id='00000000-0000-0000-0000-000000000003'$$,'23503',null,'referenced account deletion restricted');
select throws_ok($$delete from auth.users where id='00000000-0000-0000-0000-000000000003'$$,'23503',null,'Auth deletion cannot cascade');
select throws_ok($$update public.tenant_admin_actions set created_by=null$$,'23514',null,'audit history immutable');
select throws_ok($$insert into public.community_account_profiles(tenant_id,user_id,display_name) values
 (current_setting('test.tenant_b')::uuid,'00000000-0000-0000-0000-000000000003','Cross tenant')$$,'23503',null,'profile FK enforces tenant association');
select set_config('request.jwt.claim.sub','',true);
update public.community_accounts set standing='suspended' where tenant_id=current_setting('test.tenant_a')::uuid and user_id='00000000-0000-0000-0000-000000000004';
select is((select updated_by from public.community_accounts where tenant_id=current_setting('test.tenant_a')::uuid and user_id='00000000-0000-0000-0000-000000000004'),null::uuid,'system update explicitly clears latest actor');
select is((select created_by from public.community_accounts where tenant_id=current_setting('test.tenant_a')::uuid and user_id='00000000-0000-0000-0000-000000000004'),'00000000-0000-0000-0000-000000000004'::uuid,'system update preserves creator');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
select is(public.join_community(current_setting('test.tenant_a')::uuid),'suspended','rejoin cannot reset suspended standing');
select throws_ok($$select public.save_community_profile(current_setting('test.tenant_a')::uuid,'Changed')$$,'42501',null,'suspended participant cannot edit profile');
reset role;
set constraints all immediate;
select pass('deferred owner/settings constraints hold for all successful operations');
select throws_ok($$insert into public.tenants(slug,name,country_code,timezone) values ('ownerless','Ownerless','HN','UTC')$$,
 '23514',null,'ownerless tenant cannot complete a transaction');
select throws_ok($$delete from public.tenant_settings where tenant_id=current_setting('test.tenant_a')::uuid$$,
 '23514',null,'tenant cannot lose its settings row');
select * from finish();
rollback;
