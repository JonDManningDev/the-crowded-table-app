import { randomBytes } from 'node:crypto'
import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import { directoryCursors } from '../../src/directory-cursors.ts'
import { createUserAccountService } from '../../src/user-accounts/service.ts'

// Observe a successful block write on its real connection before commit.
export async function runBlockWriteWithHook(endpoint, context, target, operation, afterWrite) {
  const statement = operation === 'blockUser' ? 'insert into' : 'delete from'
  const pool = new pg.Pool({ connectionString: endpoint, max: 1,
    connectionTimeoutMillis: 4000, statement_timeout: 5000, lock_timeout: 2000,
    idle_in_transaction_session_timeout: 8000 })
  pool.on('connect', client => {
    const query = client.query.bind(client)
    client.query = async (text, parameters) => {
      const result = await query(text, parameters)
      if (text.startsWith(`${statement} public.user_account_blocks`) && result.rowCount === 1) {
        await afterWrite(client)
      }
      return result
    }
  })
  const db = new Kysely({ dialect: new PostgresDialect({ pool }) })
  try {
    const service = createUserAccountService({ db, cursors: directoryCursors(randomBytes(32).toString('hex')) })
    return await service[operation](context, target)
  } finally {
    await db.destroy()
  }
}

export function holdBlockWrite(endpoint, context, target, operation) {
  const { promise: started, resolve: ready } = Promise.withResolvers()
  const { promise: gate, resolve: release } = Promise.withResolvers()
  const result = runBlockWriteWithHook(endpoint, context, target, operation, async client => {
    const { rows: [{ pid }] } = await client.query('select pg_backend_pid() as pid')
    ready(pid)
    await gate
  })
  return { started, release, result }
}
