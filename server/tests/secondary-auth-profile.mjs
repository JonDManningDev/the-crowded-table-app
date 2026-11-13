import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { AsyncLocalStorage } from 'node:async_hooks'
import pg from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import { createClient } from '@supabase/supabase-js'
import { localStack } from '../../supabase/tests/local-stack.mjs'
import { createCommunityService } from '../src/communities/service.ts'
import { createUserAccountService } from '../src/user-accounts/service.ts'
import { directoryCursors } from '../src/directory-cursors.ts'
import { checkRuntime } from '../src/database.ts'

// Explicit local-only diagnostic. No alternative authorization implementation.
assert.equal(process.argv[2], 'run', 'Pass run to opt into local profiling')
process.loadEnvFile('server/.env.local')
const local = localStack(), endpoint = new URL(process.env.DATABASE_URL)
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname))
assert.equal(endpoint.username, 'ct_api'); assert.equal(endpoint.pathname, '/postgres')
endpoint.host = new URL(local.DB_URL).host
const root = `server/test-results/secondary-auth/${Date.now()}-${randomUUID().slice(0, 8)}`
mkdirSync(root, { recursive: true })
writeFileSync(`${root}/profiler-source.mjs`, readFileSync(import.meta.filename))
const hash = value => createHash('sha256').update(value).digest('hex')
function sources(path = 'server/src') {
  return Object.fromEntries(readdirSync(path, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))
    .flatMap(e => e.isDirectory() ? Object.entries(sources(`${path}/${e.name}`)) : [[`${path}/${e.name}`, hash(readFileSync(`${path}/${e.name}`))]]))
}
const evidence = { source: sources(), profiler: hash(readFileSync(import.meta.filename)),
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  lockfile: hash(readFileSync('package-lock.json')), node: process.version, rows: [], probes: [],
  topology: 'Windows to local Docker loopback; service boundary; pool=1, concurrency=1; no HTTP/token verification' }
const save = () => writeFileSync(`${root}/profile.json`, JSON.stringify(evidence, null, 2))
const admin = new pg.Client({ connectionString: local.DB_URL }), als = new AsyncLocalStorage()
const pools = [], users = [], tenants = []
const auth = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin
let priorConfig, configTouched = false
const configQuery = `select setconfig from pg_db_role_setting where setrole='ct_api'::regrole
  and setdatabase=(select oid from pg_database where datname=current_database())`
const statsSql = `select funcname,calls::int,total_time,self_time from pg_stat_xact_user_functions
  where schemaname='app_private' order by funcname`
