import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Kysely, PostgresDialect, sql } from 'kysely'
import { generate, PostgresDialect as CodegenPostgresDialect } from 'kysely-codegen'
import pg from 'pg'
import { localStack } from '../../supabase/tests/local-stack.mjs'

const config = JSON.parse(readFileSync(new URL('../kysely-codegen.json', import.meta.url), 'utf8'))
export const databaseTypesPath = fileURLToPath(new URL('../src/database.types.ts', import.meta.url))

export async function generateDatabaseTypes({ verify = false, outFile = databaseTypesPath } = {}) {
  // Tooling credentials come only from the explicitly local CLI target, never
  // DATABASE_URL (which may point at the hosted runtime).
  const { DB_URL } = localStack()
  const db = new Kysely({ dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: DB_URL, max: 1 }) }) })
  try {
    const { rows } = await sql`
      select n.nspname || '.' || c.relname || '.' || a.attname as column,
        a.attgenerated as generated, a.attidentity as identity, a.attnotnull as not_null
      from pg_attribute a join pg_class c on c.oid=a.attrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','app_private') and c.relkind in ('r','p')
        and a.attnum>0 and not a.attisdropped and (a.attgenerated<>'' or a.attidentity<>'')
      order by 1`.execute(db)
    // Fail closed on new generated/identity columns: review their actual read,
    // insert and update semantics and add a compiler assertion and override.
    assert.deepEqual(rows.map(row => row.column), Object.keys(config.overrides.columns).sort(),
      'Generated/identity inventory changed; review codegen overrides and compiler checks.')
    assert.deepEqual(rows, [{ column: 'public.tenant_staff_assignments.required_account_standing',
      generated: 's', identity: '', not_null: false }], 'Review generated column semantics.')
    const output = await generate({ ...config, db, dialect: new CodegenPostgresDialect(), outFile, verify })
    console.log(`Database types ${verify ? 'verified' : 'generated'}; ${rows.length} generated/identity column reviewed.`)
    return output
  } finally { await db.destroy() }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  assert.ok(process.argv.slice(2).every(arg => arg === '--verify'), 'Only --verify is supported.')
  await generateDatabaseTypes({ verify: process.argv.includes('--verify') })
}
