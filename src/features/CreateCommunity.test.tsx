// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CreateCommunity } from './CreateCommunity'
import { OwnedCommunities } from './OwnedCommunities'
import { countryCodes, validateTenant } from '../lib/tenantCreation'
import sql from '../../supabase/migrations/20261001000100_identity_tenant_schema.sql?raw'

const api = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), select: vi.fn(), order: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: api }))
beforeEach(() => {
  vi.resetAllMocks()
  api.rpc.mockResolvedValue({ data: 'tenant-uuid', error: null })
  api.from.mockReturnValue({ select: api.select })
  api.select.mockReturnValue({ order: api.order })
  api.order.mockResolvedValue({ data: [], error: null })
})
afterEach(cleanup)
function start() { render(<CreateCommunity onClose={vi.fn()} onList={vi.fn()} onBusyChange={vi.fn()}/>) }
function fill() {
  fireEvent.change(screen.getByLabelText('Community name'), { target: { value: '  Our games  ' } })
  fireEvent.change(screen.getByLabelText('Community handle'), { target: { value: 'our-games' } })
  fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'HN' } })
  fireEvent.change(screen.getByLabelText('Community time zone'), { target: { value: 'America/Tegucigalpa' } })
}
function submit() { fireEvent.submit(document.querySelector('form')!) }

it('creates an owner without participation by default using one transactional command', async () => {
  start(); fill(); submit()
  await screen.findByText('Your community is ready.')
  expect(api.rpc).toHaveBeenCalledExactlyOnceWith('create_tenant', { p_name: 'Our games', p_slug: 'our-games', p_country_code: 'HN', p_timezone: 'America/Tegucigalpa', p_state_province: undefined, p_city: undefined, p_join_community: false })
  expect(screen.getByText('You can manage this community without joining as a participant.')).toBeTruthy()
})
it('passes explicit participation and trimmed optional location without choosing owner/audit fields', async () => {
  start(); fill()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.change(screen.getByLabelText('City (optional)'), { target: { value: '  Tegucigalpa ' } })
  fireEvent.change(screen.getByLabelText('State / province (optional)'), { target: { value: '  ' } })
  submit()
  await screen.findByText('You’ve also joined as an approved participant.')
  expect(api.rpc.mock.calls[0][1]).toEqual({ p_name: 'Our games', p_slug: 'our-games', p_country_code: 'HN', p_timezone: 'America/Tegucigalpa', p_city: 'Tegucigalpa', p_state_province: undefined, p_join_community: true })
})
it('rejects reserved handles and missing countries before sending', async () => {
  start(); fill(); fireEvent.change(screen.getByLabelText('Community handle'), { target: { value: 'auth' } }); submit()
  expect((await screen.findByRole('alert')).textContent).toContain('reserved')
  expect(api.rpc).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Community handle'), { target: { value: 'valid-name' } })
  fireEvent.change(screen.getByLabelText('Country'), { target: { value: '' } }); submit()
  expect(screen.getByRole('alert').textContent).toBe('Choose a country.')
})
it('preserves the form and explains a handle collision', async () => {
  api.rpc.mockResolvedValue({ data: null, error: { code: '23505' } })
  start(); fill(); submit()
  expect((await screen.findByRole('alert')).textContent).toContain('already in use')
  expect((screen.getByLabelText('Community name') as HTMLInputElement).value).toBe('  Our games  ')
  expect(screen.queryByText('Your community is ready.')).toBeNull()
})
it('blocks duplicate submissions while the command is pending', async () => {
  let finish!: (value: unknown) => void
  api.rpc.mockReturnValue(new Promise(resolve => { finish = resolve }))
  start(); fill(); submit(); submit()
  expect(api.rpc).toHaveBeenCalledTimes(1)
  expect((document.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true)
  finish({ data: 'tenant-uuid', error: null })
  await screen.findByText('Your community is ready.')
})
it('does not automatically retry an ambiguous network failure', async () => {
  api.rpc.mockRejectedValue(new Error('network failed'))
  start(); fill(); submit()
  expect((await screen.findByRole('alert')).textContent).toContain('Check Your communities before trying again')
  expect(api.rpc).toHaveBeenCalledTimes(1)
})
it('shows actionable timezone and verified-account errors', async () => {
  api.rpc.mockResolvedValueOnce({ error: { code: '23514', message: 'invalid_timezone' } })
    .mockResolvedValueOnce({ error: { code: '42501', message: 'verified_account_required' } })
  start(); fill(); submit()
  expect((await screen.findByRole('alert')).textContent).toContain('recognized time zone')
  submit()
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('verified account'))
})
it('reads saved owned communities without requesting audit or staff fields', async () => {
  api.order.mockResolvedValue({ data: [{ id: 'a', name: 'Saved community', slug: 'saved-community', country_code: 'HN', city: null, state_province: null, timezone: 'America/Tegucigalpa', operational_status: 'active' }], error: null })
  render(<OwnedCommunities userId="owner" onCreate={vi.fn()} onClose={vi.fn()}/>)
  await screen.findByText('Saved community')
  expect(api.select).toHaveBeenCalledWith('id,name,slug,country_code,state_province,city,timezone,operational_status')
  expect(screen.getByText('saved-community · Owner · Active')).toBeTruthy()
})
it('does not present a failed owner-list read as an empty account', async () => {
  api.order.mockResolvedValue({ data: null, error: { message: 'connection failed' } })
  render(<OwnedCommunities userId="owner" onCreate={vi.fn()} onClose={vi.fn()}/>)
  await screen.findByRole('alert')
  expect(screen.queryByText('You haven’t created a community yet.')).toBeNull()
})
it('keeps frontend country and reserved-handle hints aligned with the database constraints', () => {
  const dbCodes = sql.match(/'(AD AE [A-Z ]+)',' '/)![1].split(' ')
  expect(countryCodes).toEqual(dbCodes)
  const handles = [...sql.match(/slug not in \(([^)]+)\)/)![1].matchAll(/'([^']+)'/g)].map(match => match[1])
  for (const slug of handles) expect(validateTenant({ name: 'Test', slug, country: 'HN', timezone: 'UTC', city: '', region: '', join: false })).not.toBeNull()
})
