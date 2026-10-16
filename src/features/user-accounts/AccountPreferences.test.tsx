import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AccountPreferences } from './AccountPreferences'

const db = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn(), rpc: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: db }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('loads saved preferences and saves independent values without resetting them to defaults', async () => {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db)
  db.single.mockResolvedValue({ data: { user_is_discoverable: false, enable_matchmaking: true }, error: null })
  db.rpc.mockResolvedValue({ error: null })
  render(<AccountPreferences userId="viewer"/>)
  const search = await screen.findByRole('switch', { name: /Appear in global/ }) as HTMLInputElement
  const matching = screen.getByRole('switch', { name: /Participate in global/ }) as HTMLInputElement
  expect(search.checked).toBe(false)
  expect(matching.checked).toBe(true)
  fireEvent.click(matching)
  fireEvent.click(screen.getByRole('button', { name: 'Save discovery preferences' }))
  await screen.findByText('Discovery preferences saved.')
  expect(db.eq).toHaveBeenCalledWith('user_id', 'viewer')
  expect(db.rpc).toHaveBeenCalledWith('set_user_account_preferences', { p_user_is_discoverable: false, p_enable_matchmaking: false })
})

it('does not invent default settings when a read fails', async () => {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db)
  db.single.mockResolvedValue({ data: null, error: { message: 'offline' } })
  render(<AccountPreferences userId="viewer"/>)
  await screen.findByRole('alert')
  expect(screen.queryByRole('switch')).toBeNull()
  expect(db.rpc).not.toHaveBeenCalled()
})
