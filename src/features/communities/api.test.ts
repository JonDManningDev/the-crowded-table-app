import { beforeEach, expect, it, vi } from 'vitest'
import { readCommunityPreviewIdentity, readMembershipPreviewContent, switchMockCommunityPreview, saveCommunityAccountPreferences, saveCommunityProfile } from './api'

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
  expect(db.from).toHaveBeenCalledExactlyOnceWith('community_account_preferences')
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
  expect(db.update).toHaveBeenCalledExactlyOnceWith({ display_name: 'Name', bio: null })
  expect(db.eq).toHaveBeenCalledExactlyOnceWith('tenant_id', 'community')
})


it('returns isolated community identity/benefit content and toggles only the mock preview flag', () => {
  const identity = readCommunityPreviewIdentity(), content = readMembershipPreviewContent()
  expect(identity).toEqual({ name: 'The Crowded Table', subtitle: 'GAMES · PEOPLE · BELONGING', location: 'Tegucigalpa, Honduras', motto: 'Different games.\nSame table.' })
  expect(content.benefits).toHaveLength(4)
  identity.name = 'Caller edit'; content.benefits.length = 0
  expect(readCommunityPreviewIdentity().name).toBe('The Crowded Table')
  expect(readMembershipPreviewContent().benefits).toHaveLength(4)
  expect(switchMockCommunityPreview(true)).toBe(false); expect(switchMockCommunityPreview(false)).toBe(true)
  expect(db.from).not.toHaveBeenCalled()
})
