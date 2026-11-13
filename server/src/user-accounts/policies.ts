import type { Tx } from './types.ts'

/*
 * Types
 */

// None currently.

/*
 * Fact Loaders
 */

export function loadOwnBlockFacts(tx: Tx, actor: string, target: string) {
  return tx.selectFrom('user_account_blocks').select('blocked_user_id')
    .where('blocker_user_id', '=', actor).where('blocked_user_id', '=', target).executeTakeFirst()
}

/*
 * Helpers
 */

// None currently.

/*
 * Requirements and Decisions
 */

// None currently.
