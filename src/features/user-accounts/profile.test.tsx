import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { ComponentProps } from 'react'
import { AccountContext } from './accountContext'
import { UserAccountPage } from './pages/UserAccountPage'
import { readAccountProfilePlaceholders } from './api'

vi.mock('../../lib/supabase', () => ({ supabase: null }))
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') },
})
Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') },
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
type Account = ComponentProps<typeof AccountContext.Provider>['value']
const account: Account = { status: 'signed-in', email: 'private@example.test', userId: 'first', displayName: 'Original name', bio: 'Original bio', saveProfile: vi.fn() }
function content(value: Account, page: ComponentProps<typeof UserAccountPage>['page'] = 'account-profile') {
  return <MemoryRouter><AccountContext.Provider value={value}><UserAccountPage page={page}/></AccountContext.Provider></MemoryRouter>
}
function openEditor() { fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' })) }
function nameInput() { return screen.getByRole('textbox', { name: 'Display name' }) as HTMLInputElement }
function bioInput() { return screen.getByRole('textbox', { name: 'About me' }) as HTMLTextAreaElement }
function submit() { fireEvent.submit(screen.getByRole('dialog').querySelector('form')!) }
function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

it('supplies independent sample data without backend configuration or shared mutable fixtures', () => {
  const first = readAccountProfilePlaceholders()
  expect(first).toMatchObject({ playStyle: 'Casual', isHappyToTeach: true, eventCount: 12, hostedTableCount: 3, coPlayerCount: 18 })
  first.interests.push('Changed')
  first.favoriteGames[0].name = 'Changed'
  first.eventCount = 999
  expect(readAccountProfilePlaceholders().interests).not.toContain('Changed')
  expect(readAccountProfilePlaceholders().favoriteGames.map(game => game.name)).toEqual(['Wingspan', 'Codenames', 'Azul'])
  expect(readAccountProfilePlaceholders().eventCount).toBe(12)
})

it('places inline Edit beside About me and initializes both entry points from persisted values', () => {
  render(content(account))
  const aboutHeading = screen.getByRole('heading', { name: 'About me' })
  expect(within(aboutHeading.parentElement!).getByRole('button', { name: 'Edit' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
  expect(nameInput().value).toBe('Original name')
  expect(bioInput().value).toBe('Original bio')
  fireEvent.change(nameInput(), { target: { value: 'Unsaved' } })
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  openEditor()
  expect(nameInput().value).toBe('Original name')
})

it('validates on blur and submission, associates errors and focuses the first invalid field', () => {
  const saveProfile = vi.fn()
  render(content({ ...account, saveProfile }))
  openEditor()
  const input = nameInput()
  expect(input.getAttribute('aria-describedby')).toBeNull()
  fireEvent.change(input, { target: { value: '   ' } })
  fireEvent.blur(input)
  const description = input.getAttribute('aria-describedby')!
  expect(document.getElementById(description)?.textContent).toBe('Enter a display name.')
  expect(input.getAttribute('aria-invalid')).toBe('true')
  submit()
  expect(document.activeElement).toBe(input)
  expect(saveProfile).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { value: 'Corrected' } })
  expect(input.getAttribute('aria-invalid')).toBe('false')
  expect(screen.queryByText('Enter a display name.')).toBeNull()
  fireEvent.change(bioInput(), { target: { value: 'b'.repeat(2001) } })
  submit()
  expect(document.activeElement).toBe(bioInput())
  expect(bioInput().getAttribute('aria-invalid')).toBe('true')
  fireEvent.change(bioInput(), { target: { value: 'Corrected bio' } })
  expect(bioInput().getAttribute('aria-invalid')).toBe('false')
  fireEvent.change(input, { target: { value: 'n'.repeat(81) } })
  submit()
  expect(document.activeElement).toBe(input)
  expect(saveProfile).not.toHaveBeenCalled()
})

it('guards duplicate submissions and blocks close, backdrop and native Escape while saving', async () => {
  const pending = deferred(), saveProfile = vi.fn(() => pending.promise)
  render(content({ ...account, saveProfile }))
  openEditor()
  fireEvent.change(nameInput(), { target: { value: '  Updated  ' } })
  act(() => { submit(); submit() })
  expect(saveProfile).toHaveBeenCalledExactlyOnceWith('Updated', 'Original bio')
  expect(nameInput().disabled).toBe(true)
  expect(bioInput().disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('dialog'))
  const escape = new Event('cancel', { bubbles: true, cancelable: true })
  fireEvent(screen.getByRole('dialog'), escape)
  expect(escape.defaultPrevented).toBe(true)
  expect(screen.getByRole('dialog').hasAttribute('open')).toBe(true)
  await act(async () => pending.resolve())
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('status').textContent).toBe('Your account profile has been saved.')
})

it('retains failed drafts for retry and only closes after a successful save', async () => {
  const saveProfile = vi.fn().mockRejectedValueOnce(new Error('Try again')).mockResolvedValueOnce(undefined)
  render(content({ ...account, saveProfile }))
  openEditor()
  fireEvent.change(bioInput(), { target: { value: 'Draft bio' } })
  submit()
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Try again')
  expect(bioInput().value).toBe('Draft bio')
  expect(screen.queryByText('Your account profile has been saved.')).toBeNull()
  await act(async () => submit())
  expect(saveProfile).toHaveBeenCalledTimes(2)
  expect(saveProfile).toHaveBeenLastCalledWith('Original name', 'Draft bio')
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('preserves drafts through provider refresh, temporary unavailability and sibling-tab navigation', () => {
  const saveProfile = vi.fn()
  const view = render(content({ ...account, saveProfile }))
  openEditor()
  fireEvent.change(nameInput(), { target: { value: 'My draft' } })
  view.rerender(content({ ...account, saveProfile, displayName: 'Refreshed', profileLoading: true }))
  expect(nameInput().value).toBe('My draft')
  submit()
  expect(saveProfile).not.toHaveBeenCalled()
  view.rerender(content({ ...account, saveProfile, displayName: 'Refreshed' }, 'my-home'))
  expect(nameInput().value).toBe('My draft')
  view.rerender(content({ ...account, saveProfile, displayName: 'Refreshed' }))
  expect(nameInput().value).toBe('My draft')
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  openEditor()
  expect(nameInput().value).toBe('Refreshed')
})

it.each(['resolve', 'reject'] as const)('ignores obsolete save %s after changing identities and allows a new account to save', async outcome => {
  const old = deferred(), next = deferred()
  const oldSave = vi.fn(() => old.promise), newSave = vi.fn(() => next.promise)
  const view = render(content({ ...account, saveProfile: oldSave }))
  openEditor(); submit()
  view.rerender(content({ ...account, userId: 'second', displayName: 'Second name', saveProfile: newSave }))
  expect(screen.queryByRole('dialog')).toBeNull()
  openEditor()
  expect(nameInput().value).toBe('Second name')
  await act(async () => { if (outcome === 'resolve') old.resolve(); else old.reject(new Error('Old failure')) })
  expect(screen.queryByText('Old failure')).toBeNull()
  expect(screen.queryByText('Your account profile has been saved.')).toBeNull()
  submit()
  expect(newSave).toHaveBeenCalledExactlyOnceWith('Second name', 'Original bio')
  await act(async () => next.resolve())
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('clears drafts and success feedback on sign-out and ignores obsolete completions', async () => {
  const pending = deferred()
  const view = render(content({ ...account, saveProfile: () => pending.promise }))
  openEditor(); submit()
  view.rerender(content({ status: 'signed-out', email: null }))
  expect(screen.queryByRole('dialog')).toBeNull()
  await act(async () => pending.resolve())
  view.rerender(content(account))
  expect(screen.queryByText('Your account profile has been saved.')).toBeNull()
  openEditor()
  expect(nameInput().value).toBe('Original name')
  view.unmount()
})

it('keeps editing unavailable during loading/errors or without a saver and never substitutes another identity', () => {
  const view = render(content({ ...account, profileLoading: true }))
  expect((screen.getByRole('button', { name: 'Edit Profile' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  view.rerender(content({ ...account, profileError: 'Unavailable' }))
  expect(screen.getByRole('alert').textContent).toBe('Unavailable')
  view.rerender(content({ ...account, saveProfile: undefined, displayName: '', bio: '' }))
  expect(screen.getByRole('heading', { name: 'Your account' })).toBeTruthy()
  expect(screen.queryByText('private@example.test')).toBeNull()
  expect(screen.queryByText('Ana M.')).toBeNull()
})
