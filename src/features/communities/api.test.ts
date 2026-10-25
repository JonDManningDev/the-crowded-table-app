import { beforeEach, expect, it, vi } from 'vitest'
import { saveCommunityAccountPreferences, saveCommunityProfile } from './api'

const db = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), upsert: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: db }))
beforeEach(() => {
  vi.resetAllMocks()
  db.from.mockReturnValue(db); db.update.mockReturnValue(db); db.upsert.mockReturnValue(db)
  db.eq.mockReturnValue(db); db.select.mockReturnValue(db)
  db.single.mockResolvedValue({ data: { tenant_id: 'community' }, error: null })
})

it('saves all supported community preferences in one scoped update without forwarding protected fields', async () => {
  const input = { show_global_profile: false, standing: 'approved', user_id: 'someone-else' }
  await saveCommunityAccountPreferences('community', input)
  expect(db.from).toHaveBeenCalledExactlyOnceWith('community_accounts')
  expect(db.update).toHaveBeenCalledExactlyOnceWith({ show_global_profile: false })
  expect(db.eq).toHaveBeenCalledExactlyOnceWith('tenant_id', 'community')
  expect(db.single).toHaveBeenCalledOnce()
})

it('propagates denied or missing-row preference saves instead of claiming success', async () => {
  const failure = { code: 'PGRST116', message: 'No eligible row' }
  db.single.mockResolvedValue({ data: null, error: failure })
  await expect(saveCommunityAccountPreferences('community', { show_global_profile: true })).rejects.toEqual(failure)
})

it('saves a separate community profile with database-derived user identity and an explicitly cleared bio', async () => {
  await saveCommunityProfile('community', ' Name ', '  ')
  expect(db.from).toHaveBeenCalledExactlyOnceWith('community_account_profiles')
  expect(db.upsert).toHaveBeenCalledExactlyOnceWith({ tenant_id: 'community', display_name: 'Name', bio: null }, { onConflict: 'tenant_id,user_id' })
  expect(db.update).not.toHaveBeenCalled()
})
