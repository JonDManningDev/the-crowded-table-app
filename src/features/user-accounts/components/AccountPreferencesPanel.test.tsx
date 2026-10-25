import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AccountPreferencesPanel } from './AccountPreferencesPanel'

const db = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn(), update: vi.fn() }))
vi.mock('../../../lib/supabase', () => ({ supabase: db }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('loads saved preferences and saves independent values without resetting them to defaults', async () => {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db)
  db.single.mockResolvedValue({ data: { user_is_discoverable: false, enable_matchmaking: true }, error: null })
  db.update.mockReturnValue(db)
  render(<AccountPreferencesPanel userId="viewer"/>)
  const search = await screen.findByRole('switch', { name: /Appear in global/ }) as HTMLInputElement
  const matching = screen.getByRole('switch', { name: /Participate in global/ }) as HTMLInputElement
  expect(search.checked).toBe(false)
  expect(matching.checked).toBe(true)
  fireEvent.click(matching)
  fireEvent.click(screen.getByRole('button', { name: 'Save discovery preferences' }))
  await screen.findByText('Discovery preferences saved.')
  expect(db.eq).toHaveBeenCalledWith('user_id', 'viewer')
  expect(db.update).toHaveBeenCalledWith({ user_is_discoverable: false, enable_matchmaking: false })
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
  db.single.mockResolvedValueOnce({ data: { user_is_discoverable: true, enable_matchmaking: true }, error: null })
  db.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
  render(<AccountPreferencesPanel userId="viewer"/>)
  fireEvent.click(await screen.findByRole('switch', { name: /Appear in global/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Save discovery preferences' }))
  await screen.findByText('Your preferences could not be saved. Please try again.')
  expect((screen.getByRole('switch', { name: /Appear in global/ }) as HTMLInputElement).checked).toBe(false)
  expect(screen.queryByText('Discovery preferences saved.')).toBeNull()
})
