import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import pg from 'pg'
import ts from 'typescript'
import { databaseTypesPath, generateDatabaseTypes } from '../scripts/database-codegen.mjs'
import { localStack } from '../../supabase/tests/local-stack.mjs'

test('local generation covers the application catalog, reproduces output and detects drift', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ct-database-types-'))
  const outFile = join(directory, 'database.types.ts')
  const client = new pg.Client({ connectionString: localStack().DB_URL })
  try {
    await client.connect()
    const output = await generateDatabaseTypes({ outFile })
    assert.equal(output, await readFile(databaseTypesPath, 'utf8'))
    assert.equal(await generateDatabaseTypes({ outFile }), output)
    await generateDatabaseTypes({ outFile, verify: true })

    // Compare generated relation/column coverage to the live catalog, rather
    // than preserving a hand-maintained second schema inventory.
    const source = ts.createSourceFile('database.types.ts', output, ts.ScriptTarget.Latest, true)
    const interfaces = new Map(source.statements.filter(ts.isInterfaceDeclaration)
      .map(node => [node.name.text, node]))
    const generated = Object.fromEntries(interfaces.get('DB').members.map(member => [
      member.name.text, interfaces.get(member.type.typeName.text).members.map(column => column.name.text).sort(),
    ]))
    const { rows } = await client.query(`select case when n.nspname='public' then c.relname
        else n.nspname || '.' || c.relname end as relation, a.attname as column
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      join pg_attribute a on a.attrelid=c.oid
      where n.nspname in ('public','app_private') and c.relkind in ('r','p','v','m','f')
        and a.attnum>0 and not a.attisdropped order by 1,2`)
    const catalog = {}
    for (const row of rows) (catalog[row.relation] ??= []).push(row.column)
    assert.deepEqual(generated, catalog)
    assert.equal(Object.keys(generated).length, 16)
    assert.ok(!Object.keys(generated).some(key => key.startsWith('auth.')))

    await writeFile(outFile, output.replace('user_is_discoverable: Generated<boolean>', 'user_is_discoverable: string'))
    await assert.rejects(generateDatabaseTypes({ outFile, verify: true }), /not up-to-date/)
    assert.notEqual(await readFile(outFile, 'utf8'), output, 'Verification must not overwrite drift.')
  } finally {
    await client.end()
    await rm(directory, { recursive: true, force: true })
  }
})

test('pg returns Dates, nullable values and JSON while cursor text keeps microseconds', async () => {
  const client = new pg.Client({ connectionString: localStack().DB_URL })
  try {
    await client.connect()
    const { rows: [row] } = await client.query(`select
      '2026-11-10T12:34:56.123456Z'::timestamptz as timestamp,
      null::timestamptz as nullable,
      jsonb_build_object('timestamp','2026-11-10T12:34:56.123456Z'::timestamptz,'value',null) as details,
      to_char('2026-11-10T12:34:56.123456Z'::timestamptz at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as cursor`)
    assert.ok(row.timestamp instanceof Date)
    assert.equal(row.timestamp.toISOString(), '2026-11-10T12:34:56.123Z')
    assert.equal(row.nullable, null)
    assert.deepEqual(row.details, { timestamp: '2026-11-10T12:34:56.123456+00:00', value: null })
    assert.equal(row.cursor, '2026-11-10T12:34:56.123456Z')
  } finally { await client.end() }
})
