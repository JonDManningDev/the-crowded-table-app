import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { setImmediate } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:net'
import { buildApi } from '../src/app.ts'
import { directoryCursors } from '../src/directory-cursors.ts'
import { readApiConfig, startApi } from '../src/index.ts'

const config = {
  databaseUrl: 'postgresql://ct_api:synthetic@127.0.0.1:1/postgres', projectUrl: 'http://127.0.0.1:1',
  publishableKey: 'synthetic', cursorKey: '01'.repeat(32), host: '127.0.0.1', port: 0,
}

function fixture(t) {
  const events = [], signals = ['SIGINT', 'SIGTERM'].map(signal => process.listeners(signal))
  let destroys = 0, app, options
  const db = { destroy: async () => { destroys++; events.push('destroy') } }
  const dependencies = {
    verifyBearer: () => { events.push('verifier'); return async () => null },
    directoryCursors: key => { events.push('cursors'); return directoryCursors(key) },
    connectDatabase: url => { events.push('database'); assert.equal(url, config.databaseUrl); return db },
    buildApi: input => { events.push('build'); options = input; app = buildApi(input); return app },
    checkRuntime: async input => { events.push('runtime'); assert.equal(input, db) },
  }
  t.after(async () => {
    if (app && !destroys) await app.close()
    for (const [i, signal] of ['SIGINT', 'SIGTERM'].entries()) assert.deepEqual(process.listeners(signal), signals[i], 'no signal handlers may leak')
  })
  return { dependencies, db, events, get app() { return app }, get options() { return options }, get destroys() { return destroys } }
}

async function until(predicate) {
  const deadline = Date.now() + 3000
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'lifecycle event did not finish')
    await setImmediate()
  }
}

test('configuration is checked before allocation and retains environment names/defaults', () => {
  const environment = { DATABASE_URL: config.databaseUrl, SUPABASE_URL: config.projectUrl,
    SUPABASE_PUBLISHABLE_KEY: config.publishableKey, DIRECTORY_CURSOR_KEY: config.cursorKey }
  assert.deepEqual(readApiConfig(environment), { ...config, issuer: undefined, port: 3001 })
  assert.deepEqual(readApiConfig({ ...environment, HOST: 'localhost', PORT: '0', SUPABASE_JWT_ISSUER: 'issuer' }),
    { ...config, host: 'localhost', issuer: 'issuer' })
  for (const [text, port] of [['0', 0], ['1', 1], ['3001', 3001], ['003001', 3001], ['65535', 65535]]) {
    assert.equal(readApiConfig({ ...environment, PORT: text }).port, port)
  }
  for (const port of ['', ' ', '\t', '\n', ' 3001', '3001 ', '3001\n', '+3001', '-0', '-1', '65536',
    '1.5', '3001.0', '0xBB9', '3e3', 'NaN', 'Infinity', '-Infinity', 'not-a-port', '٣٠٠١', '9'.repeat(400)]) {
    assert.throws(() => readApiConfig({ ...environment, PORT: port }),
      { name: 'Error', message: 'PORT must be a decimal integer between 0 and 65535.' }, JSON.stringify(port))
  }
  for (const key of Object.keys(environment)) {
    assert.throws(() => readApiConfig({ ...environment, [key]: '' }), new RegExp(`Missing ${key}`))
  }
})

test('invalid programmatic ports fail before any construction, readiness or cleanup', async t => {
  for (const port of [NaN, Infinity, -Infinity, -1, 65536, 1.5, undefined, null, '3001']) {
    const h = fixture(t)
    await assert.rejects(startApi({ ...config, port }, h.dependencies),
      { name: 'Error', message: 'PORT must be a decimal integer between 0 and 65535.' }, String(port))
    assert.deepEqual(h.events, [])
    assert.equal(h.destroys, 0)
    assert.equal(h.app, undefined)
  }
})

