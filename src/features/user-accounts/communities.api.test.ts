import { beforeEach, expect, it, vi } from 'vitest'
import { readMyCommunities } from './communities'
const q = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), or: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: q }))
beforeEach(() => { vi.resetAllMocks(); for (const f of [q.from, q.select, q.or, q.eq, q.order]) f.mockReturnValue(q); q.range.mockResolvedValue({ data: [], error: null }) })
it('queries only the safe view with server filters and stable ordering', async () => {
  await readMyCommunities('all'); await readMyCommunities('managed'); await readMyCommunities('owned')
  expect(q.from).toHaveBeenCalledWith('my_community_summaries')
  expect(q.or).toHaveBeenCalledWith('is_owned.eq.true,is_member.eq.true')
  expect(q.eq.mock.calls).toEqual([['is_managed', true], ['is_owned', true]])
  expect(q.order).toHaveBeenCalledWith('created_at', { ascending: false })
  expect(q.order).toHaveBeenCalledWith('id', { ascending: true })
  expect(q.select.mock.calls[0][0]).not.toMatch(/slug|timezone|created_by|updated_by|user_id/)
})
it('loads beyond the API row cap and propagates failed pages', async () => {
  q.range.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, id) => ({ id })), error: null })
    .mockResolvedValueOnce({ data: [{ id: 1000 }], error: null })
  expect(await readMyCommunities('all')).toHaveLength(1001)
  expect(q.range.mock.calls).toEqual([[0, 999], [1000, 1999]])
  q.range.mockResolvedValueOnce({ data: null, error: { message: 'private diagnostic' } })
  await expect(readMyCommunities('all')).rejects.toThrow('We couldn’t load your communities.')
})
