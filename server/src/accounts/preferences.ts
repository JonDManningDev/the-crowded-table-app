import { sql } from 'kysely'
import type { AppDatabase } from '../database.ts'
import { preferencesSchema, type AccountPreferences } from '../../../shared/account-preferences.ts'

export async function accountPreferences(db: AppDatabase, actor: string, requestId: string, input?: AccountPreferences) {
  return db.transaction().execute(async tx => {
    // The existing auth.uid(), self RLS and audit triggers use this transaction-local subject.
    await sql`select set_config('request.jwt.claim.sub', ${actor}, true),
      set_config('ct.operation_id', ${requestId}, true)`.execute(tx)
    const eligible = await sql<{ allowed: boolean }>`select app_private.lock_eligible_actor() as allowed`.execute(tx)
    if (!eligible.rows[0].allowed) return { status: 403 as const }
    const fields = preferencesSchema.required
    const row = input
      ? await tx.updateTable('user_accounts').set(input).where('user_id', '=', actor).returning(fields).executeTakeFirst()
      : await tx.selectFrom('user_accounts').select(fields).where('user_id', '=', actor).executeTakeFirst()
    return row ? { status: 200 as const, row } : { status: 404 as const }
  })
}
