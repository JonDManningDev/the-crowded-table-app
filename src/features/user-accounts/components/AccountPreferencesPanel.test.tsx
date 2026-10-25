import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AccountPreferencesPanel } from './AccountPreferencesPanel'

const db = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn(), update: vi.fn() }))
vi.mock('../../../lib/supabase', () => ({ supabase: db }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('loads saved preferences and saves independent values without resetting them to defaults', async () => {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db)
  db.single.mockResolvedValue({ data: { user_is_discoverable: false, enable_matchmaking: true, allow_direct_messages: false }, error: null })
  db.update.mockReturnValue(db)
  render(<AccountPreferencesPanel userId="viewer"/>)
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
  render(<AccountPreferencesPanel userId="viewer"/>)
  await screen.findByRole('alert')
  expect(screen.queryByRole('switch')).toBeNull()
  expect(db.update).not.toHaveBeenCalled()
})

it('keeps the draft and reports failure when a preference update affects no eligible row', async () => {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db); db.update.mockReturnValue(db)
  db.single.mockResolvedValueOnce({ data: { user_is_discoverable: true, enable_matchmaking: true, allow_direct_messages: false }, error: null })
  db.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
  render(<AccountPreferencesPanel userId="viewer"/>)
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
  render(<AccountPreferencesPanel userId="viewer"/>)
  await screen.findByRole('switch', { name: /Allow direct messages/ })
  fireEvent.click(screen.getByRole('button', { name: 'Save account preferences' }))
  expect(screen.getAllByRole('switch').every(input => (input as HTMLInputElement).disabled)).toBe(true)
  expect(screen.getAllByRole('button')).toHaveLength(1)
  expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true)
})
