import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AccountSettingsTab } from './AccountSettingsTab'
import { AccountContext } from '../accountContext'
import { MemoryRouter } from 'react-router'

function Settings({ userId = 'viewer', status = 'signed-in' }: { userId?: string; status?: 'signed-in' | 'signed-out' | 'loading' }) {
  return <MemoryRouter><AccountContext.Provider value={{ status, userId, email: null }}>
    <AccountSettingsTab/>
  </AccountContext.Provider></MemoryRouter>
}

const db = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn(), update: vi.fn() }))
vi.mock('../../../lib/supabase', () => ({ supabase: db }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('loads saved preferences and saves independent values without resetting them to defaults', async () => {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db)
  db.single.mockResolvedValue({ data: { user_is_discoverable: false, enable_matchmaking: true, allow_direct_messages: false }, error: null })
  db.update.mockReturnValue(db)
  render(<Settings/>)
  const search = await screen.findByRole('switch', { name: /Appear in global/ }) as HTMLInputElement
  const matching = screen.getByRole('switch', { name: /Participate in global/ }) as HTMLInputElement
  expect(search.checked).toBe(false)
  expect(matching.checked).toBe(true)
  const messages = screen.getByRole('switch', { name: /Allow direct messages/ }) as HTMLInputElement
  expect(messages.checked).toBe(false)
  expect(screen.getAllByRole('button', { name: /Save/ })).toHaveLength(1)
  expect(screen.getByRole('heading', { name: 'Communication preferences' })).toBeTruthy()
  expect(screen.getByText('Let other users contact you through your global Crowded Table user account. They must first be able to see your global account to do this.')).toBeTruthy()
  expect(screen.queryByText(/Save your preferences for global search/)).toBeNull()
  fireEvent.click(messages)
  fireEvent.click(matching)
  fireEvent.click(screen.getByRole('button', { name: 'Save account preferences' }))
  await screen.findByText('Account preferences saved.')
  expect(db.eq).toHaveBeenCalledWith('user_id', 'viewer')
  expect(db.update).toHaveBeenCalledWith({ user_is_discoverable: false, enable_matchmaking: false, allow_direct_messages: true })
})

it('does not invent default settings when a read fails', async () => {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db)
  db.single.mockResolvedValue({ data: null, error: { message: 'offline' } })
  render(<Settings/>)
  await screen.findByRole('alert')
  expect(screen.queryByRole('switch')).toBeNull()
  expect(db.update).not.toHaveBeenCalled()
})

it('keeps the draft and reports failure when a preference update affects no eligible row', async () => {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db); db.update.mockReturnValue(db)
  db.single.mockResolvedValueOnce({ data: { user_is_discoverable: true, enable_matchmaking: true, allow_direct_messages: false }, error: null })
  db.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
  render(<Settings/>)
  fireEvent.click(await screen.findByRole('switch', { name: /Appear in global/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Save account preferences' }))
  await screen.findByText('Your preferences could not be saved. Please try again.')
  expect((screen.getByRole('switch', { name: /Appear in global/ }) as HTMLInputElement).checked).toBe(false)
  expect(screen.queryByText('Account preferences saved.')).toBeNull()
})


it('disables every switch during the single combined save', async () => {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db); db.update.mockReturnValue(db)
  db.single.mockResolvedValueOnce({ data: { user_is_discoverable: true, enable_matchmaking: false, allow_direct_messages: true }, error: null })
  db.single.mockImplementationOnce(() => new Promise(() => {}))
  render(<Settings/>)
  await screen.findByRole('switch', { name: /Allow direct messages/ })
  fireEvent.click(screen.getByRole('button', { name: 'Save account preferences' }))
  expect(screen.getAllByRole('switch').every(input => (input as HTMLInputElement).disabled)).toBe(true)
  expect(screen.getAllByRole('button')).toHaveLength(1)
  expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true)
})


function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
const initialPreferences = { user_is_discoverable: true, enable_matchmaking: false, allow_direct_messages: true }
function prepareDatabase() {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db); db.update.mockReturnValue(db)
}

