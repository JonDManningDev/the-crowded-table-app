import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cpus, platform, release, totalmem } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'

const [, , originArg, mode = 'screen'] = process.argv
assert.ok(originArg, 'Pass the absolute path of the original checkout')
assert.ok(['screen', 'history-tail'].includes(mode))
const followup = mode === 'history-tail'
const origin = resolve(originArg)
const pin = join(origin, 'server/test-results/tenant-setup-19/baseline-d38872e')
const label = new Date().toISOString().replaceAll(/[:.]/g, '-')
const output = join(origin, 'server/test-results/tenant-setup-22', 'benchmark-' + label)
const sources = new URL('../test-results/tenant-setup-22/benchmark-source-' + label + '/', import.meta.url)
mkdirSync(output, { recursive: true })

const baselineRevision = 'd38872eb1050e58153a2d5e9d37a06b850cd510c'
const candidateRevision = 'd2db5a555faa1227757b43193b18d2d10ba254be'
// The original screen checked the #19 checkout bytes against their manifest
// and the normalized checkout text against Git before recording these hashes.
const recordedSources = 'benchmark-2026-11-13T14-23-07-950Z/sources.json'
const recordedSourcesHash = '461d434104e640291c59d868877955ddfba6ff52127f4ef222e3744a870a4d16'
const baselineInputs = {
  'source-files.json': '96d8bdcd2d911633049e4cbae819b1fe797bc3d494f3f806da5a856c215dfdd5',
  'application-schema.sql': '07e5bd2da9e83b96165c46c760a8a122184e1f4939a7010533272a7c8097fb81',
  'migrations.txt': 'abe202c596ada7af6ce345949ff938fe9d2beec5b4dc41026e5743af5b52bf4e',
  'historical-artifacts.json': '46553e5f9ed708316e838d845af5c867e6fb4b3a56c9bfe6cae069e1edfca963',
}
const migration = 'supabase/migrations/20261112000100_initial_tenant_context.sql'
const warmups = followup ? 96 : 48
const samples = followup ? 400 : 160
const repeats = followup ? 8 : 6
const probeSamples = 12
const poolMax = 4
const poolOptions = { max: poolMax, connectionTimeoutMillis: 4000, statement_timeout: 5000,
  lock_timeout: 2000, idle_in_transaction_session_timeout: 8000, idleTimeoutMillis: 0 }
const workloads = followup ? ['history'] : ['history', 'details', 'preferences', 'write']
const cells = workloads.flatMap(endpoint => ['service', 'http'].flatMap(transport =>
  (followup ? [poolMax] : [1, poolMax]).map(concurrency => ({ endpoint, transport, concurrency }))))
const variantOrder = (cell, repeat) => (repeat + cells.indexOf(cell)) % 2
  ? ['candidate', 'baseline']
  : ['baseline', 'candidate']
for (const cell of cells) {
  const first = Array.from({ length: repeats }, (_, repeat) => variantOrder(cell, repeat)[0])
  assert.equal(first.filter(name => name === 'baseline').length, repeats / 2)
  assert.ok(first.slice(1).every((name, index) => name !== first[index]))
}
const schedule = Array.from({ length: repeats }, (_, repeat) => workloads.flatMap(endpoint => {
  const group = cells.filter(cell => cell.endpoint === endpoint)
  const rotation = repeat % group.length
  return group.slice(rotation).concat(group.slice(0, rotation)).map(cell => ({ ...cell, order: variantOrder(cell, repeat) }))
}))
const expected = { baseline: { details: 7, history: 7, write: 9, preferences: 4, noop: 8, cursor: 3 },
  candidate: { details: 6, history: 6, write: 8, preferences: 4, noop: 7, cursor: 3 } }
