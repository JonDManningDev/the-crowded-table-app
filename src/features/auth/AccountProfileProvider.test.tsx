import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AccountContext, useAccount } from './accountContext'
import { AccountProfileProvider } from './AccountProfileProvider'

const db = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), rpc: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: db }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

function Consumer() {
  const account = useAccount()
  return <><span>{account.displayName}</span><span>{account.profileError}</span><button onClick={() => void account.saveProfile?.('  Updated Name  ', 'Updated bio')}>Save</button></>
}

it('loads the signed-in account profile and refreshes its shared display name after saving', async () => {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db)
  db.maybeSingle.mockResolvedValue({ data: { display_name: 'Original Name', bio: 'Original bio' }, error: null })
  db.rpc.mockResolvedValue({ error: null })
  const view = render(<AccountContext.Provider value={{ status: 'signed-in', email: 'private@example.com' }}><AccountProfileProvider userId="account-1" manageCommunities={() => {}}><Consumer/></AccountProfileProvider></AccountContext.Provider>)
  await screen.findByText('Original Name')
  expect(db.eq).toHaveBeenCalledWith('user_id', 'account-1')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await screen.findByText('Updated Name')
  expect(db.rpc).toHaveBeenCalledWith('save_user_account_profile', { p_display_name: 'Updated Name', p_bio: 'Updated bio' })
  view.rerender(<AccountProfileProvider userId={null} manageCommunities={() => {}}><Consumer/></AccountProfileProvider>)
  expect(screen.queryByText('Updated Name')).toBeNull()
})

it('surfaces profile load errors instead of substituting email or community identity', async () => {
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db)
  db.maybeSingle.mockResolvedValue({ data: null, error: { message: 'Unavailable' } })
  render(<AccountProfileProvider userId="account-1" manageCommunities={() => {}}><Consumer/></AccountProfileProvider>)
  await waitFor(() => expect(screen.getByText(/Your account profile could not be loaded/)).toBeTruthy())
})
