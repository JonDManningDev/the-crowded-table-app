import { supabase } from '../../lib/supabase'
import type { CommandResult, CommunityCommand, CreateCommunityInput } from '../../../shared/community-commands'

async function post(expectedUserId: string, path: string, body: CommunityCommand | CreateCommunityInput): Promise<CommandResult> {
  if (!supabase) throw new Error('Community services are not configured.')
  const { data, error } = await supabase.auth.getSession()
  if (error || data.session?.user.id !== expectedUserId) throw Object.assign(new Error('Verified account required'), { code: 'ineligible' })
  const response = await fetch(path, { method: 'POST', redirect: 'error', cache: 'no-store',
    headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body) })
  const result = await response.json()
  if (!response.ok) throw Object.assign(new Error('Community command failed'), { code: result.code })
  if (typeof result.tenantId !== 'string' || !result.tenantId || typeof result.outcome !== 'string') throw new Error('Invalid command response')
  return result
}
export const submitCommunity = (userId: string, input: CreateCommunityInput) => post(userId, '/api/communities', input)
export const sendCommunityCommand = (userId: string, tenantId: string, input: CommunityCommand) =>
  post(userId, '/api/communities/' + encodeURIComponent(tenantId) + '/commands', input)
