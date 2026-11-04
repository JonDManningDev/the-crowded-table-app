import { sql, type Transaction } from 'kysely'
import type { ApiTables, AppDatabase } from './database.ts'

export type AuthenticatedContext = Readonly<{ actorId: string; requestId: string }>
export type EligibleActorTransactionResult<T> = { eligible: false } | { eligible: true; value: T }

export async function withEligibleActorTransaction<T>(db: AppDatabase, context: AuthenticatedContext,
  work: (tx: Transaction<ApiTables>) => Promise<T>): Promise<EligibleActorTransactionResult<T>> {
  const { actorId: actor, requestId } = context
  return db.transaction().execute(async tx => {
    await sql`select set_config('request.jwt.claim.sub', ${actor}, true),
      set_config('ct.operation_id', ${requestId}, true)`.execute(tx)
    const eligible = await sql<{ allowed: boolean }>`select app_private.lock_eligible_actor() as allowed`.execute(tx)
    if (!eligible.rows[0].allowed) return { eligible: false }
    return { eligible: true, value: await work(tx) }
  })
}
