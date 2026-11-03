begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) values
 ('20000000-0000-0000-0000-000000000001','direct-owner@example.test',now()),
 ('20000000-0000-0000-0000-000000000002','direct-editor@example.test',now()),
 ('20000000-0000-0000-0000-000000000003','direct-other@example.test',now()),
 ('20000000-0000-0000-0000-000000000004','direct-unverified@example.test',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select set_config('test.direct_a',public.create_tenant('direct-a','Direct A','HN','UTC')::text,true);
select ok((select can_modify_content from public.tenant_staff_assignments),'owner content flag initialized true');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
select set_config('test.direct_b',public.create_tenant('direct-b','Direct B','HN','UTC',null,null,true)::text,true);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select public.join_community(current_setting('test.direct_a')::uuid);
insert into public.community_account_profiles(tenant_id,display_name,bio)
  values (current_setting('test.direct_a')::uuid,'Editor','Private bio');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select public.create_tenant_admin(current_setting('test.direct_a')::uuid,'20000000-0000-0000-0000-000000000002');
select ok((select not can_modify_content from public.tenant_staff_assignments where role='admin'),'admin content flag defaults false');
select lives_ok($$update public.tenants set name=' Renamed ',city=' ',state_province=' District ' where id=current_setting('test.direct_a')::uuid$$,'owner updates tenant details directly');
select is((select name from public.tenants),'Renamed','tenant name normalized');
select is((select city from public.tenants),null::text,'blank city normalized');
select is((select state_province from public.tenants),'District','region normalized');
select throws_ok($$update public.tenants set timezone='invalid'$$,'23514',null,'invalid timezone rejected');
select throws_ok($$update public.tenants set operational_status='archived'$$,'42501',null,'direct lifecycle change denied');
select throws_ok($$update public.tenants set created_by=null$$,'42501',null,'tenant actor spoofing denied');
select throws_ok($$update public.tenant_staff_assignments set can_modify_content=true$$,'42501',null,'direct permission grants denied');
select lives_ok($$select public.set_admin_permissions(current_setting('test.direct_a')::uuid,'20000000-0000-0000-0000-000000000002',p_can_modify_content=>true)$$,'owner grants content independently');
select ok((select can_modify_content and not can_approve_users and not can_create_admin from public.tenant_staff_assignments where role='admin'),'content grant leaves other flags unchanged');
select public.set_admin_permissions(current_setting('test.direct_a')::uuid,'20000000-0000-0000-0000-000000000002',true,true);
select ok((select can_modify_content from public.tenant_staff_assignments where role='admin'),'legacy four-argument permission edit preserves content grant');
select public.set_admin_permissions(current_setting('test.direct_a')::uuid,'20000000-0000-0000-0000-000000000002',false,false);

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select lives_ok($$insert into public.tenant_website_content_overrides(tenant_id,content_key,text_value)
 values (current_setting('test.direct_a')::uuid,'community.hero.heading','First')$$,'delegated editor creates override');
select lives_ok($$insert into public.tenant_website_content_overrides(tenant_id,content_key,text_value)
 values (current_setting('test.direct_a')::uuid,'community.hero.heading','Second') on conflict(tenant_id,content_key)
 do update set tenant_id=excluded.tenant_id,content_key=excluded.content_key,text_value=excluded.text_value$$,'delegated editor upserts override');
select is((select text_value from public.tenant_website_content_overrides),'Second','editor reads own community content');
select is((select updated_by from public.tenant_website_content_overrides),auth.uid(),'content attribution trusted');
select is((select count(*) from public.tenant_admin_actions),0::bigint,'editor gains no audit-history access');
select is((select count(*) from public.tenant_admin_candidates),0::bigint,'content flag grants no candidate access');
select is((select count(*) from public.tenant_pending_community_accounts),0::bigint,'content flag grants no approval queue access');
select throws_ok($$select public.set_admin_permissions(current_setting('test.direct_a')::uuid,auth.uid(),true,true,true)$$,'42501',null,'editor cannot self-grant');
select throws_ok($$select public.set_auto_approve_users(current_setting('test.direct_a')::uuid,true)$$,'42501',null,'editor cannot change settings');
select throws_ok($$select public.set_tenant_archived(current_setting('test.direct_a')::uuid,true)$$,'42501',null,'editor cannot archive');
with edited as (update public.tenants set name='Unauthorized' returning 1)
 select is((select count(*) from edited),0::bigint,'editor cannot edit tenant identity');
select throws_ok($$insert into public.tenant_website_content_overrides(tenant_id,content_key,text_value)
 values (current_setting('test.direct_b')::uuid,'community.hero.heading','Cross tenant')$$,'42501',null,'cross-tenant content creation denied');
select throws_ok($$update public.tenant_website_content_overrides set tenant_id=current_setting('test.direct_b')::uuid$$,'23514',null,'content cannot move tenants');
select throws_ok($$update public.tenant_website_content_overrides set content_key='community.hero.description'$$,'23514',null,'content key immutable');
select throws_ok($$update public.tenant_website_content_overrides set updated_by=null$$,'42501',null,'content audit write denied');
select throws_ok($$insert into public.tenant_website_content_overrides(tenant_id,content_key,text_value)
 values (current_setting('test.direct_a')::uuid,'unknown','No')$$,'23514',null,'unknown content key rejected');
select throws_ok($$update public.tenant_website_content_overrides set text_value=' '$$,'23514',null,'blank content rejected');
with edited as (delete from public.tenant_website_content_overrides where content_key='community.hero.heading' returning 1)
 select is((select count(*) from edited),1::bigint,'editor resets override');
insert into public.tenant_website_content_overrides(tenant_id,content_key,text_value)
 values (current_setting('test.direct_a')::uuid,'community.hero.heading','Restored');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select public.set_admin_permissions(current_setting('test.direct_a')::uuid,'20000000-0000-0000-0000-000000000002',true,true);
select is((select count(*) from public.tenant_admin_candidates),1::bigint,'owner sees candidate without blanket profile read');
select is((select count(*) from public.community_account_profiles),0::bigint,'owner base profile reads remain self-only');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select is((select count(*) from public.tenant_admin_candidates),1::bigint,'delegated grant permits candidate projection');
select is((select count(*) from public.tenant_pending_community_accounts),1::bigint,'delegated approval permits pending projection');
select is((select count(*) from public.tenant_admin_candidates where tenant_id=current_setting('test.direct_b')::uuid),0::bigint,'candidate projection isolates tenants');
select is((select count(*) from public.tenant_pending_community_accounts where tenant_id=current_setting('test.direct_b')::uuid),0::bigint,'pending projection isolates tenants');
select throws_ok($$select bio from public.tenant_admin_candidates$$,'42703',null,'candidate view excludes bio');
select throws_ok($$select email from public.tenant_admin_candidates$$,'42703',null,'candidate view excludes email');
select throws_ok($$select created_by from public.tenant_pending_community_accounts$$,'42703',null,'pending view excludes audit identities');
select ok(not has_table_privilege('authenticated','public.tenant_admin_candidates','INSERT,UPDATE,DELETE'),'candidate view read-only');
select ok(not has_table_privilege('authenticated','public.tenant_pending_community_accounts','INSERT,UPDATE,DELETE'),'pending view read-only');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select public.set_tenant_archived(current_setting('test.direct_a')::uuid,true);
select lives_ok($$update public.tenants set name='Archived owner edit'$$,'owner edits archived details');
select lives_ok($$update public.tenant_website_content_overrides set text_value='Archived owner edit'$$,'owner edits archived content');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select is((select count(*) from public.tenant_admin_candidates),0::bigint,'archived candidate projection empty');
select is((select count(*) from public.tenant_pending_community_accounts),0::bigint,'archived pending projection empty');
select is((select count(*) from public.tenant_website_content_overrides),0::bigint,'delegated archived content read denied');
with edited as (update public.tenant_website_content_overrides set text_value='No' returning 1)
 select is((select count(*) from edited),0::bigint,'delegated archived update denied');
with edited as (delete from public.tenant_website_content_overrides returning 1)
 select is((select count(*) from edited),0::bigint,'delegated archived reset denied');
select throws_ok($$insert into public.tenant_website_content_overrides(tenant_id,content_key,text_value)
 values (current_setting('test.direct_a')::uuid,'community.hero.description','No')$$,'42501',null,'delegated archived creation denied');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select public.set_tenant_archived(current_setting('test.direct_a')::uuid,false);
select public.set_admin_permissions(current_setting('test.direct_a')::uuid,'20000000-0000-0000-0000-000000000002',p_can_modify_content=>false);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
with edited as (delete from public.tenant_website_content_overrides returning 1)
 select is((select count(*) from edited),0::bigint,'revoked content grant cannot reset');
select is((select count(*) from public.tenant_admin_candidates),1::bigint,'content revocation preserves independent candidate grant');
reset role;
update public.tenant_staff_assignments set status='revoked',can_modify_content=true where role='admin';
set local role authenticated;
select is((select count(*) from public.tenant_website_content_overrides),0::bigint,'revoked assignment invalidates a retained content flag');
select is((select count(*) from public.tenant_admin_candidates),0::bigint,'revoked staff cannot list candidates');
select is((select count(*) from public.tenant_pending_community_accounts),0::bigint,'revoked staff cannot read approval queue');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true);
select is((select count(*) from public.tenant_admin_candidates),0::bigint,'unverified caller sees no candidates');
set local role anon;
select throws_ok($$select * from public.tenant_website_content_overrides$$,'42501',null,'content not public');
select throws_ok($$select * from public.tenant_admin_candidates$$,'42501',null,'candidate view not public');
select throws_ok($$select * from public.tenant_pending_community_accounts$$,'42501',null,'pending view not public');
reset role;
insert into public.community_accounts(tenant_id,user_id) values
 (current_setting('test.direct_a')::uuid,'20000000-0000-0000-0000-000000000004'),
 (current_setting('test.direct_a')::uuid,'20000000-0000-0000-0000-000000000003');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select is((select count(*) from public.tenant_admin_candidates where user_id='20000000-0000-0000-0000-000000000004'),0::bigint,'candidate list excludes unverified target');
select is((select count(*) from public.tenant_pending_community_accounts where user_id='20000000-0000-0000-0000-000000000004'),1::bigint,'pending projection preserves original standing-only target filter');
select is((select display_name from public.tenant_admin_candidates where user_id='20000000-0000-0000-0000-000000000003'),null::text,'missing profile does not exclude a verified candidate');
reset role;
select throws_ok($$update public.tenant_staff_assignments set can_modify_content=false where role='owner'$$,'23514',null,'owner content permission immutable');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('save_user_account_profile','set_user_account_preferences',
 'save_community_profile','set_community_global_profile_visibility','update_tenant_details',
 'set_website_content_override','list_admin_candidates','list_pending_community_accounts')),0::bigint,'superseded RPCs removed');
set constraints all immediate;
select * from finish();
rollback;
