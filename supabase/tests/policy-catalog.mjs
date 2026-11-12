// Read-only reconciliation of the completed local policy migration. No data,
// credentials or Auth identities are exported.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import pg from 'pg'
import { localStack } from './local-stack.mjs'
import { accessCatalog } from './access-catalog.mjs'

const db = new pg.Client({ connectionString: localStack().DB_URL })
try {
  await db.connect()
  const catalog = await accessCatalog(db)
  const query = async text => (await db.query(text)).rows
  catalog.definitions = await query(`select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','app_private') order by 1`)
  catalog.policies = await query(`select * from pg_policies where schemaname in ('public','app_private')
    order by schemaname,tablename,policyname`)
  // Include the platform-owned Auth insertion trigger, not just public tables.
  catalog.triggers = await query(`select t.tgrelid::regclass::text as relation,t.tgname,
      t.tgfoid::regprocedure::text as function,pg_get_triggerdef(t.oid) as definition
    from pg_trigger t join pg_proc p on p.oid=t.tgfoid join pg_namespace n on n.oid=p.pronamespace
    where not t.tgisinternal and n.nspname in ('public','app_private') order by 1,2`)
  catalog.column_defaults = await query(`select n.nspname||'.'||c.relname as relation,a.attname as column,
      pg_get_expr(d.adbin,d.adrelid) as expression
    from pg_attrdef d join pg_class c on c.oid=d.adrelid join pg_namespace n on n.oid=c.relnamespace
    join pg_attribute a on a.attrelid=c.oid and a.attnum=d.adnum
    where n.nspname in ('public','app_private') order by 1,2`)
  catalog.function_dependencies = await query(`select p.oid::regprocedure::text as function,
      pg_describe_object(d.classid,d.objid,d.objsubid) as dependent,d.deptype
    from pg_depend d join pg_proc p on p.oid=d.refobjid join pg_namespace n on n.oid=p.pronamespace
    where d.refclassid='pg_proc'::regclass and n.nspname in ('public','app_private') order by 1,2,3`)
  // pg_depend does not enumerate calls in string-bodied SQL/PLpgSQL functions;
  // definitions are exported too, and require review alongside these edges.
  const retained = ['active_tenant(uuid)','attribute_command()','auth_identity_eligible(uuid,boolean)',
    'begin_actor_context(uuid,uuid,uuid)','command_scope()','guard_community_sharing()','is_approved_owner(uuid)','lock_eligible_actor()',
    'my_community_relationships()','protect_invariants()','protect_staff_assignment()',
    'provision_user_account()','reject_audit_mutation()','require_tenant_roots()','stamp_audit()',
    'stamp_community_revision()','stamp_first_approval()','validate_command_details()','verified_user()']
  assert.deepEqual(catalog.functions.map(f => f.signature), retained.map(f => 'app_private.' + f).sort())
  assert.deepEqual(catalog.runtime, JSON.parse(readFileSync(new URL('../../server/access-runtime-manifest.json', import.meta.url))))
  assert.deepEqual(catalog.external_relation_grants, [])
  assert.deepEqual(catalog.external_function_grants, [])
  assert.equal(catalog.migrations.at(-1).version, '20261112000100')
  // Export a review candidate without overwriting the checked-in test fixture.
  const directory = new URL('../../server/test-results/policy/', import.meta.url)
  mkdirSync(directory, { recursive: true })
  writeFileSync(new URL('local-catalog.json', directory), JSON.stringify(catalog, null, 2) + '\n')
  console.log('PASS final local catalog: 19 reviewed functions, exact runtime manifest, zero external grants; all trigger/RLS/default dependencies exported')
} finally { await db.end() }
