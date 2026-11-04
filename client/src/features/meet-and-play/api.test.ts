import { decideMockTableSeatRequest, readTableConversation, readTableSeatRequests, sendMockTableMessage } from './api'
import { expect, it } from 'vitest'
import { activities } from '../../mock/data'
import { createMockTable, readMeetPlayContent, readMeetPlayTables, saveMockMatchingPreferences, selectMeetPlayTables } from './api'

it('projects only current table listings and excludes address/detail-only fields', () => {
  const tableId = activities.find(item => item.kind === 'table')!.id
  const source = readMeetPlayTables(activities, { [tableId]: 'requested' })
  expect(source.map(item => item.id)).toEqual(activities.filter(item => item.kind === 'table').map(item => item.id))
  for (const item of source) {
    expect(item).not.toHaveProperty('address')
    expect(item).not.toHaveProperty('description')
    expect(item).not.toHaveProperty('joinMode')
    expect(item.isBeginnerFriendly).toBe(activities.find(row => row.id === item.id)!.tags.includes('Beginner friendly'))
  }
  expect(source.find(item => item.id === tableId)?.status).toBe('requested')
})

it('combines case-insensitive search, category, public/private and beginner filters in source order', () => {
  const source = readMeetPlayTables(activities, {})
  const defaults = readMeetPlayContent().initialFilters
  expect(selectMeetPlayTables(source, 'Find a Table', { ...defaults, searchQuery: 'LUCÍA' }).map(item => item.host)).toEqual(['Lucía M.'])
  expect(selectMeetPlayTables(source, 'Find a Table', { ...defaults, searchQuery: 'private', gameType: 'Board Game', locationType: 'Private locations', beginnerFriendlyOnly: true }).map(item => item.id))
    .toEqual(source.filter(item => item.private && item.category === 'Board Game' && item.isBeginnerFriendly).map(item => item.id))
  expect(selectMeetPlayTables(source, 'Find a Table', { ...defaults, locationType: 'Public places' }).every(item => !item.private)).toBe(true)
  expect(selectMeetPlayTables(source, 'Find a Table', { ...defaults, searchQuery: 'not a table' })).toEqual([])
  expect(selectMeetPlayTables([], 'Find a Table', defaults)).toEqual([])
})

it('keeps hosting and every existing seat status in My Tables without including unassociated rows', () => {
  const defaults = readMeetPlayContent().initialFilters
  const tables = activities.filter(item => item.kind === 'table')
  const others = tables.filter(item => item.host !== 'You')
  const source = readMeetPlayTables(tables, {
    [others[0].id]: 'confirmed', [others[1].id]: 'requested', [others[2].id]: 'waitlisted',
  })
  expect(selectMeetPlayTables(source, 'My Tables', defaults).map(item => item.id)).toEqual(tables.map(item => item.id))
  expect(selectMeetPlayTables(readMeetPlayTables(tables, {}), 'My Tables', defaults).map(item => item.id))
    .toEqual(tables.filter(item => item.host === 'You').map(item => item.id))
})

it('reads new counts/status and new tables from the shared snapshot without resetting seed data', () => {
  const item = activities.find(item => item.kind === 'table')!
  const changed = { ...item, filled: item.filled + 1 }
  const newTable = { ...item, id: 'new-table', host: 'You' }
  const source = readMeetPlayTables([newTable, changed], { [item.id]: 'confirmed' })
  expect(source.map(item => item.id)).toEqual(['new-table', item.id])
  expect(source[1].filled).toBe(changed.filled)
  expect(source[1].status).toBe('confirmed')
  expect(readMeetPlayTables([item], {})[0].status).toBeUndefined()
  expect(item.filled).toBe(changed.filled - 1)
})

it('returns isolated fixture defaults and options with the existing frozen form values', () => {
  const content = readMeetPlayContent()
  expect(content.createTableDefaults).toMatchObject({ date: '2026-10-17', capacity: '5', time: '16:00', end: '19:00', mode: 'request', privateLocation: true, beginnerFriendly: true })
  content.createTableDefaults.title = 'Changed'
  content.initialFilters.searchQuery = 'Changed'
  content.tableTypes.push('Changed')
  expect(readMeetPlayContent().createTableDefaults.title).toBe('')
  expect(readMeetPlayContent().initialFilters.searchQuery).toBe('')
  expect(readMeetPlayContent().tableTypes).not.toContain('Changed')
  expect(content.gameTypes).not.toContain('Changed')
})

