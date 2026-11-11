import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { localStack } from '../../supabase/tests/local-stack.mjs'
import { policyCatalog, applicationSnapshot, normalizedCatalog } from '../../supabase/tests/policy-catalog-data.mjs'

test('checkpoint metadata matches the reviewed local catalog and data snapshots are stable', async () => {
  const db = new pg.Client({ connectionString: localStack().DB_URL })
  await db.connect()
  const query = async text => { const result = await db.query(text); return (Array.isArray(result) ? result.at(-1) : result).rows }
  try {
    const expected = JSON.parse(readFileSync(new URL('./fixtures/policy-catalog.json', import.meta.url)))
    const actual = await policyCatalog(query)
    for (const key of ['runtime','functions','relations','definitions','policies','triggers','column_defaults','function_dependencies','schema_permissions']) {
      assert.deepEqual(normalizedCatalog(actual[key]), normalizedCatalog(expected[key]), key)
    }
    const first = await applicationSnapshot(query)
    assert.equal(first.length, 16)
    assert.ok(first.every(row => Number.isInteger(row.rows) && /^[0-9a-f]{32}$/.test(row.checksum)))
    assert.deepEqual(await applicationSnapshot(query), first)
  } finally { await db.end() }
})
