begin;
-- No external application Data API consumer remains. Platform schemas and
-- their service roles/defaults stay outside this application-only boundary.
revoke all on all tables in schema public,app_private from public,anon,authenticated,service_role;
revoke all on all sequences in schema public,app_private from public,anon,authenticated,service_role;
revoke all on all functions in schema app_private from public,anon,authenticated,service_role;
revoke all on schema app_private from public,anon,authenticated,service_role;
-- Table revocation does not remove independent column ACLs.
do $$ declare relation record; columns text; begin
  for relation in select c.oid,n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','app_private') and c.relkind in ('r','p','v','m','f') loop
    select string_agg(quote_ident(attname),',' order by attnum) into columns
      from pg_attribute where attrelid=relation.oid and attnum>0 and not attisdropped;
    if columns is not null then
      execute format('revoke select (%s),insert (%s),update (%s),references (%s) on %I.%I from public,anon,authenticated,service_role',
        columns,columns,columns,columns,relation.nspname,relation.relname);
    end if;
  end loop;
end $$;
drop function app_private.is_owner(uuid);
alter default privileges for role postgres in schema public,app_private revoke all on tables from public,anon,authenticated,service_role;
alter default privileges for role postgres in schema public,app_private revoke all on sequences from public,anon,authenticated,service_role;
alter default privileges for role postgres in schema public,app_private revoke execute on functions from public,anon,authenticated,service_role;
-- Per-schema defaults cannot subtract the global PUBLIC function default.
alter default privileges for role postgres revoke execute on functions from public;
notify pgrst,'reload schema';
commit;
