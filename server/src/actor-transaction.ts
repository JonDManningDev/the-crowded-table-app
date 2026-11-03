import { sql, type Transaction } from 'kysely'
import type { ApiTables, AppDatabase } from './database.ts'

export async function withVerifiedActor<T>(db: AppDatabase, actor: string, requestId: string, work: (tx: Transaction<ApiTables>) => Promise<T>) {
  return db.transaction().execute(async tx => {
    await sql`select set_config('request.jwt.claim.sub', ${actor}, true),
      set_config('ct.operation_id', ${requestId}, true)`.execute(tx)
    const eligible = await sql<{ allowed: boolean }>`select app_private.lock_eligible_actor() as allowed`.execute(tx)
    if (!eligible.rows[0].allowed) return { status: 403 as const }
    return work(tx)
  })
}