const tokenId = randomUUID().replaceAll('-', '')
const names = { baseline: 'ct_bench22_b_' + tokenId, candidate: 'ct_bench22_c_' + tokenId }
const run = { metadata: { label, mode, names, poolOptions, repeats, warmups, samples, probeSamples }, rows: [], diagnostics: [] }
const json = (path, data) => writeFileSync(join(output, path), JSON.stringify(data, null, 2) + '\n')
const save = () => json('benchmark.json', run)
const hash = value => createHash('sha256').update(value).digest('hex')
const lf = value => value.toString('utf8').replaceAll('\r\n', '\n')
const canonicalDump = value => lf(value).replace(/^\\(?:un)?restrict [a-zA-Z0-9]+\n/gm, '')
// Restore flattens the nested AND node in this CHECK. PostgreSQL 17's
// deparser then prints different parentheses around the same operands.
const comparableSchema = value => canonicalDump(value).replace(
  'CONSTRAINT tenants_slug_check CHECK ((((char_length(slug) >= 3) AND (char_length(slug) <= 63)) AND ',
  'CONSTRAINT tenants_slug_check CHECK (((char_length(slug) >= 3) AND (char_length(slug) <= 63) AND ',
)
const parseJson = bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''))
const read = path => parseJson(readFileSync(path))
function verifiedBytes(path, sha256) {
  const bytes = readFileSync(path)
  assert.equal(hash(bytes), sha256, path)
  return bytes
}
const baselineInput = name => verifiedBytes(join(pin, name), baselineInputs[name])
const processOutput = (command, args, options = {}) => execFileSync(command, args, {
  maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'], ...options,
})
const git = args => processOutput('git', args, { cwd: origin })
const docker = (args, input) => processOutput('docker', ['exec', '-i', 'supabase_db_the-crowded-table-app', ...args], { input })
const dump = (name, args) => docker(['pg_dump', '-U', 'postgres', '-d', name, ...args])
const load = (name, input, role = 'postgres') => docker(['psql', '-Xq', '-v', 'ON_ERROR_STOP=1', '-U', role, '-d', name], input)
const sqlName = value => {
  assert.match(value, /^ct_bench22_[bc]_[a-f0-9]{32}$/)
  return '"' + value + '"'
}

function checkHistory() {
  const history = parseJson(baselineInput('historical-artifacts.json'))
  for (const { path, sha256 } of history) assert.equal(hash(readFileSync(join(origin, path))), sha256, path)
  return history.length
}

function pinSources() {
  const prior = parseJson(baselineInput('source-files.json')).filter(({ path }) =>
    path.startsWith('server/src/') || path.startsWith('supabase/migrations/') || path === 'package-lock.json')
  const recorded = parseJson(verifiedBytes(join(origin, 'server/test-results/tenant-setup-22', recordedSources), recordedSourcesHash))
  assert.equal(readFileSync(join(pin, 'git-revision.txt'), 'utf8').trim(), baselineRevision)
  const pinned = {}
  for (const [name, revision] of Object.entries({ baseline: baselineRevision, candidate: candidateRevision })) {
    const list = lf(git(['ls-tree', '-r', '--name-only', revision, '--', 'server/src', 'supabase/migrations', 'package-lock.json'])).trim().split('\n')
    assert.equal(recorded[name].revision, revision)
    assert.deepEqual(list, Object.keys(recorded[name].files))
    const files = {}
    for (const path of list) {
      const bytes = git(['show', revision + ':' + path])
      files[path] = hash(bytes)
      assert.equal(files[path], recorded[name].files[path], path)
      if (!path.startsWith('server/src/')) continue
      const destination = new URL(name + '/' + path.slice('server/src/'.length), sources)
      mkdirSync(dirname(fileURLToPath(destination)), { recursive: true })
      writeFileSync(destination, bytes, { flag: 'wx' })
      assert.equal(hash(readFileSync(destination)), files[path])
    }
    pinned[name] = { revision, files }
  }
  assert.deepEqual(prior.map(({ path }) => path).sort(), Object.keys(pinned.baseline.files).sort())
  for (const [path, sha] of Object.entries(pinned.baseline.files)) {
    if (!path.startsWith('server/src/')) assert.equal(pinned.candidate.files[path], sha, path)
  }
  assert.deepEqual(Object.keys(pinned.candidate.files).filter(path =>
    !path.startsWith('server/src/') && !(path in pinned.baseline.files)), [migration])
  const worktreeLock = readFileSync(new URL('../../package-lock.json', import.meta.url))
  assert.equal(hash(lf(worktreeLock)), hash(lf(git(['show', candidateRevision + ':package-lock.json']))))
  run.metadata.worktreeLockHash = hash(worktreeLock)
  run.metadata.sourceProvenance = { baselineInputs, recordedSources, recordedSourcesHash }
  json('sources.json', pinned)
  return pinned
}

