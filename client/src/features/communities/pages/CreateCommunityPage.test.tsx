import { MemoryRouter } from 'react-router'
// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CreateCommunityPage } from './CreateCommunityPage'
import { countryCodes, validateCommunityCreation } from '../creation'
import sql from '../../../../../supabase/migrations/20261001000100_identity_tenant_schema.sql?raw'

const api = vi.hoisted(() => ({ submitCommunity: vi.fn() }))
vi.mock('../command-client', () => api)
vi.mock('../../../lib/supabase', () => ({ supabase: {} }))
beforeEach(() => { api.submitCommunity.mockReset().mockResolvedValue({ tenantId: 'tenant-uuid', outcome: 'created' }) })
afterEach(cleanup)
function start() { render(<MemoryRouter><CreateCommunityPage userId="viewer" onBusyChange={vi.fn()}/></MemoryRouter>) }
function fill() {
  fireEvent.change(screen.getByLabelText('Your community display name'), { target: { value: 'Our owner' } })
  fireEvent.change(screen.getByLabelText('Community name'), { target: { value: '  Our games  ' } })
  fireEvent.change(screen.getByLabelText('Community handle'), { target: { value: 'our-games' } })
  fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'HN' } })
  fireEvent.change(screen.getByLabelText('Community time zone'), { target: { value: 'America/Tegucigalpa' } })
}
function submit() { fireEvent.submit(document.querySelector('form')!) }

it('creates an approved owner and their submitted community profile together', async () => {
  start(); fill()
  fireEvent.change(screen.getByLabelText('Your community bio (optional)'), { target: { value: '  Games! ' } })
  fireEvent.change(screen.getByLabelText('City (optional)'), { target: { value: '  Tegucigalpa ' } })
  submit()
  await screen.findByText('Your community is ready.')
  expect(api.submitCommunity).toHaveBeenCalledExactlyOnceWith('viewer', { name: 'Our games', slug: 'our-games', country: 'HN',
    timezone: 'America/Tegucigalpa', city: 'Tegucigalpa', region: '', profile: { displayName: 'Our owner', bio: 'Games!' } })
  expect(screen.getByText('You’ve joined as an approved participant and the community owner.')).toBeTruthy()
})
it('rejects reserved handles and missing countries before sending', async () => {
  start(); fill(); fireEvent.change(screen.getByLabelText('Community handle'), { target: { value: 'auth' } }); submit()
  expect((await screen.findByRole('alert')).textContent).toContain('reserved')
  expect(api.submitCommunity).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Community handle'), { target: { value: 'valid-name' } })
  fireEvent.change(screen.getByLabelText('Country'), { target: { value: '' } }); submit()
  expect(screen.getByRole('alert').textContent).toBe('Choose a country.')
})
it('preserves the form and explains a handle collision', async () => {
  api.submitCommunity.mockRejectedValue(Object.assign(new Error(), { code: 'handle_taken' }))
  start(); fill(); submit()
  expect((await screen.findByRole('alert')).textContent).toContain('already in use')
  expect((screen.getByLabelText('Community name') as HTMLInputElement).value).toBe('  Our games  ')
  expect(screen.queryByText('Your community is ready.')).toBeNull()
})
it('blocks duplicate submissions while the command is pending', async () => {
  let finish!: (value: unknown) => void
  api.submitCommunity.mockReturnValue(new Promise(resolve => { finish = resolve }))
  start(); fill(); submit(); submit()
  expect(api.submitCommunity).toHaveBeenCalledTimes(1)
  expect((document.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true)
  expect(document.querySelector('form')?.getAttribute('aria-busy')).toBe('true')
  expect(screen.queryByRole('link', { name: 'Cancel' })).toBeNull()
  finish({ tenantId: 'tenant-uuid', outcome: 'created' })
  await screen.findByText('Your community is ready.')
})

it.each(['client', 'service'])('focuses a rendered %s error on the first and repeated failed submission', async mode => {
  if (mode === 'service') api.submitCommunity.mockRejectedValue(Object.assign(new Error(), { code: 'handle_taken' }))
  start(); fill()
  if (mode === 'client') fireEvent.change(screen.getByLabelText('Community handle'), { target: { value: 'auth' } })
  submit()
  const first = await screen.findByRole('alert')
  await waitFor(() => expect(document.activeElement).toBe(first))
  screen.getByLabelText('Community name').focus()
  submit()
  const repeated = await screen.findByRole('alert')
  await waitFor(() => expect(document.activeElement).toBe(repeated))
  expect((screen.getByLabelText('Community name') as HTMLInputElement).value).toBe('  Our games  ')
  if (mode === 'client') expect(api.submitCommunity).not.toHaveBeenCalled()
  else expect(api.submitCommunity).toHaveBeenCalledTimes(2)
})
it('does not automatically retry an ambiguous network failure', async () => {
  api.submitCommunity.mockRejectedValue(new Error('network failed'))
  start(); fill(); submit()
  expect((await screen.findByRole('alert')).textContent).toContain('Check Your communities before trying again')
  expect(api.submitCommunity).toHaveBeenCalledTimes(1)
})
it('shows actionable timezone and verified-account errors', async () => {
  api.submitCommunity.mockRejectedValueOnce(Object.assign(new Error(), { code: 'invalid_timezone' }))
    .mockRejectedValueOnce(Object.assign(new Error(), { code: 'ineligible' }))
  start(); fill(); submit()
  expect((await screen.findByRole('alert')).textContent).toContain('recognized time zone')
  submit()
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('verified account'))
})
it('keeps frontend country and reserved-handle hints aligned with the database constraints', () => {
  const dbCodes = sql.match(/'(AD AE [A-Z ]+)',' '/)![1].split(' ')
  expect(countryCodes).toEqual(dbCodes)
  const handles = [...sql.match(/slug not in \(([^)]+)\)/)![1].matchAll(/'([^']+)'/g)].map(match => match[1])
  for (const slug of handles) {
    expect(validateCommunityCreation({
      name: 'Test',
      slug,
      country: 'HN',
      timezone: 'UTC',
      city: '',
      region: '',
      displayName: 'Player', bio: '',
    })).not.toBeNull()
  }
})
