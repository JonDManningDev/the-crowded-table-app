// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createCommunity, readCommunityCreationOptions } from './api'
import { validateCommunityCreation } from './creation'
import type { CommunityCreationDraft } from './types'

const db = vi.hoisted(() => ({ configured: true, auth: { getSession: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ get supabase() { return db.configured ? db : null } }))
const draft = (): CommunityCreationDraft => ({ name: '  Fictional game club  ', slug: 'fictional-game-club', country: 'HN',
  region: '  Francisco Morazan  ', city: '  Tegucigalpa  ', timezone: ' America/Tegucigalpa ', displayName: ' Player ', bio: ' ' })
const send = vi.fn()
beforeEach(() => {
  vi.resetAllMocks()
  db.configured = true
  db.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'fixture', user: { id: 'viewer' } } } })
  vi.stubGlobal('fetch', send)
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('posts the exact submitted owner profile and tenant fields with the session bearer', async () => {
  send.mockResolvedValue(Response.json({ tenantId: 'tenant', outcome: 'created' }, { status: 201 }))
  const input = { ...draft(), actor: 'forged' }
  const pending = createCommunity('viewer', input)
  input.city = 'Changed'
  expect(await pending).toMatchObject({ id: 'tenant', locationLabel: 'Tegucigalpa, Francisco Morazan, Honduras' })
  expect(send).toHaveBeenCalledOnce()
  const [url, init] = send.mock.calls[0]
  expect(url).toBe('/api/communities')
  expect(init.headers.Authorization).toBe('Bearer fixture')
  expect(JSON.parse(init.body)).toEqual({ name: 'Fictional game club', slug: 'fictional-game-club', country: 'HN', region: 'Francisco Morazan',
    city: 'Tegucigalpa', timezone: 'America/Tegucigalpa', profile: { displayName: 'Player', bio: null } })
})
it('does not submit a previous viewer’s form after an account switch', async () => {
  db.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'changed', user: { id: 'someone-else' } } } })
  await expect(createCommunity('viewer',draft())).rejects.toThrow('verified account')
  expect(send).not.toHaveBeenCalled()
})
it('rejects missing configuration and empty responses', async () => {
  db.configured = false
  await expect(createCommunity('viewer', draft())).rejects.toThrow('not configured')
  db.configured = true
  send.mockResolvedValue(Response.json({}))
  await expect(createCommunity('viewer', draft())).rejects.toThrow('Check Your communities')
})
it.each([['handle_taken','already in use'],['unauthenticated','verified account'],['invalid_details','check the community details']])(
  'preserves recovery for %s', async (code,message) => {
    send.mockResolvedValue(Response.json({ code }, { status: 400 }))
    await expect(createCommunity('viewer', draft())).rejects.toThrow(message)
    expect(send).toHaveBeenCalledOnce()
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
  expect(send).not.toHaveBeenCalled()
})
it('preserves browser timezone and zone-list fallbacks without a service request', () => {
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => { throw new Error('Unavailable') })
  vi.spyOn(Intl, 'supportedValuesOf').mockImplementation(() => { throw new Error('Unavailable') })
  expect(readCommunityCreationOptions()).toMatchObject({ initialTimezone: 'UTC', timezones: ['UTC', 'UTC', 'America/Tegucigalpa'] })
  expect(send).not.toHaveBeenCalled()
})
it('retains local validation bounds without pretending to validate recognized timezones', () => {
  expect(validateCommunityCreation({ ...draft(), name: ' ', slug: 'valid' })).toContain('community name')
  expect(validateCommunityCreation({ ...draft(), name: 'x'.repeat(121) })).toContain('1–120')
  expect(validateCommunityCreation({ ...draft(), slug: 'two--hyphens' })).toContain('single hyphens')
  expect(validateCommunityCreation({ ...draft(), city: 'x'.repeat(121) })).toContain('120 characters')
  expect(validateCommunityCreation({ ...draft(), timezone: ' ' })).toContain('time zone')
  expect(validateCommunityCreation({ ...draft(), name: 'x'.repeat(120), city: 'x'.repeat(120), timezone: 'ServerValidatesThis' })).toBeNull()
})
