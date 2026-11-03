import { withVerifiedActor } from '../actor-transaction.ts'
import type { AppDatabase } from '../database.ts'
import { preferencesSchema, type AccountPreferences } from '../../../shared/account-preferences.ts'

export async function accountPreferences(db: AppDatabase, actor: string, requestId: string, input?: AccountPreferences) {
  return withVerifiedActor(db, actor, requestId, async tx => {
    const fields = preferencesSchema.required
    const row = input
      ? await tx.updateTable('user_accounts').set(input).where('user_id', '=', actor).returning(fields).executeTakeFirst()
      : await tx.selectFrom('user_accounts').select(fields).where('user_id', '=', actor).executeTakeFirst()
    return row ? { status: 200 as const, row } : { status: 404 as const }
  })
}
