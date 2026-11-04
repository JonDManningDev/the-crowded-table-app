import { sql, type Transaction } from 'kysely'
import type { ApiTables, AppDatabase } from '../database.ts'
import { ApplicationError } from '../application-errors.ts'
import type { DirectoryCursors } from '../directory-cursors.ts'
import { type CommunityLanding } from '../../../shared/community-configuration.ts'
import { type DirectoryPage, type DirectoryQuery, type PublicDirectoryRow } from '../../../shared/community-directory.ts'

type Tx = Transaction<ApiTables>
interface CommunityDependencies { db: AppDatabase; cursors: DirectoryCursors }

export function createCommunityService({ db, cursors }: CommunityDependencies) {
  return {
    listStandings() {
      return db.selectFrom('community_standing').select(standingFields).orderBy('standing').execute()
    },
    readLanding(params: { slug: string }) {
      return readCommunityLanding(db, params.slug)
    },
    publicDirectory(params: { slug: string }, query: DirectoryQuery) {
      return db.transaction().execute(tx => readPublicDirectory(tx, params.slug, query, cursors))
    }
  }
}
export type CommunityService = ReturnType<typeof createCommunityService>

// Public access and standing
const standingFields = ['standing', 'enable_standard_chat_visibility', 'enable_standard_activity_visibility', 'enable_other_profile_visibility', 'enable_own_profile_management', 'enable_standard_participation', 'enable_standard_dms'] as const
async function readCommunityLanding(db: AppDatabase, slug: string) {
  return (await sql<CommunityLanding>`select * from app_private.community_landing(${slug})`.execute(db)).rows[0]
}
export async function readPublicDirectory(tx: Tx, slug: string, query: DirectoryQuery, cursors: DirectoryCursors): Promise<DirectoryPage<PublicDirectoryRow>> {
  const scope = ['public-directory', slug], after = cursors.decode(scope, query.cursor), limit = Number(query.limit ?? 50)
  type InternalRow = PublicDirectoryRow & { user_id: string }
  const result = (await sql<{ rows: InternalRow[] | null }>`select app_private.public_community_directory(${slug},${after}::uuid,${limit}) as rows`.execute(tx)).rows[0]
  if (result.rows === null) throw new ApplicationError(404, 'missing')
  const visible = result.rows.slice(0, limit), last = visible.at(-1)
  return {
    rows: visible.map(({ display_name, staff_role }) => ({ display_name, staff_role })),
    next: result.rows.length > limit && last ? cursors.encode(scope, last.user_id) : null
  }
}
