import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useUserAccount } from './hooks'
import { AccountContext } from './accountContext'
import { UserAccountPage } from './pages/UserAccountPage'
import { Sidebar } from '../../app/layout/Sidebar'

const db = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), upsert: vi.fn(), single: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: db }))
beforeEach(() => {
  vi.resetAllMocks()
  for (const method of [db.from, db.select, db.eq, db.upsert]) method.mockReturnValue(db)
  db.maybeSingle.mockResolvedValue({ data: { display_name: 'Original Name', bio: 'Original bio' }, error: null })
  db.single.mockResolvedValue({ data: { user_id: 'account-1' }, error: null })
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
  expect(db.eq).toHaveBeenCalledWith('user_id', 'account-1')
  expect(db.from).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Display name' }), { target: { value: '  Updated Name  ' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'About me' }), { target: { value: '   ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save my profile' }))
  await screen.findByRole('heading', { name: 'Updated Name' })
  expect(screen.getByRole('link', { name: 'Updated Name' })).toBeTruthy()
  expect(db.upsert).toHaveBeenCalledWith({ display_name: 'Updated Name', bio: null }, { onConflict: 'user_id' })
  expect(db.from.mock.calls.filter(([table]) => table === 'user_account_profiles')).toHaveLength(2)
  view.rerender(<MemoryRouter><SharedAccount/></MemoryRouter>)
  expect(screen.queryByRole('heading', { name: 'Updated Name' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Updated Name' })).toBeNull()
})

it('surfaces failed profile reads without substituting another identity', async () => {
  db.maybeSingle.mockResolvedValue({ data: null, error: { message: 'Private diagnostic' } })
  const { result } = renderHook(() => useUserAccount('first'))
  await waitFor(() => expect(result.current.profileLoading).toBe(false))
  expect(result.current.profileError).toBe('Your account profile could not be loaded. Please reload to try again.')
  expect(result.current.displayName).toBe('')
  expect(result.current.bio).toBe('')
})

it('does not query without identity and clears data before rendering a different identity', async () => {
  const { result, rerender } = renderHook(({ userId }: { userId?: string }) => useUserAccount(userId), { initialProps: {} })
  expect(db.from).not.toHaveBeenCalled()
  await expect(result.current.saveProfile('Name', '')).rejects.toThrow('Sign in')
  rerender({ userId: 'first' })
  await waitFor(() => expect(result.current.displayName).toBe('Original Name'))
  db.maybeSingle.mockReturnValue(new Promise(() => {}))
  rerender({ userId: 'second' })
  expect(result.current.displayName).toBe('')
  expect(result.current.bio).toBe('')
  expect(result.current.profileLoading).toBe(true)
  rerender({})
  expect(result.current.profileLoading).toBe(false)
})

it('ignores an old profile read after identity changes and resets error state', async () => {
  const old = deferred<{ data: null; error: { message: string } }>()
  db.maybeSingle.mockReturnValueOnce(old.promise)
  const { result, rerender } = renderHook(({ userId }) => useUserAccount(userId), { initialProps: { userId: 'first' } })
  rerender({ userId: 'second' })
  await waitFor(() => expect(result.current.displayName).toBe('Original Name'))
  await act(async () => old.resolve({ data: null, error: { message: 'Old failure' } }))
  expect(result.current.profileError).toBe('')
  expect(result.current.displayName).toBe('Original Name')
})

it('ignores save completion and obsolete save callbacks after identity changes', async () => {
  const pending = deferred<{ data: { user_id: string }; error: null }>()
  db.single.mockReturnValueOnce(pending.promise)
  const { result, rerender } = renderHook(({ userId }) => useUserAccount(userId), { initialProps: { userId: 'first' } })
  await waitFor(() => expect(result.current.profileLoading).toBe(false))
  const oldSave = result.current.saveProfile
  let saving!: Promise<void>
  act(() => { saving = oldSave('Old saved name', 'Old bio') })
  db.maybeSingle.mockResolvedValue({ data: { display_name: 'Second Name', bio: 'Second bio' }, error: null })
  rerender({ userId: 'second' })
  await waitFor(() => expect(result.current.displayName).toBe('Second Name'))
  await act(async () => { pending.resolve({ data: { user_id: 'first' }, error: null }); await saving })
  expect(result.current.displayName).toBe('Second Name')
  await expect(oldSave('Obsolete', '')).rejects.toThrow('Sign in')
  expect(db.upsert).toHaveBeenCalledTimes(1)
})

it('retains loaded profile on failed saves and permits retry', async () => {
  const { result } = renderHook(() => useUserAccount('first'))
  await waitFor(() => expect(result.current.profileLoading).toBe(false))
  db.single.mockResolvedValueOnce({ data: null, error: { message: 'Denied' } })
  await act(async () => { await expect(result.current.saveProfile('Failed', '')).rejects.toThrow('Your profile could not be saved.') })
  expect(result.current.displayName).toBe('Original Name')
  await act(async () => result.current.saveProfile('  Saved  ', '  New bio  '))
  expect(result.current.displayName).toBe('Saved')
  expect(result.current.bio).toBe('New bio')
})

it('does not let an older in-flight load overwrite a successful save', async () => {
  const pending = deferred<{ data: { display_name: string; bio: string }; error: null }>()
  db.maybeSingle.mockReturnValueOnce(pending.promise)
  const { result } = renderHook(() => useUserAccount('first'))
  await act(async () => result.current.saveProfile('Saved', 'Saved bio'))
  await act(async () => pending.resolve({ data: { display_name: 'Old read', bio: 'Old bio' }, error: null }))
  expect(result.current.displayName).toBe('Saved')
  expect(result.current.bio).toBe('Saved bio')
})


it('still accepts a valid initial read when an overlapping save fails', async () => {
  const pending = deferred<{ data: { display_name: string; bio: string }; error: null }>()
  db.maybeSingle.mockReturnValueOnce(pending.promise)
  db.single.mockResolvedValueOnce({ data: null, error: { message: 'Denied' } })
  const { result } = renderHook(() => useUserAccount('first'))
  await act(async () => { await expect(result.current.saveProfile('Unsaved', '')).rejects.toThrow() })
  await act(async () => pending.resolve({ data: { display_name: 'Read name', bio: 'Read bio' }, error: null }))
  expect(result.current.displayName).toBe('Read name')
  expect(result.current.bio).toBe('Read bio')
})
