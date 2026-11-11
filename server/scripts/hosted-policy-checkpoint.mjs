// Read-only before/after checkpoints; migration application is a separate command.
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { hostedTools } from '../../supabase/tests/hosted-tools.mjs'
import { policyCatalog, applicationSnapshot, normalizedCatalog } from '../../supabase/tests/policy-catalog-data.mjs'
import { connectDatabase } from '../src/database.ts'
import { sql } from 'kysely'

const mode = process.argv[2]
assert.ok(['before','after'].includes(mode))
const { query } = hostedTools()
const baseline = new URL('../tests/fixtures/hosted-policy-baseline/', import.meta.url)
const results = new URL('../test-results/hosted-policy/', import.meta.url)
if (mode === 'before') for (const name of ['catalog','data','integrity']) {
  assert.ok(!existsSync(new URL(`before-${name}.json`, baseline)), 'Do not overwrite the migration baseline')
}
const endpoint = new URL(process.env.DATABASE_URL)
assert.equal(endpoint.username, 'ct_api.fsnipgsrlclbnfepcbvz')
assert.equal(endpoint.port, '5432')
assert.ok(endpoint.hostname.endsWith('.pooler.supabase.com'))
assert.equal(endpoint.searchParams.get('sslmode'), 'verify-full')
const db = connectDatabase(endpoint.href)
try {
  assert.equal((await sql`select current_user as role`.execute(db)).rows[0].role, 'ct_api')
  await assert.rejects(sql`select email from auth.users`.execute(db), e => e.code === '42501')
} finally { await db.destroy() }
const catalog = await policyCatalog(query)
const snapshot = await applicationSnapshot(query)
const integrity = query(readFileSync(new URL('../../supabase/preflight/hosted_cutover_postflight.sql', import.meta.url), 'utf8'))[0].postflight
assert.equal(integrity.invalid_owners + integrity.missing_dependents + integrity.missing_first_approval, 0)
if (mode === 'before') {
  assert.equal(catalog.migrations.length, 25)
  assert.equal(catalog.migrations.at(-1).version, '20261103001700')
} else {
  assert.equal(catalog.migrations.length, 33)
  assert.equal(catalog.migrations.at(-1).version, '20261110000800')
  assert.deepEqual(snapshot, JSON.parse(readFileSync(new URL('before-data.json', baseline))))
  assert.deepEqual(integrity, JSON.parse(readFileSync(new URL('before-integrity.json', baseline))))
  const local = JSON.parse(readFileSync(new URL('../tests/fixtures/policy-catalog.json', import.meta.url)))
  for (const key of ['runtime','functions','relations','definitions','policies','triggers','column_defaults','function_dependencies','schema_permissions']) {
    assert.deepEqual(normalizedCatalog(catalog[key]), normalizedCatalog(local[key]), key + ' differs from reviewed local catalog')
  }
  assert.deepEqual(catalog.external_relation_grants, [])
  assert.deepEqual(catalog.external_function_grants, [])
}
const output = mode === 'before' ? baseline : results
mkdirSync(output, { recursive: true })
for (const [name, value] of Object.entries({ catalog, data: snapshot, integrity })) {
  const file = new URL(`${mode}-${name}.json`, output)
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
}
console.log('PASS ' + mode + ' hosted checkpoint: ledger, TLS runtime, catalog, data preservation and integrity')
