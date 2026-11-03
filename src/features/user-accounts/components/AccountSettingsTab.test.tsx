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

const api = vi.hoisted(() => ({ readAccountPreferences: vi.fn(), saveAccountPreferences: vi.fn() }))
vi.mock('../api', async importOriginal => ({ ...await importOriginal<typeof import('../api')>(), ...api }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('loads saved preferences and saves independent values without resetting them to defaults', async () => {
  api.readAccountPreferences.mockResolvedValue({ user_is_discoverable: false, enable_matchmaking: true, allow_direct_messages: false })
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
  expect(api.readAccountPreferences).toHaveBeenCalledWith('viewer')
  expect(api.saveAccountPreferences).toHaveBeenCalledWith('viewer', { user_is_discoverable: false, enable_matchmaking: false, allow_direct_messages: true })
})

it('does not invent default settings when a read fails', async () => {
  api.readAccountPreferences.mockRejectedValue(new Error('offline'))
  render(<Settings/>)
  await screen.findByRole('alert')
  expect(screen.queryByRole('switch')).toBeNull()
  expect(api.saveAccountPreferences).not.toHaveBeenCalled()
})

it('keeps the draft and reports failure when a preference update affects no eligible row', async () => {
  api.readAccountPreferences.mockResolvedValueOnce({ user_is_discoverable: true, enable_matchmaking: true, allow_direct_messages: false })
  api.saveAccountPreferences.mockRejectedValueOnce(new Error('missing'))
  render(<Settings/>)
  fireEvent.click(await screen.findByRole('switch', { name: /Appear in global/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Save account preferences' }))
  await screen.findByText('Your preferences could not be saved. Please try again.')
  expect((screen.getByRole('switch', { name: /Appear in global/ }) as HTMLInputElement).checked).toBe(false)
  expect(screen.queryByText('Account preferences saved.')).toBeNull()
})


it('disables every switch during the single combined save', async () => {
  api.readAccountPreferences.mockResolvedValueOnce({ user_is_discoverable: true, enable_matchmaking: false, allow_direct_messages: true })
  api.saveAccountPreferences.mockImplementationOnce(() => new Promise(() => {}))
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

it('keeps the premium placeholder and destinations available when preferences fail to load', async () => {
  api.readAccountPreferences.mockRejectedValue(new Error('offline'))
  render(<Settings/>)
  await screen.findByRole('alert')
  expect(screen.getByText('Community ownership')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Manage' }).getAttribute('href')).toBe('/account/communities')
  expect(screen.getByRole('link', { name: 'Explore Premium Features' }).getAttribute('href')).toBe('/account/premium-features')
})

it.each(['signed-out', 'loading'] as const)('does not load preferences for a %s account even with a stale ID', status => {
  render(<Settings userId="stale" status={status}/>)
  expect(api.readAccountPreferences).not.toHaveBeenCalled()
  expect(screen.queryByRole('switch')).toBeNull()
})

it('does not request preferences when the signed-in account has no ID', () => {
  render(<MemoryRouter><AccountContext.Provider value={{ status: 'signed-in', email: null }}>
    <AccountSettingsTab/>
  </AccountContext.Provider></MemoryRouter>)
  expect(api.readAccountPreferences).not.toHaveBeenCalled()
  expect(screen.queryByRole('switch')).toBeNull()
  expect(screen.getByText('Community ownership')).toBeTruthy()
})

it('discards a late load from the previous account and hides its draft during the new load', async () => {
  const first = deferred<typeof initialPreferences>()
  const second = deferred<typeof initialPreferences>()
  api.readAccountPreferences.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const view = render(<Settings userId="first"/>)
  view.rerender(<Settings userId="second"/>)
  expect(screen.queryByRole('switch')).toBeNull()
  await act(async () => { first.resolve(initialPreferences) })
  expect(screen.queryByRole('switch')).toBeNull()
  await act(async () => { second.resolve({ ...initialPreferences, user_is_discoverable: false }) })
  expect((screen.getByRole('switch', { name: /Appear in global/ }) as HTMLInputElement).checked).toBe(false)
})

it.each([null, { message: 'denied' }])('ignores a late save completion after switching accounts (error: %j)', async error => {
  const pendingSave = deferred<{ data: null; error: typeof error }>()
  api.readAccountPreferences.mockResolvedValueOnce(initialPreferences)
    .mockResolvedValueOnce({ ...initialPreferences, allow_direct_messages: false })
  api.saveAccountPreferences.mockImplementationOnce(async () => { if ((await pendingSave.promise).error) throw new Error('denied') })
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
  api.readAccountPreferences.mockResolvedValueOnce(initialPreferences)
  api.saveAccountPreferences.mockRejectedValueOnce(new Error('denied')).mockResolvedValueOnce(undefined)
  render(<Settings/>)
  fireEvent.click(await screen.findByRole('switch', { name: /Allow direct/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Save account preferences' }))
  await screen.findByRole('alert')
  expect((screen.getByRole('switch', { name: /Allow direct/ }) as HTMLInputElement).checked).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Save account preferences' }))
  await screen.findByText('Account preferences saved.')
  expect(api.saveAccountPreferences).toHaveBeenNthCalledWith(1, 'viewer', { ...initialPreferences, allow_direct_messages: false })
  expect(api.saveAccountPreferences).toHaveBeenNthCalledWith(2, 'viewer', { ...initialPreferences, allow_direct_messages: false })
  expect(screen.queryByRole('alert')).toBeNull()
  fireEvent.click(screen.getByRole('switch', { name: /Appear in global/ }))
  expect(screen.queryByText('Account preferences saved.')).toBeNull()
})
