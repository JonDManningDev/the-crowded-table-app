import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useUserAccount } from './hooks'
import { AccountContext } from './accountContext'
import { UserAccountPage } from './pages/UserAccountPage'
import { Sidebar } from '../../app/layout/Sidebar'

const api = vi.hoisted(() => ({ readOwnProfile: vi.fn(), saveOwnProfile: vi.fn() }))
vi.mock('./api', async original => ({ ...await original<typeof import('./api')>(), ...api }))
beforeEach(() => {
  vi.resetAllMocks()
  api.readOwnProfile.mockResolvedValue({ display_name: 'Original Name', bio: 'Original bio' })
  api.saveOwnProfile.mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true,
  value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true,
  value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
function SharedAccount({ userId }: { userId?: string }) {
  const profile = useUserAccount(userId)
  return <AccountContext.Provider key={userId || 'guest'} value={{ ...profile,
    status: userId ? 'signed-in' : 'signed-out', userId, email: null }}>
    <Sidebar member community={{ name: 'Community', subtitle: '', location: '', motto: '' }}/>
    <UserAccountPage page="account-profile"/>
  </AccountContext.Provider>
}

it('loads once for shared consumers and refreshes sidebar identity and profile after a save', async () => {
  const view = render(<MemoryRouter><SharedAccount userId="account-1"/></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Original Name' })
  expect(api.readOwnProfile).toHaveBeenCalledExactlyOnceWith('account-1')
  fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Display name' }), { target: { value: '  Updated Name  ' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'About me' }), { target: { value: '   ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save my profile' }))
  await screen.findByRole('heading', { name: 'Updated Name' })
  expect(screen.getByRole('link', { name: 'Updated Name' })).toBeTruthy()
  expect(api.saveOwnProfile).toHaveBeenCalledOnce()
  expect(api.saveOwnProfile.mock.calls[0][0]).toBe('account-1')
  view.rerender(<MemoryRouter><SharedAccount/></MemoryRouter>)
  expect(screen.queryByRole('heading', { name: 'Updated Name' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Updated Name' })).toBeNull()
})

it('surfaces failed profile reads without substituting another identity', async () => {
  api.readOwnProfile.mockRejectedValue(new Error('Private diagnostic'))
  const { result } = renderHook(() => useUserAccount('first'))
  await waitFor(() => expect(result.current.profileLoading).toBe(false))
  expect(result.current.profileError).toBe('Your account profile could not be loaded. Please reload to try again.')
  expect(result.current.displayName).toBe('')
  expect(result.current.bio).toBe('')
})

it('does not query without identity and clears data before rendering a different identity', async () => {
  const { result, rerender } = renderHook(({ userId }: { userId?: string }) => useUserAccount(userId), { initialProps: {} })
  expect(api.readOwnProfile).not.toHaveBeenCalled()
  await expect(result.current.saveProfile('Name', '')).rejects.toThrow('Sign in')
  rerender({ userId: 'first' })
  await waitFor(() => expect(result.current.displayName).toBe('Original Name'))
  api.readOwnProfile.mockReturnValue(new Promise(() => {}))
  rerender({ userId: 'second' })
  expect(result.current.displayName).toBe('')
  expect(result.current.bio).toBe('')
  expect(result.current.profileLoading).toBe(true)
  rerender({})
  expect(result.current.profileLoading).toBe(false)
})

it('ignores an old profile read after identity changes and resets error state', async () => {
  const old = deferred<null>()
  api.readOwnProfile.mockReturnValueOnce(old.promise.then(() => { throw new Error('Old failure') }))
  const { result, rerender } = renderHook(({ userId }) => useUserAccount(userId), { initialProps: { userId: 'first' } })
  rerender({ userId: 'second' })
  await waitFor(() => expect(result.current.displayName).toBe('Original Name'))
  await act(async () => old.resolve(null))
  expect(result.current.profileError).toBe('')
  expect(result.current.displayName).toBe('Original Name')
})

it('ignores save completion and obsolete save callbacks after identity changes', async () => {
  const pending = deferred<void>()
  api.saveOwnProfile.mockReturnValueOnce(pending.promise)
  const { result, rerender } = renderHook(({ userId }) => useUserAccount(userId), { initialProps: { userId: 'first' } })
  await waitFor(() => expect(result.current.profileLoading).toBe(false))
  const oldSave = result.current.saveProfile
  let saving!: Promise<void>
  act(() => { saving = oldSave('Old saved name', 'Old bio') })
  api.readOwnProfile.mockResolvedValue({ display_name: 'Second Name', bio: 'Second bio' })
  rerender({ userId: 'second' })
  await waitFor(() => expect(result.current.displayName).toBe('Second Name'))
  await act(async () => { pending.resolve(); await saving })
  expect(result.current.displayName).toBe('Second Name')
  await expect(oldSave('Obsolete', '')).rejects.toThrow('Sign in')
  expect(api.saveOwnProfile).toHaveBeenCalledTimes(1)
})

it('retains loaded profile on failed saves and permits retry', async () => {
  const { result } = renderHook(() => useUserAccount('first'))
  await waitFor(() => expect(result.current.profileLoading).toBe(false))
  api.saveOwnProfile.mockRejectedValueOnce(new Error('Your profile could not be saved. Please try again.'))
  await act(async () => { await expect(result.current.saveProfile('Failed', '')).rejects.toThrow('Your profile could not be saved.') })
  expect(result.current.displayName).toBe('Original Name')
  await act(async () => result.current.saveProfile('  Saved  ', '  New bio  '))
  expect(result.current.displayName).toBe('Saved')
  expect(result.current.bio).toBe('New bio')
})

it('does not let an older in-flight load overwrite a successful save', async () => {
  const pending = deferred<{ display_name: string; bio: string }>()
  api.readOwnProfile.mockReturnValueOnce(pending.promise)
  const { result } = renderHook(() => useUserAccount('first'))
  await act(async () => result.current.saveProfile('Saved', 'Saved bio'))
  await act(async () => pending.resolve({ display_name: 'Old read', bio: 'Old bio' }))
  expect(result.current.displayName).toBe('Saved')
  expect(result.current.bio).toBe('Saved bio')
})


it('still accepts a valid initial read when an overlapping save fails', async () => {
  const pending = deferred<{ display_name: string; bio: string }>()
  api.readOwnProfile.mockReturnValueOnce(pending.promise)
  api.saveOwnProfile.mockRejectedValueOnce(new Error('Denied'))
  const { result } = renderHook(() => useUserAccount('first'))
  await act(async () => { await expect(result.current.saveProfile('Unsaved', '')).rejects.toThrow() })
  await act(async () => pending.resolve({ display_name: 'Read name', bio: 'Read bio' }))
  expect(result.current.displayName).toBe('Read name')
  expect(result.current.bio).toBe('Read bio')
})
