// Shared metadata queries for local review and explicitly opted-in hosted tests.
import { accessCatalog } from './access-catalog.mjs'

const metadata = {
  definitions: `select p.oid::regprocedure::text as signature,pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') order by 1`,
  policies: `select * from pg_policies where schemaname in ('public','app_private') order by schemaname,tablename,policyname`,
  triggers: `select t.tgrelid::regclass::text as relation,t.tgname,t.tgfoid::regprocedure::text as function,pg_get_triggerdef(t.oid) as definition
    from pg_trigger t join pg_proc p on p.oid=t.tgfoid join pg_namespace n on n.oid=p.pronamespace
    where not t.tgisinternal and n.nspname in ('public','app_private') order by 1,2`,
  column_defaults: `select n.nspname||'.'||c.relname as relation,a.attname as column,pg_get_expr(d.adbin,d.adrelid) as expression
    from pg_attrdef d join pg_class c on c.oid=d.adrelid join pg_namespace n on n.oid=c.relnamespace
    join pg_attribute a on a.attrelid=c.oid and a.attnum=d.adnum where n.nspname in ('public','app_private') order by 1,2`,
  function_dependencies: `select p.oid::regprocedure::text as function,pg_describe_object(d.classid,d.objid,d.objsubid) as dependent,d.deptype
    from pg_depend d join pg_proc p on p.oid=d.refobjid join pg_namespace n on n.oid=p.pronamespace
    where d.refclassid='pg_proc'::regclass and n.nspname in ('public','app_private') order by 1,2,3`,
}

// Batch metadata into one database snapshot and round trip. SQL-generated JSON
// also preserves arrays consistently across pg and the management CLI driver.
export async function policyCatalog(query) {
  const statements = []
  await accessCatalog({ query: async text => { statements.push(text); return { rows: [] } } })
  statements.push(...Object.values(metadata))
  const columns = statements.map((text, i) => `coalesce((select jsonb_agg(to_jsonb(q)) from (${text}) q),'[]'::jsonb) as q${i}`)
  const [result] = await query('select ' + columns.join(','))
  let index = 0
  const catalog = await accessCatalog({ query: async () => ({ rows: result['q' + index++] }) })
  for (const name of Object.keys(metadata)) catalog[name] = result['q' + index++]
  return catalog
}

export async function applicationSnapshot(query) {
  const relations = await query(`select format('%I.%I',n.nspname,c.relname) as name from pg_class c
    join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','app_private') and c.relkind in ('r','p') order by 1`)
  const parts = relations.map(({ name }) => `select '${name}' as relation,count(*)::int as rows,
    md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by to_jsonb(t)::text),'')) as checksum from ${name} t`)
  // Fixed timezone makes timestamp JSON stable without revealing row contents.
  return query(`select set_config('TimeZone','UTC',true); ${parts.join(' union all ')} order by relation`)
}

export function normalizedCatalog(value) {
  // PostgreSQL stores function bodies with the migration file's newline style.
  if (Array.isArray(value)) return value.map(normalizedCatalog)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizedCatalog(entry)]))
  // pg leaves name[] as array text, whereas SQL JSON represents it as an array.
  if (typeof value === 'string' && /^\{[^{}"]*\}$/.test(value)) return value.slice(1,-1).split(',').filter(Boolean)
  return typeof value === 'string' ? value.replaceAll('\r\n','\n') : value
}
