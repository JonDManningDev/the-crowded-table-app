// Catalog metadata only: no credentials, Auth identities, profiles or block rows.
export async function accessCatalog(db) {
  const query=async text=>(await db.query(text)).rows
  const runtime={
    relations:await query(`select n.nspname||'.'||c.relname as relation,
      array(select a.attname from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
        and has_column_privilege('ct_api',c.oid,a.attnum,'SELECT') order by a.attname) as select,
      array(select a.attname from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
        and has_column_privilege('ct_api',c.oid,a.attnum,'INSERT') order by a.attname) as insert,
      array(select a.attname from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
        and has_column_privilege('ct_api',c.oid,a.attnum,'UPDATE') order by a.attname) as update,
      has_table_privilege('ct_api',c.oid,'DELETE') as delete
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','app_private')
      and c.relkind in ('r','p','v','m') order by 1`),
    functions:await query(`select p.oid::regprocedure::text as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname in ('public','app_private') and has_function_privilege('ct_api',p.oid,'EXECUTE') order by 1`),
  }
  return {
    captured_at:new Date().toISOString(),runtime,
    migrations:await query(`select version from supabase_migrations.schema_migrations order by version`),
    relations:await query(`select n.nspname||'.'||c.relname as relation,c.relkind,pg_get_userbyid(c.relowner) as owner,c.relrowsecurity as rls
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','app_private')
      and c.relkind in ('r','p','v','m') order by 1`),
    functions:await query(`select p.oid::regprocedure::text as signature,pg_get_userbyid(p.proowner) as owner,p.prosecdef as definer,p.proconfig as config
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') order by 1`),
    external_relation_grants:await query(`select r.rolname,n.nspname||'.'||c.relname as relation from pg_roles r cross join pg_class c
      join pg_namespace n on n.oid=c.relnamespace where r.rolname in ('anon','authenticated','service_role')
      and n.nspname in ('public','app_private') and c.relkind in ('r','p','v','m')
      and (has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') or has_table_privilege(r.oid,c.oid,'DELETE,TRUNCATE,TRIGGER')) order by 1,2`),
    external_function_grants:await query(`select r.rolname,p.oid::regprocedure::text as signature from pg_roles r cross join pg_proc p
      join pg_namespace n on n.oid=p.pronamespace where r.rolname in ('anon','authenticated','service_role')
      and n.nspname in ('public','app_private') and has_function_privilege(r.oid,p.oid,'EXECUTE') order by 1,2`),
    role:await query(`select rolname,rolcanlogin,rolinherit,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls from pg_roles where rolname='ct_api'`),
    memberships:await query(`select pg_get_userbyid(member) as member,pg_get_userbyid(roleid) as role from pg_auth_members
      where member='ct_api'::regrole or roleid='ct_api'::regrole order by 1,2`),
    defaults:await query(`select pg_get_userbyid(defaclrole) as owner,coalesce(n.nspname,'GLOBAL') as schema,defaclobjtype as type,defaclacl::text as acl
      from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace where defaclrole='postgres'::regrole order by 2,3`),
    schema_permissions:await query(`select r.rolname,n.nspname,has_schema_privilege(r.oid,n.oid,'USAGE') as usage,has_schema_privilege(r.oid,n.oid,'CREATE') as create
      from pg_roles r cross join pg_namespace n where r.rolname in ('anon','authenticated','service_role','ct_api')
      and n.nspname in ('public','app_private') order by 1,2`),
    publications:await query(`select p.pubname,p.puballtables,array(select schemaname||'.'||tablename from pg_publication_tables t where t.pubname=p.pubname order by 1) as tables from pg_publication p order by 1`),
    storage:await query(`select (select count(*)::int from storage.buckets) as buckets,(select count(*)::int from storage.objects) as objects`),
    platform_policies:await query(`select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname in ('storage','realtime') order by 1,2,3`),
  }
}