it('keeps the premium placeholder and destinations available when preferences fail to load', async () => {
  prepareDatabase()
  db.single.mockResolvedValue({ data: null, error: { message: 'offline' } })
  render(<Settings/>)
  await screen.findByRole('alert')
  expect(screen.getByText('Community ownership')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Manage' }).getAttribute('href')).toBe('/account/communities')
  expect(screen.getByRole('link', { name: 'Explore Premium Features' }).getAttribute('href')).toBe('/account/premium-features')
})

it.each(['signed-out', 'loading'] as const)('does not load preferences for a %s account even with a stale ID', status => {
  render(<Settings userId="stale" status={status}/>)
  expect(db.from).not.toHaveBeenCalled()
  expect(screen.queryByRole('switch')).toBeNull()
})

it('does not request preferences when the signed-in account has no ID', () => {
  render(<MemoryRouter><AccountContext.Provider value={{ status: 'signed-in', email: null }}>
    <AccountSettingsTab/>
  </AccountContext.Provider></MemoryRouter>)
  expect(db.from).not.toHaveBeenCalled()
  expect(screen.queryByRole('switch')).toBeNull()
  expect(screen.getByText('Community ownership')).toBeTruthy()
})

it('discards a late load from the previous account and hides its draft during the new load', async () => {
  prepareDatabase()
  const first = deferred<{ data: typeof initialPreferences; error: null }>()
  const second = deferred<{ data: typeof initialPreferences; error: null }>()
  db.single.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const view = render(<Settings userId="first"/>)
  view.rerender(<Settings userId="second"/>)
  expect(screen.queryByRole('switch')).toBeNull()
  await act(async () => { first.resolve({ data: initialPreferences, error: null }) })
  expect(screen.queryByRole('switch')).toBeNull()
  await act(async () => { second.resolve({ data: { ...initialPreferences, user_is_discoverable: false }, error: null }) })
  expect((screen.getByRole('switch', { name: /Appear in global/ }) as HTMLInputElement).checked).toBe(false)
})

it.each([null, { message: 'denied' }])('ignores a late save completion after switching accounts (error: %j)', async error => {
  prepareDatabase()
  const pendingSave = deferred<{ data: null; error: typeof error }>()
  db.single.mockResolvedValueOnce({ data: initialPreferences, error: null })
    .mockReturnValueOnce(pendingSave.promise)
    .mockResolvedValueOnce({ data: { ...initialPreferences, allow_direct_messages: false }, error: null })
  const view = render(<Settings userId="first"/>)
  await screen.findByRole('switch', { name: /Allow direct/ })
  fireEvent.click(screen.getByRole('button', { name: 'Save account preferences' }))
  view.rerender(<Settings userId="second"/>)
  await screen.findByRole('switch', { name: /Allow direct/ })
  await act(async () => { pendingSave.resolve({ data: null, error }) })
  expect(screen.queryByText('Account preferences saved.')).toBeNull()
  expect(screen.queryByRole('alert')).toBeNull()
  expect((screen.getByRole('switch', { name: /Allow direct/ }) as HTMLInputElement).checked).toBe(false)
  expect((screen.getByRole('button', { name: 'Save account preferences' }) as HTMLButtonElement).disabled).toBe(false)
})

it('retains a failed draft for retry, then clears success after the next edit', async () => {
  prepareDatabase()
  db.single.mockResolvedValueOnce({ data: initialPreferences, error: null })
    .mockResolvedValueOnce({ data: null, error: { message: 'denied' } })
    .mockResolvedValueOnce({ data: { user_id: 'viewer' }, error: null })
  render(<Settings/>)
  fireEvent.click(await screen.findByRole('switch', { name: /Allow direct/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Save account preferences' }))
  await screen.findByRole('alert')
  expect((screen.getByRole('switch', { name: /Allow direct/ }) as HTMLInputElement).checked).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Save account preferences' }))
  await screen.findByText('Account preferences saved.')
  expect(db.update).toHaveBeenNthCalledWith(1, { ...initialPreferences, allow_direct_messages: false })
  expect(db.update).toHaveBeenNthCalledWith(2, { ...initialPreferences, allow_direct_messages: false })
  expect(screen.queryByRole('alert')).toBeNull()
  fireEvent.click(screen.getByRole('switch', { name: /Appear in global/ }))
  expect(screen.queryByText('Account preferences saved.')).toBeNull()
})