const { localStack } = await import(pathToFileURL(join(origin, 'supabase/tests/local-stack.mjs')).href)
process.loadEnvFile(join(origin, 'server/.env.local'))
const local = localStack()
const runtimeUrl = new URL(process.env.DATABASE_URL)
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(runtimeUrl.hostname))
assert.equal(runtimeUrl.username, 'ct_api')
assert.equal(runtimeUrl.pathname, '/postgres')
runtimeUrl.host = new URL(local.DB_URL).host
const authOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
const authAdmin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, authOptions).auth.admin
const auth = createClient(local.API_URL, local.ANON_KEY, authOptions).auth
const admin = new pg.Client({ connectionString: local.DB_URL })
const measurements = new AsyncLocalStorage()
const variants = []
const owned = new Set()
const tenants = []
let owner
let email
let password
let bearer
let beforeRuntimeConfig

function databaseUrl(name, credentials = runtimeUrl) {
  sqlName(name)
  const url = new URL(credentials)
  url.pathname = '/' + name
  return url.href
}

async function inspect(name, query, args) {
  const client = new pg.Client({ connectionString: databaseUrl(name, local.DB_URL) })
  await client.connect()
  try {
    return (await client.query(query, args)).rows
  } finally {
    await client.end()
  }
}

async function localConfig() {
  return (await admin.query(
    'select setdatabase, setrole, setconfig from pg_db_role_setting order by 1,2',
  )).rows
}

async function rollbackCounters() {
  await admin.query('select pg_stat_clear_snapshot()')
  return (await admin.query(
    'select datname, xact_rollback::int as rollbacks, deadlocks::int from pg_stat_database where datname=any($1::text[]) order by datname',
    [Object.values(names)],
  )).rows
}

