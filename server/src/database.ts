import { Kysely, PostgresDialect, sql, type Transaction } from 'kysely'
import pg from 'pg'
import type { DB } from './database.types.ts'

/*
 * Database Connection
 */

export function connectDatabase(connectionString: string, max = 4) {
  const endpoint = new URL(connectionString)
  if (decodeURIComponent(endpoint.username).split('.')[0] !== 'ct_api') throw new Error('Expected ct_api login.')
  if (!['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname) &&
      endpoint.searchParams.get('sslmode') !== 'verify-full') throw new Error('Remote database requires verified TLS.')
  const pool = new pg.Pool({ connectionString, max, connectionTimeoutMillis: 4000,
    statement_timeout: 5000, lock_timeout: 2000, idle_in_transaction_session_timeout: 8000 })
  pool.on('error', () => console.error('An idle database connection failed.'))
  return new Kysely<DB>({ dialect: new PostgresDialect({ pool }) })
}

export type AppDatabase = ReturnType<typeof connectDatabase>

/*
 * Transactions and Authenticated Context
 */

export type AuthenticatedContext = Readonly<{ actorId: string; requestId: string }>
export type EligibleActorTransactionResult<T> = { eligible: false } | { eligible: true; value: T }

// Callbacks may be replayed in full. External effects belong after successful
// commit; failed attempts repeat context, locks, facts and decisions.
export async function withTransactionRetry<T>(db: AppDatabase, work: (tx: Transaction<DB>) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.transaction().execute(work)
    } catch (error) {
      // Only a server-confirmed aborted transaction permits automatic replay.
      // Transport errors (including a lost COMMIT acknowledgement) are uncertain.
      if (attempt >= 3 || !(error instanceof pg.DatabaseError)
        || (error.code !== '40001' && error.code !== '40P01')) throw error
    }
  }
}

export async function withEligibleActorTransaction<T>(db: AppDatabase, context: AuthenticatedContext,
  work: (tx: Transaction<DB>) => Promise<T>): Promise<EligibleActorTransactionResult<T>> {
  const { actorId: actor, requestId } = context
  return withTransactionRetry(db, async tx => {
    await sql`select set_config('request.jwt.claim.sub', ${actor}, true),
      set_config('ct.operation_id', ${requestId}, true)`.execute(tx)
    const eligible = await sql<{ allowed: boolean }>`select app_private.lock_eligible_actor() as allowed`.execute(tx)
    if (!eligible.rows[0].allowed) return { eligible: false }
    return { eligible: true, value: await work(tx) }
  })
}

/*
 * Runtime Checks
 */

export async function checkRuntime(db: AppDatabase) {
  const { rows } = await sql<{ ready: boolean }>`
    select current_user = 'ct_api' and session_user = 'ct_api'
      and not (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb)
      and has_column_privilege(current_user,'public.user_accounts','allow_direct_messages','UPDATE')
      and row_security_active('public.user_accounts')
      and has_column_privilege(current_user,'public.community_standing','standing','SELECT')
      and has_column_privilege(current_user,'public.community_account_profiles','display_name','SELECT')
      and row_security_active('public.community_accounts')
      and row_security_active('public.community_account_profiles')
      and has_column_privilege(current_user,'public.tenants','operational_status','UPDATE')
      and to_regprocedure('public.join_community(uuid)') is null
      and has_function_privilege(current_user,'app_private.auth_identity_eligible(uuid,boolean)','EXECUTE')
      and to_regprocedure('app_private.is_staff_candidate(uuid,uuid,boolean)') is null
      and has_column_privilege(current_user,'public.tenant_admin_actions','reason','SELECT')
      and has_column_privilege(current_user,'app_private.tenant_admin_action_categories','category','INSERT')
      and to_regprocedure('app_private.can_read_account_action(uuid,uuid)') is null
      and to_regprocedure('app_private.classify_command()') is null
      and to_regprocedure('app_private.append_admin_action()') is null
      and has_column_privilege(current_user,'public.user_account_profiles','display_name','UPDATE')
      and to_regclass('public.my_community_summaries') is null
      and to_regprocedure('public.lookup_tenant(text)') is null
      and to_regprocedure('app_private.can_edit_configuration(uuid,text)') is null
      and to_regprocedure('app_private.guard_configuration_details()') is null
      and has_function_privilege(current_user,'app_private.community_landing(text)','EXECUTE')
      and not has_any_column_privilege('authenticated','public.user_account_profiles','SELECT,INSERT,UPDATE')
      and has_function_privilege(current_user,'app_private.inspect_global_profile(uuid)','EXECUTE')
      and not has_any_column_privilege('authenticated','public.user_account_blocks','SELECT,INSERT,UPDATE')
      and not has_any_column_privilege('authenticated','public.community_accounts','SELECT')
      and has_function_privilege(current_user,'app_private.public_community_directory(text,uuid,integer)','EXECUTE')
      and not has_any_column_privilege('authenticated','public.tenant_staff_assignments','SELECT')
      and has_column_privilege(current_user,'public.community_account_permissions','can_post_public_events','UPDATE')
      and to_regprocedure('app_private.can_manage_account_records(uuid,text)') is null
      and not has_schema_privilege('authenticated','app_private','USAGE')
      and not has_any_column_privilege('service_role','public.user_accounts','SELECT,INSERT,UPDATE')
      and not has_table_privilege('authenticated','public.tenant_admin_actions','SELECT') as ready
    from pg_roles where rolname = current_user
  `.execute(db)
  if (!rows[0]?.ready) throw new Error('Runtime role or schema is unavailable.')
}
