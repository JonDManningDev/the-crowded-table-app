import type { Insertable, Kysely, Selectable, Updateable } from 'kysely'
import type { DB } from '../src/database.types.ts'

// Compiler seam: query structure is independent of the runtime role's grants.
declare const db: Kysely<DB>
declare const staff: Selectable<DB['tenant_staff_assignments']>
const standing: string | null = staff.required_account_standing
const timestamp: Date = staff.created_at
void [standing, timestamp]
declare const account: Selectable<DB['community_accounts']>
const firstApproval: Date | null = account.first_approved_at
void firstApproval

db.selectFrom('app_private.community_account_requests').selectAll()
db.selectFrom('app_private.tenant_admin_action_categories').selectAll()
// @ts-expect-error Auth remains outside the application query model.
db.selectFrom('auth.users')

const insert: Insertable<DB['tenant_staff_assignments']> = {
  tenant_id: 'tenant', user_id: 'user', role: 'admin',
}
const update: Updateable<DB['tenant_staff_assignments']> = { status: 'paused' }
void [insert, update]
// @ts-expect-error Stored generated columns cannot be inserted.
db.insertInto('tenant_staff_assignments').values({ ...insert, required_account_standing: 'approved' })
// @ts-expect-error Stored generated columns cannot be updated, even to null.
db.updateTable('tenant_staff_assignments').set({ required_account_standing: null })
// @ts-expect-error A selected nullable generated column is not a non-null string.
const nonNullable: string = staff.required_account_standing
void nonNullable

db.updateTable('user_account_profiles').set({ updated_at: new Date(), bio: null })
db.updateTable('user_account_profiles').set({ updated_at: '2026-11-10T00:00:00Z' })
db.insertInto('tenant_admin_actions').values({ tenant_id: 'tenant', action: 'created', details: { value: null } })
// @ts-expect-error Required identifiers have no stored default.
db.insertInto('user_accounts').values({})
// @ts-expect-error Selected timestamps are pg Dates, not strings.
const textTimestamp: string = staff.created_at
void textTimestamp
