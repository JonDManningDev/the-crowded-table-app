begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

-- Test newly created objects under the real migration creator, including the
-- built-in global PUBLIC EXECUTE that a schema-scoped revoke cannot remove.
create table public.foundation_acl_probe (value integer);
create sequence public.foundation_sequence_probe;
create function public.foundation_function_probe() returns int language sql as 'select 1';
create function app_private.foundation_private_probe() returns int language sql as 'select 1';
select ok(not has_table_privilege(r,'public.foundation_acl_probe','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN'), r || ' has no new-table privileges')
  from unnest(array['anon','authenticated','ct_api']) r;
select ok(not has_sequence_privilege(r,'public.foundation_sequence_probe','SELECT,USAGE,UPDATE'), r || ' has no new-sequence privileges')
  from unnest(array['anon','authenticated','ct_api']) r;
select ok(not has_function_privilege(r,'public.foundation_function_probe()','EXECUTE')
  and not has_function_privilege(r,'app_private.foundation_private_probe()','EXECUTE'), r || ' has no new-function execution')
  from unnest(array['anon','authenticated','ct_api']) r;
select ok(not has_table_privilege(r,'public.community_standing','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
  and not has_any_column_privilege(r,'public.community_standing','INSERT,UPDATE,REFERENCES'), r || ' cannot change the standing reference')
  from unnest(array['anon','authenticated','ct_api','service_role']) r;
select ok(not has_any_column_privilege(r,'public.community_standing','SELECT'), r || ' cannot bypass the public HTTP projection')
  from unnest(array['anon','authenticated']) r;
select results_eq($$select * from public.community_standing order by standing$$,
  $$values ('approved',true,true,true,true,true,true), ('inactive',false,false,false,false,false,false),
    ('pending',false,false,false,true,false,false), ('suspended',true,true,true,true,false,true)$$,
  'each standing has the six accepted baseline capabilities');
select * from finish();
rollback;