test('verifier construction failure allocates no database', async t => {
  const h = fixture(t), failure = new Error('verifier configuration')
  h.dependencies.verifyBearer = () => { h.events.push('verifier'); throw failure }
  await assert.rejects(startApi(config, h.dependencies), error => error === failure)
  assert.deepEqual(h.events, ['verifier'])
  assert.equal(h.destroys, 0)
})

test('cursor validation failure allocates no database', async t => {
  const h = fixture(t)
  await assert.rejects(startApi({ ...config, cursorKey: 'invalid' }, h.dependencies), /DIRECTORY_CURSOR_KEY/)
  assert.deepEqual(h.events, ['verifier', 'cursors'])
  assert.equal(h.destroys, 0)
})

test('database constructor failure does not transfer cleanup ownership', async t => {
  const h = fixture(t), failure = new Error('database configuration')
  h.dependencies.connectDatabase = () => { h.events.push('database'); throw failure }
  await assert.rejects(startApi(config, h.dependencies), error => error === failure)
  assert.deepEqual(h.events, ['verifier', 'cursors', 'database'])
  assert.equal(h.destroys, 0)
})

test('synchronous build failure releases the startup-owned database exactly once', async t => {
  const h = fixture(t), failure = new Error('build failure')
  h.dependencies.buildApi = () => { h.events.push('build'); throw failure }
  await assert.rejects(startApi(config, h.dependencies), error => error === failure)
  assert.deepEqual(h.events, ['verifier', 'cursors', 'database', 'build', 'destroy'])
  assert.equal(h.destroys, 1)
})

test('asynchronous plugin boot failure closes the returned app and its owned database', async t => {
  const h = fixture(t), failure = new Error('plugin failure'), construct = h.dependencies.buildApi
  h.dependencies.buildApi = options => {
    const app = construct(options)
    app.register(async () => { throw failure })
    return app
  }
  await assert.rejects(startApi(config, h.dependencies), error => error === failure)
  assert.equal(h.destroys, 1)
  assert.equal(h.app.server.listening, false)
})

test('rejected startup-owned cleanup preserves the synchronous construction failure', async t => {
  const h = fixture(t), failure = new Error('build failure'), destroy = h.db.destroy
  h.dependencies.buildApi = () => { throw failure }
  h.db.destroy = async () => { await destroy(); throw new Error('private cleanup detail') }
  await assert.rejects(startApi(config, h.dependencies), error => error === failure)
  assert.equal(h.destroys, 1)
})

test('runtime readiness failure closes the returned app before listening', async t => {
  const h = fixture(t), failure = new Error('readiness failure')
  h.dependencies.checkRuntime = async () => { h.events.push('runtime'); throw failure }
  await assert.rejects(startApi(config, h.dependencies), error => error === failure)
  assert.equal(h.destroys, 1)
  assert.equal(h.app.server.listening, false)
})

test('real listener failure releases app-owned resources exactly once', async t => {
  const occupied = createServer()
  t.after(() => new Promise(resolve => occupied.close(resolve)))
  await new Promise((resolve, reject) => { occupied.once('error', reject); occupied.listen(0, '127.0.0.1', resolve) })
  const h = fixture(t)
  await assert.rejects(startApi({ ...config, port: occupied.address().port }, h.dependencies), { code: 'EADDRINUSE' })
  assert.equal(h.destroys, 1)
  assert.equal(h.app.server.listening, false)
})

test('normal close drains a live request before releasing resources; repeated closes do not repeat cleanup', { timeout: 10000 }, async t => {
  const h = fixture(t), construct = h.dependencies.buildApi
  let release, ready
  const gate = new Promise(resolve => { release = resolve }), entered = new Promise(resolve => { ready = resolve })
  h.dependencies.buildApi = options => {
    const app = construct(options)
    app.get('/slow', async () => { ready(); await gate; return { finished: true } })
    return app
  }
  const app = await startApi(config, h.dependencies)
  assert.equal(app.server.listening, true)
  const response = fetch(`http://127.0.0.1:${app.server.address().port}/slow`,
    { headers: { connection: 'close' }, signal: AbortSignal.timeout(5000) })
  await entered
  const closing = app.close()
  try { await setImmediate(); assert.equal(h.destroys, 0) } finally { release() }
  assert.deepEqual(await (await response).json(), { finished: true })
  await closing
  await app.close()
  assert.equal(h.destroys, 1)
  assert.equal(app.server.listening, false)
})

