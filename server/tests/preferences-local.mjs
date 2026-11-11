import { directoryCursors } from '../src/directory-cursors.ts'
// This suite creates only synthetic users on the configured local Supabase stack.
import assert from 'node:assert/strict'
import { createHmac, randomUUID, randomBytes } from 'node:crypto'
import { localStack } from '../../supabase/tests/local-stack.mjs'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import { buildApi } from '../src/app.ts'
import { verifyBearer } from '../src/token-verifier.ts'
import { checkRuntime, connectDatabase } from '../src/database.ts'
import { preferencesPath } from '../src/user-accounts/routes.ts'
import { sql } from 'kysely'

const local = localStack()
const runtimeUrl = new URL(process.env.DATABASE_URL)
for (const endpoint of [new URL(local.API_URL), new URL(local.DB_URL), runtimeUrl]) {
  assert.ok(['localhost','127.0.0.1'].includes(endpoint.hostname), 'Loopback endpoints required')
}
assert.equal(runtimeUrl.port, new URL(local.DB_URL).port)
assert.equal(runtimeUrl.pathname, '/postgres')
assert.equal(runtimeUrl.username, 'ct_api')
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const authAdmin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, options).auth.admin
const admin = new pg.Client({ connectionString: local.DB_URL })
const db = connectDatabase(runtimeUrl.href, 1)
const api = buildApi({ db, verify: verifyBearer(local.API_URL, local.ANON_KEY, local.issuer), cursors: directoryCursors(randomBytes(32).toString('hex')), cleanup: () => db.destroy() })
const created = []
const allOn = { user_is_discoverable: true, enable_matchmaking: true, allow_direct_messages: true }
async function makeUser() {
  const email = `settings-${randomUUID()}@example.test`, password = randomUUID()
  const made = await authAdmin.createUser({ email, password, email_confirm: true })
  assert.ifError(made.error)
  created.push(made.data.user.id)
  const client = createClient(local.API_URL, local.ANON_KEY, options)
  const signed = await client.auth.signInWithPassword({ email, password })
  assert.ifError(signed.error)
  return { token: signed.data.session.access_token, id: signed.data.user.id, client }
}
try {
  await admin.connect()
  await checkRuntime(db)
  const base = await api.listen({ host: '127.0.0.1', port: 0 })
  const request = (token, input, path = preferencesPath) => fetch(base + path, {
    method: input === undefined ? 'GET' : 'PUT',
    headers: { ...(token && { Authorization: 'Bearer ' + token }), 'Content-Type': 'application/json' },
    body: input === undefined ? undefined : JSON.stringify(input),
  })
  const a = await makeUser(), b = await makeUser()
  assert.deepEqual(await (await request(a.token)).json(), allOn)
  for (let bits = 0; bits < 8; bits++) {
    const expected = { user_is_discoverable: !!(bits & 1), enable_matchmaking: !!(bits & 2), allow_direct_messages: !!(bits & 4) }
    assert.equal((await request(a.token, expected)).status, 200)
    assert.deepEqual(await (await request(a.token)).json(), expected)
    assert.deepEqual(await (await request(b.token)).json(), allOn)
  }
  assert.equal((await admin.query('select updated_by from public.user_accounts where user_id=$1', [a.id])).rows[0].updated_by, a.id)
  for (const input of [{ ...allOn, user_id: b.id }, { ...allOn, allow_direct_messages: 'false' }, {}, { ...allOn, updated_by: a.id }]) {
    assert.equal((await request(a.token, input)).status, 400)
  }
  assert.equal((await request(a.token, undefined, preferencesPath + '?user_id=' + b.id)).status, 400)
  for (const token of [null, 'forged', a.token.slice(0, -9) + 'tampered!']) assert.equal((await request(token)).status, 401)
  for (const client of [a.client, createClient(local.API_URL, local.ANON_KEY, options)]) {
    assert.equal((await client.from('user_accounts').select('user_is_discoverable')).error?.code, '42501')
    assert.equal((await client.from('user_accounts').update(allOn).eq('user_id', a.id)).error?.code, '42501')
  }
  const graphql = await fetch(local.API_URL + '/graphql/v1', { method: 'POST',
    headers: { apikey: local.ANON_KEY, Authorization: 'Bearer ' + a.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ user_accountsCollection { edges { node { user_is_discoverable } } } }' }) })
  const graph = await graphql.json()
  assert.ok(graph.errors?.length && !graph.data?.user_accountsCollection)
  await assert.rejects(db.transaction().execute(async tx => {
    await sql`select set_config('request.jwt.claim.sub', ${a.id}, true)`.execute(tx)
    assert.equal((await tx.selectFrom('user_accounts').select('user_id').where('user_id','=',a.id).execute())[0].user_id, a.id)
    assert.equal((await tx.updateTable('user_accounts').set(allOn).where('user_id','=', b.id).executeTakeFirst()).numUpdatedRows, 0n)
    throw new Error('rollback probe')
  }), /rollback probe/)
  assert.deepEqual(await db.selectFrom('user_accounts').select('user_id').execute(), [])
  assert.deepEqual(await (await request(b.token)).json(), allOn)
  // Use authentic signatures with invalid identity claims, including a token
  // from another issuer sharing the local legacy test key.
  const claims = JSON.parse(Buffer.from(a.token.split('.')[1], 'base64url'))
  for (const override of [{ exp: 0 }, { iss: 'https://other.example/auth/v1' }, { aud: 'other' },
      { role: 'service_role' }, { is_anonymous: true }]) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const body = Buffer.from(JSON.stringify({ ...claims, ...override })).toString('base64url')
    const signature = createHmac('sha256', local.JWT_SECRET).update(header + '.' + body).digest('base64url')
    assert.equal((await request(header + '.' + body + '.' + signature)).status, 401)
  }
  await admin.query('update auth.users set email_confirmed_at=null where id=$1', [b.id])
  assert.ok([401,403].includes((await request(b.token)).status))
  await admin.query('update auth.users set email_confirmed_at=now() where id=$1', [b.id])

  // Hold an uncommitted ban. Wait for the real API transaction to block on it
  // before committing, so a stale snapshot cannot accidentally pass this test.
  await admin.query('begin')
  let racingWrite
  try {
    await admin.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1", [a.id])
    racingWrite = request(a.token, { ...allOn, allow_direct_messages: false })
    const deadline = Date.now() + 1800
    let blocked = false
    while (!blocked && Date.now() < deadline) {
      const locks = await admin.query(`select exists(select from pg_stat_activity
        where usename='ct_api' and pg_backend_pid() = any(pg_blocking_pids(pid))) as waiting`)
      blocked = locks.rows[0].waiting
      if (!blocked) await new Promise(done => setTimeout(done, 10))
    }
    assert.ok(blocked, 'the API must serialize its eligibility check with Auth changes')
    await admin.query('commit')
  } finally { await admin.query('rollback') }
  assert.equal((await racingWrite).status, 403)
  assert.equal((await admin.query('select allow_direct_messages from public.user_accounts where user_id=$1', [a.id])).rows[0].allow_direct_messages, true)
  assert.ok([401,403].includes((await request(a.token, allOn)).status))
  await admin.query('delete from public.user_accounts where user_id=$1', [b.id])
  assert.equal((await request(b.token, allOn)).status, 404)
  console.log('PASS real Auth and HTTP, all flag combinations, isolation, strict input, audit, rollback, direct REST/GraphQL denials, ban and missing row')
} finally {
  try {
    for (const id of created) {
      await admin.query('delete from public.user_accounts where user_id=$1', [id])
      const removed = await authAdmin.deleteUser(id)
      assert.ifError(removed.error)
    }
  } finally { await api.close(); await admin.end() }
}
