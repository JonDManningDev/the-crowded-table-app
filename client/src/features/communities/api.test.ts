import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { readCommunityPreviewIdentity, readMembershipPreviewContent, switchMockCommunityPreview, saveCommunityAccountPreferences, saveCommunityProfile } from './api'

const db = vi.hoisted(() => ({ from: vi.fn(), auth: { getSession: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: db }))
const fetcher = vi.fn()
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('fetch',fetcher)
  db.auth.getSession.mockResolvedValue({data:{session:{user:{id:'actor'},access_token:'token'}},error:null})
  fetcher.mockResolvedValue(new Response(JSON.stringify({show_global_profile:false,allow_direct_messages:true,allow_private_invitations:true})))
})
afterEach(() => { vi.unstubAllGlobals(); expect(db.from).not.toHaveBeenCalled() })

it('saves all supported community preferences in one scoped update without forwarding protected fields', async () => {
  const input = { show_global_profile: false, standing: 'approved', user_id: 'someone-else' }
  await saveCommunityAccountPreferences('actor','community', input)
  expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/communities/community/me/preferences',expect.objectContaining({
    method:'PATCH',body:JSON.stringify({show_global_profile:false}),cache:'no-store',redirect:'error',
  }))
})

it('propagates denied or missing-row preference saves instead of claiming success', async () => {
  fetcher.mockResolvedValue(new Response('{}',{status:404}))
  await expect(saveCommunityAccountPreferences('actor','community', { show_global_profile: true })).rejects.toThrow('Account operation failed')
})

it('saves a separate community profile with database-derived user identity and an explicitly cleared bio', async () => {
  fetcher.mockResolvedValue(new Response(JSON.stringify({tenantId:'community'})))
  await saveCommunityProfile('actor','community', ' Name ', '  ')
  expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/communities/community/me/profile',expect.objectContaining({
    method:'PATCH',body:JSON.stringify({display_name:'Name',bio:null}),headers:{Authorization:'Bearer token','Content-Type':'application/json'},
  }))
})

it('rejects a changed identity before writing a community draft', async () => {
  await expect(saveCommunityProfile('previous','community','Name','')).rejects.toThrow('session changed')
  await expect(saveCommunityAccountPreferences('previous','community',{show_global_profile:true})).rejects.toThrow('session changed')
  expect(fetcher).not.toHaveBeenCalled()
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
