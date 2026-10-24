// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AccountContext } from '../auth/accountContext'
import { MyCommunitiesTab } from './components/MyCommunitiesTab'
import { toCommunityCards, type CommunitySummary } from './communities'

const api = vi.hoisted(() => ({ readMyCommunities: vi.fn() }))
vi.mock('./communities', async original => ({ ...await original<typeof import('./communities')>(), readMyCommunities: api.readMyCommunities }))
afterEach(cleanup)
beforeEach(() => { vi.resetAllMocks(); api.readMyCommunities.mockResolvedValue([]) })
const row = (id: string, extra: Partial<CommunitySummary> = {}): CommunitySummary => ({
  id, name: id, city: null, state_province: null, country_code: 'HN', operational_status: 'active',
  created_at: '2026-10-24', is_owned: false, is_managed: false, is_member: true, ...extra,
})
const tree = (userId: string | null = 'alice') => <MemoryRouter>
  <AccountContext.Provider value={userId ? { status: 'signed-in', email: 'a@example.test', userId } : { status: 'signed-out', email: null }}>
    <MyCommunitiesTab previewName="Sample" previewLocation="Sample location"/>
  </AccountContext.Provider>
</MemoryRouter>
it('normalizes relationships, location, status and duplicate IDs', () => {
  const cards = toCommunityCards([row('owner', { is_owned: true, is_managed: true }), row('staff', { is_managed: true }), row('member'), row('member', { city: 'City', state_province: 'Region', operational_status: 'archived' })])
  expect(cards.map(c => c.participation)).toEqual(['Owner', 'Staff', 'Member'])
  expect(cards[2]).toMatchObject({ place: 'City, Region, HN', status: 'Archived' })
})
it('renders normalized cards and disables only real Explore actions', async () => {
  api.readMyCommunities.mockResolvedValue([row('Owned', { is_owned: true, is_managed: true }), row('Staffed', { is_managed: true }), row('Joined', { operational_status: 'archived' })])
  render(tree())
  await screen.findByText('Owned Community')
  expect(screen.getByText('Managed Community')).toBeTruthy()
  expect(screen.getByText('Joined Community')).toBeTruthy()
  expect(screen.getByText('Archived · Member')).toBeTruthy()
  expect(screen.getAllByRole('button', { name: 'Explore community' }).every(b => (b as HTMLButtonElement).disabled)).toBe(true)
  expect(screen.getByRole('link', { name: 'Explore community' }).getAttribute('href')).toBe('/community/preview')
  expect(screen.queryByText('A preview community to explore.')).toBeNull()
  expect(screen.getAllByRole('listitem')).toHaveLength(4)
})
it('handles empty filters, sample visibility and retry without stale rows', async () => {
  render(tree())
  await screen.findByText('You haven’t joined or created a community yet.')
  fireEvent.click(screen.getByRole('button', { name: 'Managed' }))
  expect(screen.queryByRole('heading', { name: 'Sample' })).toBeNull()
  await screen.findByText('You don’t manage any communities yet.')
  api.readMyCommunities.mockRejectedValueOnce(new Error('We couldn’t load your communities. Please try again.'))
  fireEvent.click(screen.getByRole('button', { name: 'Owned' }))
  await screen.findByRole('alert')
  expect(screen.queryByText('You haven’t created a community yet.')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByText('You haven’t created a community yet.')
  expect(api.readMyCommunities.mock.calls.map(c => c[0])).toEqual(['all', 'managed', 'owned', 'owned'])
})
it('ignores late responses after filter changes', async () => {
  let resolve!: (rows: CommunitySummary[]) => void
  api.readMyCommunities.mockReturnValueOnce(new Promise<CommunitySummary[]>(done => { resolve = done }))
  render(tree())
  expect(screen.getByRole('status').textContent).toContain('Loading')
  expect(screen.getByRole('heading', { name: 'Sample' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Owned' }))
  await screen.findByText('You haven’t created a community yet.')
  resolve([row('Late result')])
  await waitFor(() => expect(screen.queryByText('Late result')).toBeNull())
})
it('clears private rows and selection on account changes and sign-out', async () => {
  api.readMyCommunities.mockResolvedValue([row('Alice private')])
  const view = render(tree())
  await screen.findByText('Alice private')
  fireEvent.click(screen.getByRole('button', { name: 'Owned' }))
  await waitFor(() => expect(api.readMyCommunities).toHaveBeenLastCalledWith('owned'))
  api.readMyCommunities.mockReturnValue(new Promise(() => {}))
  view.rerender(tree('bob'))
  expect(screen.queryByText('Alice private')).toBeNull()
  expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')
  view.rerender(tree(null))
  expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  view.rerender(tree('alice'))
  expect(screen.queryByText('Alice private')).toBeNull()
})
it('keeps the sample accessible when services are unavailable', async () => {
  api.readMyCommunities.mockRejectedValue(new Error('Community services are not configured.'))
  render(tree())
  await screen.findByText('Community services are not configured.')
  expect(screen.getByRole('link', { name: 'Explore community' })).toBeTruthy()
})
