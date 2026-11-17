import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { readOwnGlobalProfile, saveGlobalProfile } from './api'
const db=vi.hoisted(()=>({from:vi.fn(),auth:{getSession:vi.fn()}}))
vi.mock('../../lib/supabase',()=>({supabase:db}))
const fetcher=vi.fn()
beforeEach(()=>{
  vi.resetAllMocks(); vi.stubGlobal('fetch',fetcher)
  db.auth.getSession.mockResolvedValue({data:{session:{user:{id:'actor'},access_token:'token'}},error:null})
})
afterEach(()=>{vi.unstubAllGlobals(); expect(db.from).not.toHaveBeenCalled()})
it('keeps a missing own profile distinct from a failed read',async()=>{
  fetcher.mockResolvedValueOnce(new Response('{"profile":null}'))
  expect(await readOwnGlobalProfile('actor')).toBeNull()
  fetcher.mockResolvedValueOnce(new Response('{}',{status:403}))
  await expect(readOwnGlobalProfile('actor')).rejects.toThrow()
})
it('sends one normalized profile write without identity or audit fields',async()=>{
  fetcher.mockResolvedValueOnce(new Response('{"profile":{"user_id":"actor"}}'))
  await saveGlobalProfile('actor',' Name ','  ')
  expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/me/profile',expect.objectContaining({method:'PUT',
    body:'{"display_name":"Name","bio":null}',headers:{Authorization:'Bearer token','Content-Type':'application/json'},cache:'no-store',redirect:'error'}))
})
it('blocks old-identity loads and saves, and does not claim success for malformed replies',async()=>{
  await expect(readOwnGlobalProfile('previous')).rejects.toThrow('session changed')
  await expect(saveGlobalProfile('previous','Name','')).rejects.toThrow('Your profile could not be saved.')
  expect(fetcher).not.toHaveBeenCalled()
  fetcher.mockResolvedValueOnce(new Response('{}'))
  await expect(readOwnGlobalProfile('actor')).rejects.toThrow('Invalid profile response')
  fetcher.mockResolvedValueOnce(new Response('{"profile":null}'))
  await expect(saveGlobalProfile('actor','Name','')).rejects.toThrow('Your profile could not be saved.')
})