it('creates the legacy private table shape with trimmed copy, a unique ID and one host seat', () => {
  const draft = { ...readMeetPlayContent().createTableDefaults, title: '  Demo table  ', location: '  Fictional room 42  ', description: '  A friendly demo  ' }
  const result = createMockTable(draft)
  if (!result.ok) throw new Error(result.error)
  expect(result.item).toMatchObject({ title: 'Demo table', description: 'A friendly demo', kind: 'table', art: 'forest', host: 'You', private: true, address: 'Fictional room 42', location: 'Private location · Tegucigalpa', capacity: 5, filled: 1, joinMode: 'request', tags: ['Beginner friendly'] })
  const next = createMockTable(draft)
  expect(next.ok && next.item.id).not.toBe(result.item.id)
  expect(draft.title).toBe('  Demo table  ')
  expect(result.notice).toBe('Your table is ready. Let’s find you some company!')
})

it('keeps the public/instant/experienced variants and preserves custom validation order', () => {
  const draft = { ...readMeetPlayContent().createTableDefaults, title: 'Demo', location: 'Fictional café', privateLocation: false, mode: 'instant' as const, beginnerFriendly: false, capacity: '30' }
  const result = createMockTable(draft)
  if (!result.ok) throw new Error(result.error)
  expect(result.item).toMatchObject({ private: false, location: 'Fictional café', address: undefined, capacity: 30, joinMode: 'instant', tags: ['Experienced players'] })
  expect(createMockTable({ ...draft, title: ' ', end: '16:00' })).toEqual({ ok: false, error: 'End time must be after start time for this same-day table.' })
  expect(createMockTable({ ...draft, end: '15:00' }).ok).toBe(false)
  expect(createMockTable({ ...draft, location: ' ' })).toEqual({ ok: false, error: 'Please add a title and meeting location.' })
  expect(createMockTable({ ...draft, title: ' ' }).ok).toBe(false)
})

it('copies matching preferences unchanged and produces only an in-memory update/notice', () => {
  const draft = { availability: 'Sunday afternoon', game: 'RPGs', style: 'Learning — show me something new', notes: '  Keep my spacing  ' }
  const result = saveMockMatchingPreferences(draft)
  expect(result.preferences).toEqual(draft)
  expect(result.preferences).not.toBe(draft)
  expect(result.matching).toBe(true)
  draft.notes = 'Changed'
  expect(result.preferences.notes).toBe('  Keep my spacing  ')
})


it('projects only the selected table requests and messages without sharing mutable records', () => {
  const requests = [{ id: 'r1', activity: 'table', name: 'Fictional guest', status: 'pending' }, { id: 'r2', activity: 'other', name: 'Other', status: 'pending' }]
  const messages = { table: [{ author: 'Fictional host', text: 'Hello' }], other: [{ author: 'Other', text: 'Not this table' }] }
  const selected = readTableSeatRequests(requests, 'table')
  expect(selected).toEqual([{ id: 'r1', name: 'Fictional guest', status: 'pending' }])
  selected[0].name = 'Edited'; const conversation = readTableConversation(messages, 'table'); conversation[0].text = 'Edited'
  expect(requests[0].name).toBe('Fictional guest'); expect(messages.table[0].text).toBe('Hello')
  expect(readTableConversation(messages, 'missing')).toEqual([])
})
it('accepts with capacity, declines at capacity, retains decision history and rejects duplicate decisions', () => {
  const item = { ...activities[0], filled: 2, capacity: 3 }
  const request = { id: 'request', activity: item.id, name: 'Fictional guest', status: 'pending' }
  expect(decideMockTableSeatRequest(request.id, true, [request], [item])).toEqual({ activityId: item.id, status: 'accepted', filledChange: 1, notice: 'Fictional guest’s request was accepted.' })
  expect(decideMockTableSeatRequest(request.id, false, [request], [{ ...item, filled: 3 }])).toMatchObject({ status: 'declined', filledChange: 0 })
  expect(decideMockTableSeatRequest(request.id, true, [request], [{ ...item, filled: 3 }])).toBeNull()
  expect(decideMockTableSeatRequest(request.id, true, [{ ...request, status: 'accepted' }], [item])).toBeNull()
  expect(decideMockTableSeatRequest(request.id, true, [request], [])).toBeNull()
  expect(decideMockTableSeatRequest('missing', true, [request], [item])).toBeNull()
  expect(request.status).toBe('pending'); expect(item.filled).toBe(2)
})
it('trims mock messages, preserves plain text and rejects blank drafts without inventing a delivery service', () => {
  expect(sendMockTableMessage('Community author', '  Hello\nthere  ')).toEqual({ author: 'Community author', text: 'Hello\nthere' })
  expect(sendMockTableMessage('Community author', '  \n  ')).toBeNull()
})
