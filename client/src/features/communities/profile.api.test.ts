import { afterEach, expect, it, vi } from 'vitest'
import { activities, initialProfile } from '../../mock/data'
import type { SeatStatus } from '../../mock/data'
import { changeMockCommunityPreference, readCommunityProfileActivity, readCommunityProfileContent, readCommunityProfileDetails,
  readCommunityProfilePreferences, saveMockCommunityPreferences, saveMockCommunityProfile, saveMockCommunitySupportNote } from './api'
const db = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: db }))
afterEach(() => { expect(db.from).not.toHaveBeenCalled() })

it('returns isolated sample content with unchanged metrics/options/limits', () => {
  const content = readCommunityProfileContent()
  expect(content.sidebar.stats.map(stat => stat.value)).toEqual(['12', '3', '18'])
  expect(content.editor).toMatchObject({ nameMaxLength: 40, locationMaxLength: 60, bioMaxLength: 300 })
  expect(content.supportMaxLength).toBe(2000)
  content.favorites[0].name = 'Changed'; content.editor.interests.push('Changed'); content.sidebar.stats[0].value = '999'
  const fresh = readCommunityProfileContent()
  expect(fresh.favorites[0].name).toBe('Wingspan')
  expect(fresh.editor.interests).not.toContain('Changed')
  expect(fresh.sidebar.stats[0].value).toBe('12')
})

it('projects current profile/preferences narrowly without exposing legacy/protected fields or nested mutation', () => {
  const details = readCommunityProfileDetails({ ...initialProfile, userId: 'secret' } as typeof initialProfile)
  details.interests.push('Changed')
  expect(initialProfile.interests).not.toContain('Changed')
  expect(details).not.toHaveProperty('userId')
  const input = { reminders: true, replies: false, digest: true, history: false, show_global_profile: true }
  expect(readCommunityProfilePreferences(input)).toEqual({ reminders: true, replies: false, digest: true, history: false })
})

it('keeps every participation status and host in source order, preserves guest filtering and omits detail/address data', () => {
  const items = activities.slice(0, 4).map((item, index) => ({ ...item, id: `test${index}`, host: index === 3 ? 'You' : 'Peer',
    kind: index === 0 ? 'official' as const : 'table' as const, date: '2020-01-01', address: 'Fictional private detail' }))
  const seats: Record<string, SeatStatus> = { test0: 'confirmed', test1: 'requested', test2: 'waitlisted' }
  const member = readCommunityProfileActivity(items, seats, true)
  expect(member.map(item => item.statusLabel)).toEqual(['confirmed', 'requested', 'waitlisted', 'Hosting'])
  expect(member.map(item => item.id)).toEqual(['test0', 'test1', 'test2', 'test3'])
  expect(member[0].dateLabel).toBe('Jan 1')
  expect(member[0]).not.toHaveProperty('address')
  expect(member[0]).not.toHaveProperty('description')
  expect(readCommunityProfileActivity(items, seats, false).map(item => item.id)).toEqual(['test0'])
  expect(readCommunityProfileActivity(items.slice(0, 3), {}, true)).toEqual([])
  expect(readCommunityProfileActivity([], seats, true)).toEqual([])
})

it('normalizes mock profile saves and orders checked interests as native form options without changing the draft', () => {
  const draft = { ...initialProfile, name: ' New Name ', location: '  ', bio: '  Bio 👋\nSecond line  ', interests: ['Coffee', 'Strategy', 'Board Games'], style: 'Learner', teach: false }
  const result = saveMockCommunityProfile(draft)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('Expected success')
  expect(result.profile).toEqual({ name: 'New Name', location: '', bio: 'Bio 👋\nSecond line', interests: ['Board Games', 'Strategy', 'Coffee'], style: 'Learner', teach: false })
  expect(result.notice).toBe('Your profile has been updated.')
  expect(draft.interests).toEqual(['Coffee', 'Strategy', 'Board Games'])
  expect(saveMockCommunityProfile({ ...draft, name: ' \n ' })).toEqual({ ok: false })
})

it('updates each mock preference against the latest snapshot without changing other values', () => {
  const original = { reminders: true, replies: true, digest: false, history: false }
  for (const key of ['reminders', 'replies', 'digest', 'history'] as const) {
    const command = changeMockCommunityPreference(key, !original[key])
    expect(command(original)).toEqual({ ...original, [key]: !original[key] })
  }
  const command = changeMockCommunityPreference('history', true)
  expect(command({ ...original, digest: true })).toEqual({ ...original, digest: true, history: true })
  expect(original.history).toBe(false)
})

it('acknowledges preference save without staging values or writing persisted preferences', () => {
  expect(saveMockCommunityPreferences()).toEqual({ isSaved: true })
})

it('records support locally through the existing notice and silently rejects whitespace', () => {
  expect(saveMockCommunitySupportNote('  A note 👋  ')).toEqual({ notice: 'Demo support note saved: A note 👋' })
  expect(saveMockCommunitySupportNote(' \n ')).toBeNull()
})