class DiagnosticPool extends pg.Pool {
  async connect() {
    const client = await super.connect()
    if (!client.recordSubmissions) {
      const query = client.query.bind(client)
      client.query = (...args) => {
        const record = measurements.getStore()
        const statement = (typeof args[0] === 'string' ? args[0] : args[0].text).trim()
        if (record) {
          if (statement.toLowerCase() === 'begin') record.attempts.push([])
          assert.ok(record.attempts.length, 'expected an explicit transaction')
          record.attempts.at(-1).push({
            scope: /set_config\('ct\.tenant_id'/i.test(statement),
            ...(/^select app_private\.begin_actor_context\(/i.test(statement) ? { initialTenant: args[1]?.[2] } : {}),
            statement,
          })
        }
        return query(...args)
      }
      client.recordSubmissions = true
    }
    return client
  }
}

async function makeVariant(name, diagnostic = false) {
  const [application, database, token, cursor, community, account] = await Promise.all(
    ['app', 'database', 'token-verifier', 'directory-cursors', 'communities/service', 'user-accounts/service']
      .map(file => import(new URL(name + '/' + file + '.ts', sources))),
  )
  const Pool = diagnostic ? DiagnosticPool : pg.Pool
  const pool = new Pool({ connectionString: databaseUrl(names[name]), ...poolOptions })
  const db = new Kysely({ dialect: new PostgresDialect({ pool }) })
  const verify = token.verifyBearer(local.API_URL, local.ANON_KEY, local.issuer)
  const cursors = cursor.directoryCursors('ab'.repeat(32))
  const app = application.buildApi({ db, verify, cursors, cleanup: () => db.destroy() })
  const variant = { name, app, pool, verify, community: community.createCommunityService({ db, cursors }),
    account: account.createUserAccountService({ db, cursors }), completed: new Map() }
  variants.push(variant)
  if (diagnostic) {
    const listener = app.server.listeners('request')[0]
    assert.equal(app.server.listenerCount('request'), 1)
    app.server.removeListener('request', listener)
    app.server.on('request', function (...args) {
      measurements.run({ attempts: [] }, () => listener.apply(this, args))
    })
    app.addHook('onSend', async (request, reply, payload) => {
      const id = request.headers['x-benchmark-id']
      if (id) variant.completed.set(id, measurements.getStore())
      return payload
    })
  }
  await database.checkRuntime(db)
  const checkouts = await Promise.allSettled(Array.from({ length: poolMax }, () => pool.connect()))
  const sockets = checkouts.flatMap(checkout => checkout.status === 'fulfilled' ? [checkout.value] : [])
  try {
    for (const checkout of checkouts) {
      if (checkout.status === 'rejected') throw checkout.reason
    }
    const settingsQueries = await Promise.allSettled(sockets.map(async client => (await client.query(
      "select current_user, session_user, current_setting('server_version') as version, " +
      "current_setting('transaction_isolation') as isolation, current_setting('track_functions') as track_functions, " +
      "current_setting('statement_timeout') as statement_timeout, current_setting('lock_timeout') as lock_timeout, " +
      "current_setting('idle_in_transaction_session_timeout') as idle_in_transaction_session_timeout, " +
      "current_setting('shared_buffers') as shared_buffers, current_setting('jit') as jit",
    )).rows[0]))
    const settings = settingsQueries.map(query => {
      if (query.status === 'rejected') throw query.reason
      return query.value
    })
    assert.equal(new Set(sockets.map(client => client.processID)).size, poolMax)
    for (const setting of settings) assert.deepEqual(setting, settings[0])
    assert.equal(settings[0].current_user, 'ct_api')
    assert.equal(settings[0].session_user, 'ct_api')
    assert.equal(settings[0].isolation, 'read committed')
    assert.equal(settings[0].track_functions, 'none')
    variant.runtime = settings[0]
  } finally {
    for (const socket of sockets) socket.release()
  }
  assert.equal(await verify(bearer), owner)
  variant.url = await app.listen({ host: '127.0.0.1', port: 0 })
  return variant
}

async function close(variant) {
  await variant.app.close()
  variants.splice(variants.indexOf(variant), 1)
}

async function request(variant, path, method = 'GET', payload, id) {
  const headers = { authorization: bearer }
  if (payload) headers['content-type'] = 'application/json'
  if (id) headers['x-benchmark-id'] = id
  const response = await fetch(variant.url + path, { method, headers, body: payload ? JSON.stringify(payload) : undefined })
  try {
    return { status: response.status, data: await response.json() }
  } catch {
    return { status: response.status, error: 'Unable to read HTTP response JSON' }
  }
}

async function seed(pinned) {
  const schema = baselineInput('application-schema.sql')
  const baselineLedger = lf(baselineInput('migrations.txt')).trim().split('\n')
  const ledgerQuery = 'select version from supabase_migrations.schema_migrations order by version'
  const expectedCandidateLedger = [...baselineLedger, '20261112000100']
  const versions = Object.keys(pinned.baseline.files).filter(path => path.startsWith('supabase/migrations/'))
    .map(path => path.split('/').at(-1).slice(0, 14))
  assert.deepEqual(versions, baselineLedger)
  assert.deepEqual((await admin.query(ledgerQuery)).rows.map(row => row.version), expectedCandidateLedger)

  const actualAuth = (await admin.query(
    'select id, email, email_confirmed_at, is_anonymous, banned_until from auth.users where id = $1', [owner],
  )).rows[0]
  assert.equal(actualAuth.email, email)
  assert.ok(actualAuth.email_confirmed_at)
  const uid = (await admin.query("select pg_get_functiondef('auth.uid()'::regprocedure) as definition")).rows[0].definition
  await admin.query('create database ' + sqlName(names.baseline))
  owned.add(names.baseline)
  load(names.baseline, 'drop schema public; create schema auth; create table auth.users (' +
    'id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean, banned_until timestamptz); ' + uid)
  // The dump includes the stack's supabase_admin default privileges.
  load(names.baseline, schema, 'supabase_admin')
  // The dump relies on the built-in public schema's implicit PUBLIC USAGE.
  load(names.baseline, 'grant usage on schema public to public;')
  load(names.baseline, dump('postgres', ['--data-only', '-t', 'public.community_standing', '-t', 'app_private.account_action_types']))
  await inspect(names.baseline, 'insert into auth.users values ($1, $2, $3, $4, $5)', Object.values(actualAuth))
  await inspect(names.baseline, 'insert into public.user_accounts(user_id) values ($1)', [owner])
  await inspect(names.baseline, 'create schema supabase_migrations; create table supabase_migrations.schema_migrations (version text primary key)')
  await inspect(names.baseline, 'insert into supabase_migrations.schema_migrations select unnest($1::text[])', [baselineLedger])

  const baseline = await makeVariant('baseline')
  for (let lane = 0; lane < poolMax; lane++) {
    const created = await request(baseline, '/api/communities', 'POST', {
      slug: 'bench22-' + lane, name: 'Benchmark', country: 'HN', timezone: 'UTC',
      region: '', city: '', profile: { displayName: 'Benchmark owner', bio: null },
    })
    assert.equal(created.status, 201)
    const tenant = created.data.tenantId
    assert.match(tenant, /^[a-f0-9-]{36}$/)
    tenants.push(tenant)
    for (let index = 0; index < 24; index++) {
      const result = await request(baseline, '/api/communities/' + tenant + '/details', 'PATCH', { name: 'Seed ' + index })
      assert.equal(result.status, 200)
      assert.equal(result.data.name, 'Seed ' + index)
    }
  }
  await close(baseline)
  await admin.query('create database ' + sqlName(names.candidate) + ' template ' + sqlName(names.baseline))
  owned.add(names.candidate)
  load(names.candidate, git(['show', candidateRevision + ':' + migration]))
  await inspect(names.candidate, 'insert into supabase_migrations.schema_migrations values ($1)', ['20261112000100'])
  const dumpArgs = ['--schema-only', '-n', 'public', '-n', 'app_private']
  const baselineSchema = canonicalDump(dump(names.baseline, dumpArgs))
  const candidateSchema = canonicalDump(dump(names.candidate, dumpArgs))
  const originalSchema = canonicalDump(dump('postgres', dumpArgs))
  writeFileSync(join(output, 'baseline-schema.sql'), baselineSchema)
  writeFileSync(join(output, 'candidate-schema.sql'), candidateSchema)
  assert.equal(hash(comparableSchema(baselineSchema)), hash(comparableSchema(schema)), 'Pinned baseline schema mismatch')
  assert.equal(hash(comparableSchema(candidateSchema)), hash(comparableSchema(originalSchema)), 'Local candidate schema mismatch')
  const fixtureDump = name => canonicalDump(dump(name, ['--data-only', '-n', 'public', '-n', 'app_private']))
  const baselineFixture = hash(fixtureDump(names.baseline))
  assert.equal(hash(fixtureDump(names.candidate)), baselineFixture)
  assert.deepEqual((await inspect(names.baseline, ledgerQuery)).map(row => row.version), baselineLedger)
  assert.deepEqual((await inspect(names.candidate, ledgerQuery)).map(row => row.version), expectedCandidateLedger)
  run.metadata.schema = { baseline: hash(baselineSchema), candidate: hash(candidateSchema), pin: hash(schema),
    baselineLedger, expectedCandidateLedger, initialApplicationFixtureHash: baselineFixture, tenants,
    comparisonNormalization: 'Line endings, pg_dump restrict token, and tenant slug CHECK parentheses around AND operands',
    authUidDefinitionHash: hash(uid), authEligibilityFields: Object.keys(actualAuth) }
}

async function signIn() {
  const result = await auth.signInWithPassword({ email, password })
  assert.ifError(result.error)
  assert.equal(result.data.user.id, owner)
  bearer = 'Bearer ' + result.data.session.access_token
  return JSON.parse(Buffer.from(result.data.session.access_token.split('.')[0], 'base64url')).alg
}

async function auditCount(variant) {
  const [row] = await inspect(names[variant.name],
    "select count(*)::int as writes from public.tenant_admin_actions where tenant_id=any($1::uuid[]) and action='tenants.update' and created_by=$2",
    [tenants, owner])
  return row.writes
}

async function call(variant, cell, tenant, name, diagnosticId) {
  const { endpoint, transport } = cell
  const path = '/api/communities/' + tenant
  const write = endpoint === 'write' || endpoint === 'noop'
  const query = endpoint === 'cursor' ? { cursor: 'bad' } : { limit: '20' }
  if (transport === 'http') {
    if (endpoint === 'preferences') return request(variant, '/api/me/preferences', 'GET', undefined, diagnosticId)
    if (endpoint === 'history' || endpoint === 'cursor') {
      return request(variant, path + '/history?' + new URLSearchParams(query), 'GET', undefined, diagnosticId)
    }
    return request(variant, path + '/details', write ? 'PATCH' : 'GET', write ? { name } : undefined, diagnosticId)
  }
  const context = { actorId: owner, requestId: randomUUID() }
  const params = { tenantId: tenant }
  if (endpoint === 'preferences') {
    const result = await variant.account.readAccountPreferences(context)
    return { status: result.status, data: result.row }
  }
  if (endpoint === 'history' || endpoint === 'cursor') return { status: 200, data: await variant.community.history(context, params, query) }
  const data = write ? await variant.community.saveDetails(context, params, { name }) : await variant.community.readDetails(context, params)
  return { status: 200, data }
}

function projection(endpoint, data) {
  if (endpoint === 'history') {
    return { rows: data.rows.map(({ id, created_at, operation_id, ...entry }) => entry), hasNext: Boolean(data.next) }
  }
  if (endpoint === 'details' || endpoint === 'write' || endpoint === 'noop') {
    const { updated_at, ...detail } = data
    assert.ok(Number.isFinite(new Date(updated_at).getTime()))
    return detail
  }
  if (endpoint === 'cursor') return { code: data.code }
  return data
}

async function sample(variant, cell, tag, index, diagnostic = false) {
  const tenant = tenants[index % tenants.length]
  const measured = { attempts: [] }
  const id = diagnostic && cell.transport === 'http' ? randomUUID() : undefined
  let name = 'Bench ' + tag + ' ' + index
  let start = performance.now()
  let result
  try {
    if (cell.endpoint === 'noop') {
      result = await call(variant, { ...cell, endpoint: 'details' }, tenant)
      assert.equal(result.status, 200, 'No-op fixture details request failed')
      assert.equal(typeof result.data?.name, 'string', 'No-op fixture details had no name')
      name = result.data.name
      start = performance.now()
    }
    result = diagnostic && cell.transport === 'service'
      ? await measurements.run(measured, () => call(variant, cell, tenant, name, id))
      : await call(variant, cell, tenant, name, id)
  } catch (error) {
    const code = error.code ?? (error.statusCode ? error.message : error.name)
    result = { status: error.statusCode ?? result?.status ?? 599, data: { code }, error: code }
  }
  const outcome = { index, ms: performance.now() - start, status: result.status, valid: false }
  if (diagnostic) {
    outcome.tenant = tenant
    outcome.attempts = id ? variant.completed.get(id)?.attempts ?? [] : measured.attempts
    if (id) variant.completed.delete(id)
  }
  try {
    const { status, data } = result
    const valid = cell.endpoint === 'cursor' ? status === 400 && data?.code === 'invalid_cursor'
      : status === 200 && data !== null && typeof data === 'object' && !Array.isArray(data) &&
        (!['write', 'noop'].includes(cell.endpoint) || data.name === name) &&
        (cell.endpoint !== 'history' || data.rows?.length === 20 && Boolean(data.next))
    if (valid) {
      outcome.projection = hash(JSON.stringify(projection(cell.endpoint, data)))
      outcome.valid = true
    } else {
      outcome.error = result.error ?? data?.code ?? 'Unexpected response'
    }
  } catch (error) {
    outcome.error = error.message
  }
  return outcome
}

async function batch(variant, cell, tag, count, offset, diagnostic = false) {
  const results = []
  // One worker per lane prevents same-tenant overlap; each worker retains the
  // same lane and schedules a successor only when its prior request resolves.
  await Promise.all(Array.from({ length: cell.concurrency }, async (_, worker) => {
    for (let index = worker; index < count; index += cell.concurrency) {
      results[index] = await sample(variant, cell, tag, offset + index, diagnostic)
    }
  }))
  return results
}

const percentiles = values => {
  const ordered = [...values].sort((a, b) => a - b)
  return Object.fromEntries([50, 95, 99].map(p => ['p' + p, ordered[Math.ceil(ordered.length * p / 100) - 1]]))
}

async function checkPair(pair, cell, prefix) {
  const first = pair[0][prefix]
  const second = pair[1][prefix]
  assert.ok([...first, ...second].every(result => result.valid), 'Failed samples retained in raw artifact')
  assert.deepEqual(first.map(result => result.projection), second.map(result => result.projection), 'Outcome parity mismatch')
}

async function timing(pair) {
  for (const cell of cells.filter(({ endpoint }) => endpoint !== 'write')) {
    const [left, right] = await Promise.all(pair.map(variant => call(variant, cell, tenants[0], 'unused')))
    assert.deepEqual(left, right, 'Initial fixture outcomes must match exactly')
  }
  run.metadata.rollbackCountersBefore = await rollbackCounters()
  run.metadata.timingStartedAt = new Date().toISOString()
  save()
  // Order the history cells before any timed mutation. Restore identical
  // starting names across the paired variants by running matching writes.
  for (let repeat = 0; repeat < repeats; repeat++) {
    await signIn()
    for (const { order: names, ...cell } of schedule[repeat]) {
      const order = names.map(name => pair.find(variant => variant.name === name))
      const pairRows = []
      const tag = [repeat, cell.transport, cell.concurrency].join('-')
      for (const variant of order) {
        const before = cell.endpoint === 'write' ? await auditCount(variant) : null
        const warm = await batch(variant, cell, tag, warmups, 0)
        const timed = warm.every(result => result.valid) ? await batch(variant, cell, tag, samples, warmups) : []
        const row = { ...cell, repeat, variant: variant.name, order: order.map(v => v.name),
          writes: null, warm, timed, latency: percentiles(timed.map(result => result.ms)) }
        pairRows.push(row)
        run.rows.push(row)
        if (before !== null) row.writes = (await auditCount(variant)) - before
        save()
      }
      await checkPair(pairRows, cell, 'warm')
      await checkPair(pairRows, cell, 'timed')
      for (const row of pairRows) {
        assert.equal(row.timed.length, samples)
        if (cell.endpoint === 'write') assert.equal(row.writes, warmups + samples, 'Every PATCH must generate an audit event')
      }
    }
    console.log('Completed paired repeat ' + (repeat + 1) + '/' + repeats)
  }
}

function checkAttempts(result, variant, endpoint) {
  assert.ok(result.attempts.length >= 1 && result.attempts.length <= 3)
  const finalAttempt = result.attempts.at(-1)
  assert.equal(finalAttempt.length, expected[variant][endpoint])
  assert.equal(finalAttempt.at(-1).statement, endpoint === 'cursor' ? 'rollback' : 'commit')
  const migrated = ['details', 'history', 'write', 'noop'].includes(endpoint)
  const setupPattern = variant === 'baseline'
    ? /^select app_private\.begin_actor_context\(\s*\$1::uuid, \$2::uuid\) as allowed$/
    : /^select app_private\.begin_actor_context\(\s*\$1::uuid, \$2::uuid, \$3::uuid\) as allowed$/
  const initialTenant = variant === 'baseline' ? undefined : endpoint === 'preferences' ? null : result.tenant
  const finalPath = finalAttempt.map(query => query.statement)
  if (endpoint === 'cursor') finalPath.pop()

  for (const attempt of result.attempts) {
    assert.equal(attempt[0].statement, 'begin')
    const statements = attempt.map(query => query.statement)
    if (statements.at(-1) === 'rollback') statements.pop()
    assert.deepEqual(statements, finalPath.slice(0, statements.length))
    // A retry can stop at BEGIN or setup. The first root lock is after
    // the former scope submission for every migrated benchmark operation.
    if (statements.length > 1) {
      assert.match(attempt[1].statement, setupPattern)
      assert.equal(attempt[1].initialTenant, initialTenant)
    }
    const scopeIndices = attempt.flatMap((query, index) => query.scope ? [index] : [])
    const rootLock = attempt.some(({ statement }) => /from public\.tenants\s+where id=\$1 for (share|update)$/i.test(statement))
    if (attempt === finalAttempt) assert.equal(rootLock, migrated)
    if (migrated && variant === 'baseline' && statements.length >= 3) {
      assert.deepEqual(scopeIndices, [2])
    } else {
      assert.deepEqual(scopeIndices, [])
    }
  }
}

async function diagnostics(pair) {
  for (const cell of [...cells, ...['service', 'http'].flatMap(transport =>
    ['noop', 'cursor'].map(endpoint => ({ endpoint, transport, concurrency: 1 })))]) {
    const records = []
    for (const variant of pair) {
      const before = await auditCount(variant)
      const count = cell.endpoint === 'noop' ? 1 : probeSamples
      const results = await batch(variant, cell, 'probe-' + cell.transport + '-' + cell.concurrency, count, 0, true)
      const retries = results.reduce((total, result) => total + Math.max(0, result.attempts.length - 1), 0)
      const record = { ...cell, variant: variant.name, results, writes: null, retries }
      run.diagnostics.push(record)
      records.push(record)
      record.writes = (await auditCount(variant)) - before
      save()
    }
    await checkPair(records, cell, 'results')
    for (const record of records) {
      assert.equal(record.writes, cell.endpoint === 'write' ? probeSamples : 0)
      for (const result of record.results) checkAttempts(result, record.variant, cell.endpoint)
    }
  }
}

function summarize() {
  return cells.map(cell => {
    const paired = {}
    for (const name of ['baseline', 'candidate']) {
      paired[name] = run.rows.filter(row => row.variant === name && Object.keys(cell).every(key => row[key] === cell[key]))
        .sort((a, b) => a.repeat - b.repeat)
    }
    const distribution = Object.fromEntries(Object.entries(paired).map(([name, rows]) => [name,
      { ...percentiles(rows.flatMap(row => row.timed.map(sample => sample.ms))), samples: rows.flatMap(row => row.timed).length }]))
    let seed = 220018
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    const mean = values => values.reduce((total, value) => total + value, 0) / values.length
    const deltas = Object.fromEntries(['p50', 'p95', 'p99'].map(p => {
      const differences = paired.candidate.map((row, i) => row.latency[p] - paired.baseline[i].latency[p])
      const boot = Array.from({ length: 10000 }, () =>
        mean(differences.map(() => differences[Math.floor(random() * differences.length)]))).sort((a, b) => a - b)
      return [p, { mean: mean(differences), interval: [boot[249], boot[9749]], differences }]
    }))
    return { ...cell, distribution, deltas }
  })
}

const plan = readFileSync(new URL('../../docs/research/tenant-setup-benchmark-plan.md', import.meta.url))
writeFileSync(join(output, 'plan.md'), plan, { flag: 'wx' })
run.metadata.planHash = hash(plan)
const harness = readFileSync(new URL(import.meta.url))
writeFileSync(join(output, 'harness.mjs'), harness, { flag: 'wx' })
run.metadata.harnessHash = hash(harness)
run.metadata.schedule = schedule
run.metadata.planSavedAt = new Date().toISOString()
save()
try {
  const pinned = pinSources()
  run.metadata.historicalBefore = checkHistory()
  await admin.connect()
  beforeRuntimeConfig = await localConfig()
  run.metadata.environment = { platform: platform(), release: release(), cpu: cpus()[0].model, logicalCpus: cpus().length,
    memoryBytes: totalmem(), node: process.version, packageLock: pinned.baseline.files['package-lock.json'],
    packageVersions: Object.fromEntries(['pg', 'kysely', 'fastify', '@supabase/supabase-js'].map(name =>
      [name, read(join(origin, 'node_modules', name, 'package.json')).version])),
    topology: 'Windows to local Docker PostgreSQL and local Supabase Auth; loopback Fastify' }
  email = 'bench22-' + tokenId + '@example.test'
  password = randomUUID()
  const created = await authAdmin.createUser({ email, password, email_confirm: true })
  assert.ifError(created.error)
  owner = created.data.user.id
  run.metadata.signingAlgorithm = await signIn()
  await seed(pinned)
  console.log('Verified source, schema, lookup rows and cloned fixtures')
  const pair = [await makeVariant('baseline'), await makeVariant('candidate')]
  assert.deepEqual(pair[0].runtime, pair[1].runtime)
  run.metadata.runtime = pair[0].runtime
  await timing(pair)
  run.metadata.timingCompletedAt = new Date().toISOString()
  run.metadata.rollbackCountersAfter = await rollbackCounters()
  json('summary.json', summarize())
  for (const variant of pair) await close(variant)
  const probePair = [await makeVariant('baseline', true), await makeVariant('candidate', true)]
  await diagnostics(probePair)
  run.metadata.diagnosticsCompletedAt = new Date().toISOString()
} catch (error) {
  run.metadata.failure = { name: error.name, message: error.message, stack: error.stack }
  throw error
} finally {
  const cleanup = []
  const attempt = async (step, fn) => {
    try {
      await fn()
      cleanup.push({ step, ok: true })
    } catch (error) {
      cleanup.push({ step, ok: false, code: error.code ?? error.name, message: error.message })
    }
  }
  for (const variant of [...variants]) await attempt('close ' + variant.name, () => close(variant))
  for (const name of owned) await attempt('drop ' + name, async () => {
    await admin.query('drop database ' + sqlName(name) + ' with (force)')
    assert.equal((await admin.query('select 1 from pg_database where datname=$1', [name])).rowCount, 0)
  })
  if (owner) await attempt('remove owned Auth fixture', async () => {
    await admin.query('delete from public.user_accounts where user_id=$1', [owner])
    assert.ifError((await authAdmin.deleteUser(owner)).error)
    const [state] = (await admin.query(
      'select exists(select from auth.users where id=$1) as auth, exists(select from public.user_accounts where user_id=$1) as account',
      [owner],
    )).rows
    assert.deepEqual(state, { auth: false, account: false })
  })
  if (beforeRuntimeConfig) await attempt('verify original diagnostic configuration', async () => {
    assert.deepEqual(await localConfig(), beforeRuntimeConfig)
  })
  await attempt('verify historical artifacts', async () => { assert.equal(checkHistory(), run.metadata.historicalBefore) })
  await attempt('close administrator connection', () => admin.end())
  run.metadata.cleanup = cleanup
  run.metadata.finishedAt = new Date().toISOString()
  save()
  console.log(output)
  if (cleanup.some(step => !step.ok)) process.exitCode = 1
}
