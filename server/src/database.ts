import { Kysely, PostgresDialect, sql } from 'kysely'
import pg from 'pg'
import type { Database } from '../../src/lib/database.types.ts'

type PreferenceTable = Pick<Database['public']['Tables']['user_accounts']['Row'],
  'user_id' | 'user_is_discoverable' | 'enable_matchmaking' | 'allow_direct_messages'>

type Tables = Database['public']['Tables']
export type ApiTables = {
  user_accounts: PreferenceTable
  community_standing: Tables['community_standing']['Row']
  community_accounts: Pick<Tables['community_accounts']['Row'], 'tenant_id' | 'user_id' | 'standing'>
  community_account_profiles: Tables['community_account_profiles']['Row']
}

export function connectDatabase(connectionString: string, max = 4) {
  const endpoint = new URL(connectionString)
  if (decodeURIComponent(endpoint.username).split('.')[0] !== 'ct_api') throw new Error('Expected ct_api login.')
  if (!['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname) &&
      endpoint.searchParams.get('sslmode') !== 'verify-full') throw new Error('Remote database requires verified TLS.')
  const pool = new pg.Pool({ connectionString, max, connectionTimeoutMillis: 4000,
    statement_timeout: 5000, lock_timeout: 2000, idle_in_transaction_session_timeout: 8000 })
  pool.on('error', () => console.error('An idle database connection failed.'))
  return new Kysely<ApiTables>({ dialect: new PostgresDialect({ pool }) })
}

export type AppDatabase = ReturnType<typeof connectDatabase>

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
      and has_function_privilege(current_user,'app_private.is_staff_candidate(uuid,uuid,boolean)','EXECUTE') as ready
    from pg_roles where rolname = current_user
  `.execute(db)
  if (!rows[0]?.ready) throw new Error('Runtime role or schema is unavailable.')
}
