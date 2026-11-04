begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok(not has_schema_privilege(r,'app_private','USAGE,CREATE'),r||' has no private schema access')
  from unnest(array['anon','authenticated','service_role']) r;
select ok(not exists(select from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private')
  and has_function_privilege(r,p.oid,'EXECUTE')),r||' has no application routine execution') from unnest(array['anon','authenticated','service_role']) r;
select ok(not exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','app_private') and c.relkind in ('r','p','v','m')
  and (has_any_column_privilege(r,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') or has_table_privilege(r,c.oid,'DELETE,TRUNCATE,TRIGGER'))),r||' has no application table or column access')
  from unnest(array['anon','authenticated','service_role']) r;
select ok(not has_schema_privilege('ct_api','public','CREATE') and not has_schema_privilege('ct_api','app_private','CREATE'),'runtime cannot create application objects');
select ok(not exists(select from pg_auth_members where member='ct_api'::regrole),'runtime has no inherited or SET ROLE memberships');
select ok(not exists(select from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.prosecdef
  and (pg_get_userbyid(p.proowner)<>'postgres' or not coalesce(p.proconfig @> array['search_path=""'],false))),'definers retain reviewed owner and empty search path');
select ok(to_regprocedure('app_private.is_owner(uuid)') is null,'unused legacy owner helper removed');
create table public.audit_future_table(id bigint);
create sequence public.audit_future_sequence;
create function public.audit_future_function() returns boolean language sql as $$select true$$;
create table app_private.audit_future_table(id bigint);
create sequence app_private.audit_future_sequence;
create function app_private.audit_future_function() returns boolean language sql as $$select true$$;
select ok(not has_any_column_privilege(r,s||'.audit_future_table','SELECT,INSERT,UPDATE') and not has_table_privilege(r,s||'.audit_future_table','DELETE'),r||' has no future table grant in '||s)
  from unnest(array['anon','authenticated','service_role','ct_api']) r cross join unnest(array['public','app_private']) s;
select ok(not has_sequence_privilege(r,s||'.audit_future_sequence','USAGE,SELECT,UPDATE'),r||' has no future sequence grant in '||s)
  from unnest(array['anon','authenticated','service_role','ct_api']) r cross join unnest(array['public','app_private']) s;
select ok(not has_function_privilege(r,s||'.audit_future_function()','EXECUTE'),r||' has no future function grant in '||s)
  from unnest(array['anon','authenticated','service_role','ct_api']) r cross join unnest(array['public','app_private']) s;
select * from finish();
rollback;
