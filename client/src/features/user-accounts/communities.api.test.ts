import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { readMyCommunities, readAccountSampleCommunity } from './api'
const db = vi.hoisted(() => ({ from: vi.fn(), auth: { getSession: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: db }))
const fetcher=vi.fn()
const session=(id='actor')=>({data:{session:{user:{id},access_token:'token'}},error:null})
const page=(rows: object[]=[],next: string|null=null)=>new Response(JSON.stringify({rows,next}))
beforeEach(()=>{
  vi.resetAllMocks(); vi.stubGlobal('fetch',fetcher)
  db.auth.getSession.mockResolvedValue(session())
  fetcher.mockImplementation(async()=>page())
})
afterEach(()=>{vi.unstubAllGlobals(); expect(db.from).not.toHaveBeenCalled()})
it('requests each safe summary filter using the actor token',async()=>{
  for(const filter of ['all','managed','owned'] as const) await readMyCommunities(filter)
  expect(fetcher.mock.calls.map(([url])=>url)).toEqual(['all','managed','owned'].map(filter=>'/api/me/communities?filter='+filter+'&limit=100'))
  expect(fetcher.mock.calls[0][1]).toMatchObject({cache:'no-store',redirect:'error',headers:{Authorization:'Bearer token'}})
})
it('loads all pages and fails the whole result when a later page fails',async()=>{
  fetcher.mockResolvedValueOnce(page([{id:'a'}],'next')).mockResolvedValueOnce(page([{id:'b'}]))
  expect(await readMyCommunities('all')).toEqual([{id:'a'},{id:'b'}])
  expect(fetcher.mock.calls[1][0]).toContain('cursor=next')
  fetcher.mockResolvedValueOnce(page([{id:'a'}],'next')).mockResolvedValueOnce(new Response('{}',{status:403}))
  await expect(readMyCommunities('all')).rejects.toThrow('We couldn’t load your communities.')
})
it('does not combine pages from different sessions or loop on a repeated cursor',async()=>{
  db.auth.getSession.mockResolvedValueOnce(session()).mockResolvedValueOnce(session()).mockResolvedValueOnce(session('changed'))
  fetcher.mockResolvedValueOnce(page([{id:'a'}],'next'))
  await expect(readMyCommunities('all')).rejects.toThrow('We couldn’t load your communities.')
  expect(fetcher).toHaveBeenCalledTimes(1)
  fetcher.mockImplementation(async()=>page([{id:'a'}],'repeated'))
  await expect(readMyCommunities('all')).rejects.toThrow('We couldn’t load your communities.')
  expect(fetcher).toHaveBeenCalledTimes(3)
})
it('returns the existing isolated sample without querying',()=>{
  const first=readAccountSampleCommunity()
  expect(first).toEqual({id:'sample',name:'The Crowded Table',place:'Tegucigalpa, Honduras',status:'Active',participation:'Member',sample:true})
  first.name='Changed'
  expect(readAccountSampleCommunity().name).toBe('The Crowded Table')
  expect(fetcher).not.toHaveBeenCalled()
})
