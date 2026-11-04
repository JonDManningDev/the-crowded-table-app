import { afterEach, expect, it, vi } from 'vitest'
import { readAccountPreferences, saveAccountPreferences } from './api'

const getSession = vi.hoisted(() => vi.fn())
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getSession } } }))
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks() })
const preferences = { user_is_discoverable: false, enable_matchmaking: true, allow_direct_messages: false }

it('sends all three flags and takes identity only from the bearer token', async () => {
  getSession.mockResolvedValue({ data: { session: { user: { id: 'viewer' }, access_token: 'access' } } })
  const fetcher = vi.fn().mockResolvedValue(Response.json(preferences))
  vi.stubGlobal('fetch', fetcher)
  expect(await readAccountPreferences('viewer')).toEqual(preferences)
  await saveAccountPreferences('viewer', preferences)
  expect(fetcher).toHaveBeenLastCalledWith('/api/me/preferences', expect.objectContaining({
    method: 'PUT', body: JSON.stringify(preferences),
    headers: { Authorization: 'Bearer access', 'Content-Type': 'application/json' },
  }))
  await expect(saveAccountPreferences('previous-viewer', preferences)).rejects.toThrow('session changed')
  expect(fetcher).toHaveBeenCalledTimes(2)
})