const delta = (after, before) => after.map(f => {
  const previous = before.find(p => p.funcname === f.funcname)
  return { funcname: f.funcname, ...Object.fromEntries(['calls','total_time','self_time'].map(k => [k, f[k]-(previous?.[k] ?? 0)])) }
}).filter(f => f.calls > 0)
async function catalog() {
  const q = async sql => (await admin.query(sql)).rows
  return {
    functions: await q(`select p.oid::regprocedure::text as name,pg_get_functiondef(p.oid) as definition,
      p.proacl::text as acl,pg_get_userbyid(p.proowner) as owner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='app_private' order by 1`),
    policies: await q(`select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies
      where schemaname in ('public','app_private') order by 1,2,3`),
    defaults: await q(`select n.nspname,c.relname,a.attname,pg_get_expr(d.adbin,d.adrelid) as expression
      from pg_attrdef d join pg_class c on c.oid=d.adrelid join pg_namespace n on n.oid=c.relnamespace
      join pg_attribute a on a.attrelid=c.oid and a.attnum=d.adnum where n.nspname in ('public','app_private') order by 1,2,3`),
    triggers: await q(`select n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition from pg_trigger t
      join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','app_private') and not t.tgisinternal order by 1,2,3`),
    grants: await q(`select table_schema,table_name,column_name,grantee,privilege_type from information_schema.column_privileges
      where table_schema in ('public','app_private') order by 1,2,3,4,5`),
    roles: await q(`select rolname,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolconfig from pg_roles where rolname='ct_api'`),
  }
}
async function restoreConfig() {
  if (!configTouched) return
  const old = (priorConfig?.setconfig ?? []).find(v => v.startsWith('track_functions='))?.split('=')[1]
  assert.ok(old === undefined || ['none', 'pl', 'all'].includes(old))
  await admin.query(old === undefined ? 'alter role ct_api in database postgres reset track_functions'
    : `alter role ct_api in database postgres set track_functions = '${old}'`)
  configTouched = false
  assert.deepEqual((await admin.query(configQuery)).rows[0], priorConfig)
}
async function runtime(tracked) {
  // Only a fresh diagnostic connection inherits this temporary monitoring default.
  configTouched = true
  await admin.query(`alter role ct_api in database postgres set track_functions = '${tracked ? 'all' : 'none'}'`)
  const pool = new pg.Pool({ connectionString: endpoint.href, max: 1, idleTimeoutMillis: 0, connectionTimeoutMillis: 4000,
    statement_timeout: 5000, lock_timeout: 2000, idle_in_transaction_session_timeout: 8000 })
  pools.push(pool)
  let client
  try { client = await pool.connect() } finally { await restoreConfig() }
  const info = (await client.query(`select current_user,session_user,current_setting('server_version') as version,
    current_setting('transaction_isolation') as isolation,current_setting('track_functions') as tracking`)).rows[0]
  assert.equal(info.current_user, 'ct_api'); assert.equal(info.session_user, 'ct_api')
  assert.equal(info.isolation, 'read committed'); assert.equal(info.tracking, tracked ? 'all' : 'none')
  const query = client.query.bind(client)
  client.query = async (...args) => {
    const r = als.getStore(), text = typeof args[0] === 'string' ? args[0] : args[0].text
    if (r && tracked && text === 'commit') r.functions = delta((await query(statsSql)).rows, r.beforeFunctions)
    const started = performance.now()
    const result = await query(...args)
    if (r) {
      r.queries.push({ sql: text, ms: performance.now() - started })
      if (tracked && text === 'begin') r.beforeFunctions = (await query(statsSql)).rows
      if (tracked && r.detail && text !== 'commit' && text !== 'rollback') {
        r.steps.push({ sql: text, functions: delta((await query(statsSql)).rows, r.beforeFunctions) })
      }
    }
    return result
  }
  client.release()
  const db = new Kysely({ dialect: new PostgresDialect({ pool }) }), cursors = directoryCursors('ab'.repeat(32))
  await checkRuntime(db)
  return { db, pool, tracked, info, communities: createCommunityService({ db, cursors }), accounts: createUserAccountService({ db, cursors }) }
}
const summary = values => {
  const a = [...values].sort((x,y) => x-y)
  return { mean: a.reduce((x,y) => x+y,0)/a.length, p50: a[Math.floor(a.length*.5)], p95: a[Math.floor(a.length*.95)], p99: a[Math.floor(a.length*.99)] }
}
let sequence = 0
async function operation(v, name, actor, tenant) {
  const context = { actorId: actor, requestId: randomUUID() }, params = { tenantId: tenant }
  if (name === 'preferences') { const r = await v.accounts.readAccountPreferences(context); assert.equal(r.status,200); return }
  if (name === 'details') { assert.equal((await v.communities.readDetails(context, params)).id, tenant); return }
  if (name === 'write') {
    const value = `Secondary profile ${++sequence}`
    assert.equal((await v.communities.saveDetails(context, params, { name: value })).name, value); return
  }
  const result = await v.communities.history(context, params, { limit: '20' })
  assert.ok(result.rows.length > 0 && result.rows.length <= 20)
}
async function sample(v, name, actor, tenant, detail = false) {
  const r = { queries: [], functions: [], steps: [], detail }, start = performance.now()
  await als.run(r, () => operation(v, name, actor, tenant))
  r.ms = performance.now() - start
  assert.equal(r.queries.length, { preferences: 4, details: 7, write: 9, history: 7 }[name],
    'Every sample must retain its instrumented physical connection and expected command count')
  if (v.tracked) assert.equal(r.functions.find(f => f.funcname === 'begin_actor_context')?.calls, 1,
    'Each sample must isolate exactly one actor-context call')
  delete r.beforeFunctions
  return r
}
async function cell(v, name, actor, tenant, repeat, fixture) {
  for (let i=0;i<50;i++) await sample(v,name,actor,tenant)
  const samples = []
  // Preserve completed samples if a later request fails; never report a partial cell as complete.
  const row = { name, tracked: v.tracked, repeat, fixture, samples, complete: false }
  evidence.rows.push(row)
  try { for (let i=0;i<300;i++) samples.push(await sample(v,name,actor,tenant)) }
  finally { save() }
  row.complete = true; row.latency = summary(samples.map(r => r.ms))
  row.commands = [...new Set(samples.map(r => r.queries.length))]
  row.scope = samples[0].queries.some(q => q.sql.includes("set_config('ct.tenant_id'"))
    ? summary(samples.flatMap(r => r.queries.filter(q => q.sql.includes("set_config('ct.tenant_id'")).map(q => q.ms))) : null
  row.functionTotals = Object.fromEntries([...new Set(samples.flatMap(r => r.functions.map(f => f.funcname)))].map(name => {
    const fs = samples.map(r => r.functions.find(f => f.funcname === name) ?? { calls: 0, total_time: 0 })
    return [name, { calls: [...new Set(fs.map(f => f.calls))], meanTotalMs: fs.reduce((a,f) => a+f.total_time,0)/samples.length }]
  }))
  save(); console.log(JSON.stringify({ ...row, samples: undefined }))
}
try {
  await admin.connect()
  assert.equal(Number((await admin.query("select count(*) from pg_stat_activity where usename='ct_api'")).rows[0].count), 0,
    'Stop other runtime workloads before profiling')
  priorConfig = (await admin.query(configQuery)).rows[0]
  evidence.before = await catalog(); evidence.priorConfig = priorConfig ?? null
  evidence.migration = (await admin.query('select max(version) as version from supabase_migrations.schema_migrations')).rows[0].version
  const plain = await runtime(false), tracked = await runtime(true)
  evidence.runtime = [plain.info, tracked.info]
  evidence.statistics = (await admin.query(`select current_setting('pg_stat_statements.track',true) as statements,
    current_setting('pg_stat_statements.track_planning',true) as planning`)).rows[0]
  const created = await auth.createUser({ email: `${randomUUID()}@example.test`, password: randomUUID(), email_confirm: true })
  assert.ifError(created.error); const actor = created.data.user.id; users.push(actor)
  const tenant = (await plain.communities.createCommunity({ actorId: actor, requestId: randomUUID() }, {
    slug: `secondary-${randomUUID()}`, name: 'Secondary profile', country: 'HN', timezone: 'UTC', region: '', city: '',
    profile: { displayName: 'Synthetic profiler', bio: null },
  })).tenantId
  tenants.push(tenant)
  for (const name of ['preferences','details','write','history']) {
    const r = await sample(tracked,name,actor,tenant,true)
    evidence.probes.push({ name, ...r }); save()
  }
  for (let repeat=0;repeat<3;repeat++) for (const name of ['preferences','details','write']) {
    for (const v of repeat%2 ? [tracked,plain] : [plain,tracked]) await cell(v,name,actor,tenant,repeat,'one owner/tenant')
  }
  // Isolate history cardinality from prior genuine-write audit growth.
  for (const count of [10,1000]) {
    await admin.query('begin'); await admin.query('set local session_replication_role=replica')
    await admin.query('delete from app_private.tenant_admin_action_categories where action_id in (select id from public.tenant_admin_actions where tenant_id=$1)',[tenant])
    await admin.query('delete from public.tenant_admin_actions where tenant_id=$1',[tenant])
    await admin.query(`insert into public.tenant_admin_actions(id,tenant_id,action,details,created_at,created_by,operation_id)
      select gen_random_uuid(),$1,'tenants.update','{}','2025-01-01'::timestamptz+g*interval '1 second',$2,gen_random_uuid()
      from generate_series(1,$3::int) g`,[tenant,actor,count])
    await admin.query('commit')
    for (let repeat=0;repeat<3;repeat++) for (const v of repeat%2 ? [tracked,plain] : [plain,tracked]) {
      await cell(v,'history',actor,tenant,repeat,`${count} synthetic history rows`)
    }
  }
  evidence.complete = true
} catch (error) {
  evidence.failure = { name: error.name, code: error.code ?? null }
  console.error('Diagnostic failed; sanitized error:', evidence.failure)
  process.exitCode = 1
} finally {
  try {
    await admin.query('rollback'); await restoreConfig()
    await admin.query('begin'); await admin.query('set local session_replication_role=replica')
    await admin.query('delete from app_private.tenant_admin_action_categories where action_id in (select id from public.tenant_admin_actions where tenant_id=any($1::uuid[]))',[tenants])
    await admin.query('delete from app_private.community_account_requests where tenant_id=any($1::uuid[])',[tenants])
    for (const table of ['community_account_permissions','community_account_preferences','tenant_admin_actions','tenant_website_content_overrides','community_account_profiles','community_accounts','tenant_staff_assignments','tenant_settings']) {
      await admin.query(`delete from public.${table} where tenant_id=any($1::uuid[])`,[tenants])
    }
    await admin.query('delete from public.tenants where id=any($1::uuid[])',[tenants])
    await admin.query('delete from public.user_accounts where user_id=any($1::uuid[])',[users])
    await admin.query('commit')
    for (const id of users) assert.ifError((await auth.deleteUser(id)).error)
    assert.equal(Number((await admin.query('select count(*) from auth.users where id=any($1::uuid[])',[users])).rows[0].count),0)
    assert.equal(Number((await admin.query('select count(*) from public.tenants where id=any($1::uuid[])',[tenants])).rows[0].count),0)
    assert.deepEqual(await catalog(), evidence.before)
    assert.deepEqual(sources(), evidence.source)
    evidence.cleanup = 'Owned fixtures absent; catalog/source/config unchanged'
  } finally {
    save(); for (const pool of pools) await pool.end(); await admin.end()
    console.log('Evidence: '+root+'/profile.json')
  }
}
