// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createCommunity, readCommunityCreationOptions } from './api'
import { validateCommunityCreation } from './creation'
import type { CommunityCreationDraft } from './types'

const db = vi.hoisted(() => ({ configured: true, rpc: vi.fn(), from: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ get supabase() { return db.configured ? db : null } }))
const draft = (): CommunityCreationDraft => ({ name: '  Fictional game club  ', slug: 'fictional-game-club', country: 'HN',
  region: '  Francisco Morazan  ', city: '  Tegucigalpa  ', timezone: ' America/Tegucigalpa ', join: true })
beforeEach(() => {
  vi.resetAllMocks()
  db.configured = true
  db.rpc.mockResolvedValue({ data: '00000000-0000-4000-8000-000000000001', error: null })
})
afterEach(() => vi.restoreAllMocks())
it('uses one exact transactional payload and preserves the submitted summary across caller edits', async () => {
  let finish!: (value: unknown) => void
  db.rpc.mockReturnValue(new Promise(resolve => { finish = resolve }))
  const input = { ...draft(), actor_id: 'untrusted', role: 'owner', bio: 'Not in this command' }
  const request = createCommunity(input)
  input.name = 'Changed after submit'
  input.city = 'Another place'
  input.join = false
  finish({ data: '00000000-0000-4000-8000-000000000001', error: null })
  expect(db.rpc).toHaveBeenCalledExactlyOnceWith('create_tenant', {
    p_name: 'Fictional game club', p_slug: 'fictional-game-club', p_country_code: 'HN', p_timezone: 'America/Tegucigalpa',
    p_state_province: 'Francisco Morazan', p_city: 'Tegucigalpa', p_join_community: true,
  })
  expect(await request).toEqual({ id: '00000000-0000-4000-8000-000000000001', name: 'Fictional game club',
    slug: 'fictional-game-club', locationLabel: 'Tegucigalpa, Francisco Morazan, Honduras', timezone: 'America/Tegucigalpa', join: true })
  expect(db.from).not.toHaveBeenCalled()
})
it('omits empty optional locations and preserves explicit no-participation', async () => {
  const result = await createCommunity({ ...draft(), city: ' ', region: '', join: false })
  expect(db.rpc.mock.calls[0][1]).toMatchObject({ p_city: undefined, p_state_province: undefined, p_join_community: false })
  expect(result).toMatchObject({ locationLabel: 'Honduras', join: false })
})
it('reports unavailable configuration without making a request or fabricating success', async () => {
  db.configured = false
  expect(readCommunityCreationOptions().isConfigured).toBe(false)
  await expect(createCommunity(draft())).rejects.toThrow('Account services are not configured yet.')
  expect(db.rpc).not.toHaveBeenCalled()
})
it.each(['empty', 'rejection'])('retains uncertain-outcome recovery for %s without retry', async mode => {
  if (mode === 'empty') db.rpc.mockResolvedValue({ data: null, error: null })
  else db.rpc.mockRejectedValue(new Error('Fictional network failure'))
  await expect(createCommunity(draft())).rejects.toThrow('Check Your communities before trying again')
  expect(db.rpc).toHaveBeenCalledOnce()
})
it.each([
  [{ code: '23505' }, 'already in use'],
  [{ code: '23514', message: 'invalid_timezone' }, 'recognized time zone'],
  [{ code: '42501' }, 'verified account'],
  [{ code: 'PGRST301' }, 'verified account'],
  [{ code: 'PGRST303' }, 'verified account'],
  [{ code: '23514' }, 'check the community details'],
  [{ code: '22023' }, 'check the community details'],
  [{ code: 'unexpected' }, 'Check Your communities before trying again'],
])('preserves recovery for response %j', async (failure, message) => {
  db.rpc.mockResolvedValue({ data: null, error: failure })
  await expect(createCommunity(draft())).rejects.toThrow(message as string)
  expect(db.rpc).toHaveBeenCalledOnce()
})
it('supplies isolated English country labels, sorted zones and a device-based initial zone', () => {
  const options = readCommunityCreationOptions()
  expect(options.countries.find(country => country.code === 'HN')?.name).toBe('Honduras')
  expect(options.countries.map(country => country.name)).toEqual(options.countries.map(country => country.name).sort((a, b) => a.localeCompare(b)))
  expect(options.timezones).toContain(options.initialTimezone)
  expect(options.timezones).toContain('UTC')
  expect(options.timezones).toEqual([...new Set(options.timezones)].sort())
  options.countries[0].name = 'Changed'
  options.timezones.length = 0
  expect(readCommunityCreationOptions().countries[0].name).not.toBe('Changed')
  expect(readCommunityCreationOptions().timezones.length).toBeGreaterThan(0)
  expect(db.rpc).not.toHaveBeenCalled()
})
it('preserves browser timezone and zone-list fallbacks without a service request', () => {
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => { throw new Error('Unavailable') })
  vi.spyOn(Intl, 'supportedValuesOf').mockImplementation(() => { throw new Error('Unavailable') })
  expect(readCommunityCreationOptions()).toMatchObject({ initialTimezone: 'UTC', timezones: ['UTC', 'UTC', 'America/Tegucigalpa'] })
  expect(db.rpc).not.toHaveBeenCalled()
})
it('retains local validation bounds without pretending to validate recognized timezones', () => {
  expect(validateCommunityCreation({ ...draft(), name: ' ', slug: 'valid' })).toContain('community name')
  expect(validateCommunityCreation({ ...draft(), name: 'x'.repeat(121) })).toContain('1–120')
  expect(validateCommunityCreation({ ...draft(), slug: 'two--hyphens' })).toContain('single hyphens')
  expect(validateCommunityCreation({ ...draft(), city: 'x'.repeat(121) })).toContain('120 characters')
  expect(validateCommunityCreation({ ...draft(), timezone: ' ' })).toContain('time zone')
  expect(validateCommunityCreation({ ...draft(), name: 'x'.repeat(120), city: 'x'.repeat(120), timezone: 'ServerValidatesThis' })).toBeNull()
})
