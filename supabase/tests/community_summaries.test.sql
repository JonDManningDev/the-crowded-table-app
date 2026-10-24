begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) values
 ('10000000-0000-0000-0000-000000000001','list-owner@example.test',now()),
 ('10000000-0000-0000-0000-000000000002','list-viewer@example.test',now()),
 ('10000000-0000-0000-0000-000000000003','list-other@example.test',now()),
 ('10000000-0000-0000-0000-000000000004','list-unverified@example.test',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.create_tenant('list-' || n,'List ' || n,'HN','UTC') from generate_series(1,8) n;
select is((select count(*) from public.my_community_summaries),8::bigint,'owner without membership sees all owned communities');
select is((select count(*) from public.my_community_summaries where is_owned and is_managed and not is_member),8::bigint,'owner flags support All Managed Owned');
select is((select count(*) from public.tenants where created_by=auth.uid()),8::bigint,'owner retains base audit identity reads');
reset role;
insert into public.community_accounts(tenant_id,user_id,standing)
select id,'10000000-0000-0000-0000-000000000002',case slug when 'list-1' then 'pending' when 'list-2' then 'approved' when 'list-3' then 'suspended' when 'list-4' then 'removed' else 'approved' end
from public.tenants where slug in ('list-1','list-2','list-3','list-4','list-5','list-6','list-7');
insert into public.tenant_staff_assignments(tenant_id,user_id,role,status)
select id,'10000000-0000-0000-0000-000000000002','admin',case when slug='list-6' then 'revoked' else 'active' end
from public.tenants where slug in ('list-4','list-5','list-6');
update public.tenants set operational_status='archived' where slug in ('list-3','list-5','list-6');
insert into public.community_accounts(tenant_id,user_id,standing)
select id,'10000000-0000-0000-0000-000000000003','approved' from public.tenants where slug='list-8';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select count(*) from public.my_community_summaries),6::bigint,'qualifying current relationships only, no duplicates');
select results_eq($$select name from public.my_community_summaries order by name$$,
 $$values ('List 1'),('List 2'),('List 3'),('List 5'),('List 6'),('List 7')$$,'pending approved suspended included; removed and unrelated excluded');
select is((select count(*) from public.my_community_summaries where is_owned or is_member),6::bigint,'All includes current memberships');
select is((select count(*) from public.my_community_summaries where is_managed),1::bigint,'Managed requires active staff and excludes removed member');
select is((select count(*) from public.my_community_summaries where is_owned),0::bigint,'staff is not owner');
select ok((select is_member and not is_managed from public.my_community_summaries where name='List 6'),'revocation retains All membership');
select is((select count(*) from public.my_community_summaries where operational_status='archived'),3::bigint,'archived summaries remain visible');
select is((select count(*) from public.community_accounts),7::bigint,'self relationships include archived and retained removed rows');
select is((select count(*) from public.community_accounts where user_id<>auth.uid()),0::bigint,'no other memberships exposed');
select is((select count(*) from public.tenant_staff_assignments),3::bigint,'self active/revoked archived assignments readable');
select is((select count(*) from public.tenant_staff_assignments where user_id<>auth.uid()),0::bigint,'no other staff exposed');
select is((select count(*) from public.tenants),0::bigint,'base tenant rows and audit IDs remain owner-only');
select throws_ok($$select created_by from public.my_community_summaries$$,'42703',null,'view excludes created_by');
select throws_ok($$select updated_by from public.my_community_summaries$$,'42703',null,'view excludes updated_by');
select is((select count(*) from public.tenant_settings),0::bigint,'settings remain owner-only');
select is((select count(*) from public.tenant_admin_actions),0::bigint,'audit actions remain owner-only');
select is((select count(*) from public.community_account_profiles),0::bigint,'profiles not expanded by relationship read');
select ok(not has_table_privilege('authenticated','public.my_community_summaries','INSERT,UPDATE,DELETE'),'view writes not granted');
select ok(not has_table_privilege('authenticated','public.tenants','INSERT,UPDATE,DELETE'),'tenant writes still denied');
select throws_ok($$update public.my_community_summaries set name='changed'$$,'55000',null,'view rejects writes');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select results_eq($$select name from public.my_community_summaries$$,$$values ('List 8')$$,'different caller sees only own relationship');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select is((select count(*) from public.my_community_summaries),0::bigint,'unverified caller sees nothing');
select is((select count(*) from public.community_accounts),0::bigint,'unverified self reads denied');
select set_config('request.jwt.claim.sub','',true);
select is((select count(*) from public.my_community_summaries),0::bigint,'missing identity sees nothing');
set local role anon;
select throws_ok($$select * from public.my_community_summaries$$,'42501',null,'anonymous cannot query view');
reset role;
select ok((select reloptions @> array['security_barrier=true','security_invoker=false'] from pg_class where oid='public.my_community_summaries'::regclass),'view security options explicit');
set constraints all immediate;
select * from finish();
rollback;