test('overlapping shutdown signals share one close and memoized cleanup promise', async t => {
  const h = fixture(t), destroy = h.db.destroy
  let release
  const gate = new Promise(resolve => { release = resolve })
  h.db.destroy = async () => { await destroy(); await gate }
  const app = await startApi(config, h.dependencies)
  process.emit('SIGINT'); process.emit('SIGTERM')
  try {
    await until(() => h.destroys === 1)
    assert.equal(h.options.cleanup(), h.options.cleanup())
  } finally { release() }
  await h.options.cleanup()
  await app.close()
  await setImmediate()
  assert.equal(h.destroys, 1)
})

test('cleanup rejection cannot mask a startup failure or cause a second destroy', async t => {
  const h = fixture(t), failure = new Error('startup failure'), destroy = h.db.destroy
  h.db.destroy = async () => { await destroy(); throw new Error('private cleanup detail') }
  h.dependencies.checkRuntime = async () => { throw failure }
  await assert.rejects(startApi(config, h.dependencies), error => error === failure)
  await assert.rejects(h.options.cleanup(), /private cleanup detail/)
  assert.equal(h.destroys, 1)
})

test('rejected signal cleanup has a nonzero exit status, one generic log and no leaked handlers', async t => {
  const h = fixture(t), destroy = h.db.destroy, logs = [], previous = process.exitCode
  t.after(() => { process.exitCode = previous })
  t.mock.method(console, 'error', (...args) => logs.push(args))
  h.db.destroy = async () => { await destroy(); throw new Error('private cleanup detail') }
  await startApi(config, h.dependencies)
  process.emit('SIGINT'); process.emit('SIGTERM')
  await until(() => process.exitCode === 1)
  assert.equal(h.destroys, 1)
  assert.deepEqual(logs, [['API shutdown failed.']])
})

test('buildApi uses the supplied cleanup callback rather than implicitly destroying its database', async () => {
  let cleaned = 0
  const app = buildApi({ db: { destroy: () => assert.fail('the caller owns the cleanup policy') },
    verify: async () => null, cursors: directoryCursors(config.cursorKey), cleanup: async () => { cleaned++ } })
  try { await app.ready() } finally { await app.close() }
  await app.close()
  assert.equal(cleaned, 1)
})

test('direct CLI configuration failure exits nonzero with the existing generic startup diagnostic', () => {
  const environment = { ...process.env }
  for (const key of ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'DIRECTORY_CURSOR_KEY']) delete environment[key]
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/index.ts', import.meta.url))],
    { env: environment, encoding: 'utf8', timeout: 10000 })
  assert.ifError(result.error)
  assert.equal(result.status, 1)
  assert.equal(result.stdout, '')
  assert.equal(result.stderr.trim(), 'API startup failed. Check the runtime credentials, migrations and listener configuration.')
})

test('malformed PORT keeps the CLI nonzero exit and generic startup diagnostic', () => {
  const environment = { ...process.env, DATABASE_URL: config.databaseUrl, SUPABASE_URL: config.projectUrl,
    SUPABASE_PUBLISHABLE_KEY: config.publishableKey, DIRECTORY_CURSOR_KEY: config.cursorKey, PORT: 'not-a-port' }
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/index.ts', import.meta.url))],
    { env: environment, encoding: 'utf8', timeout: 10000 })
  assert.ifError(result.error)
  assert.equal(result.status, 1)
  assert.equal(result.stdout, '')
  assert.equal(result.stderr.trim(), 'API startup failed. Check the runtime credentials, migrations and listener configuration.')
})
