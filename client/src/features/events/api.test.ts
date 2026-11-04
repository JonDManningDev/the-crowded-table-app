import { expect, it } from 'vitest'
import { activities, type Activity } from '../../mock/data'
import { cancelMockActivityReservation, readActivityDetails, readCommunityHomeEvents, reserveMockActivity, selectCommunityEvents } from './api'

it('projects official events from the supplied snapshot without exposing detail-only fields', () => {
  const events = readCommunityHomeEvents(activities, { azul: 'confirmed' })
  expect(events.map(event => event.id)).toEqual(activities.filter(item => item.kind === 'official').map(item => item.id))
  expect(events.find(event => event.id === 'azul')?.status).toBe('confirmed')
  expect(events[0]).not.toHaveProperty('address')
  expect(events[0]).not.toHaveProperty('price')
  expect(events[0]).not.toHaveProperty('description')
  expect(events[0]).not.toBe(activities[0])
})

it('reflects changed counts and cancelled reservations on each read instead of resetting to seed records', () => {
  const item = activities.find(item => item.id === 'azul')!
  const changed = { ...item, filled: item.filled + 1 }
  const booked = readCommunityHomeEvents([changed], { azul: 'confirmed' })
  expect(booked[0].filled).toBe(item.filled + 1)
  const cancelled = readCommunityHomeEvents([item], {})
  expect(cancelled[0].filled).toBe(item.filled)
  expect(cancelled[0].status).toBeUndefined()
  expect(booked[0].filled).toBe(item.filled + 1)
  expect(item.filled).toBe(7)
})

it('filters categories and official kind while retaining source order and all-month Upcoming results', () => {
  const table = { ...activities[0], id: 'table', kind: 'table' as const }
  const november = { ...activities[0], id: 'november', date: '2026-11-03' }
  const events = readCommunityHomeEvents([november, ...activities], {})
  const selected = selectCommunityEvents([...events, table], 'Learn & Play', 2026, 9)
  expect(selected.events.map(item => item.id)).toEqual(['november', 'azul', 'wingspan'])
  expect(selected.calendar.days.flatMap(day => day.events.map(item => item.id))).toEqual(['azul', 'wingspan'])
  expect(selectCommunityEvents(events, 'All evenings', 2026, 9).events).toHaveLength(events.length)
})

it('builds the fixed October calendar and keeps category-selected empty months explicit', () => {
  const source = readCommunityHomeEvents(activities, {})
  const { calendar } = selectCommunityEvents(source, 'Seasonal gathering', 2026, 9)
  expect(calendar.monthLabel).toBe('October 2026')
  expect(calendar.leadingDays).toBe(4)
  expect(calendar.days).toHaveLength(31)
  expect(calendar.days[30].events.map(item => item.id)).toEqual(['halloween'])
  expect(calendar.hasEvents).toBe(true)
  const empty = selectCommunityEvents(source, 'Seasonal gathering', 2026, 10)
  expect(empty.calendar.monthName).toBe('November')
  expect(empty.calendar.days).toHaveLength(30)
  expect(empty.calendar.hasEvents).toBe(false)
  expect(empty.events.map(item => item.id)).toEqual(['halloween'])
})

it('bounds month navigation to January through December and handles an empty snapshot', () => {
  const january = selectCommunityEvents([], 'All evenings', 2026, 0)
  const december = selectCommunityEvents([], 'All evenings', 2026, 11)
  expect(january.calendar.previousMonth).toBeNull()
  expect(january.calendar.nextMonth).toBe(1)
  expect(december.calendar.nextMonth).toBeNull()
  expect(december.calendar.previousMonth).toBe(10)
  expect(january.events).toEqual([])
  expect(january.calendar.hasEvents).toBe(false)
})

it('preserves the existing month-only fixture selection rather than adding a live date or year filter', () => {
  const source: Activity[] = [{ ...activities[0], date: '2025-10-06' }]
  expect(selectCommunityEvents(readCommunityHomeEvents(source, {}), 'All evenings', 2026, 9)
    .calendar.days[5].events).toHaveLength(1)
})


it('projects details from the current snapshot and restricts address/chat presentation to simulated eligibility', () => {
  const item = { ...activities.find(row => row.kind === 'table')!, private: true, address: 'Fictional test address' }
  expect(readActivityDetails([], {}, true, 'missing')).toBeNull()
  for (const status of [undefined, 'requested', 'waitlisted'] as const) {
    const data = readActivityDetails([item], status ? { [item.id]: status } : {}, true, item.id)!
    expect(data).not.toHaveProperty('address')
    expect(data).toMatchObject({ canViewAddress: false, canChat: false, isHosting: false })
  }
  const confirmed = readActivityDetails([item], { [item.id]: 'confirmed' }, true, item.id)!
  expect(confirmed).toMatchObject({ address: item.address, canViewAddress: true, canChat: true })
  confirmed.tags.push('Caller edit')
  expect(item.tags).not.toContain('Caller edit')
  expect(readActivityDetails([{ ...item, host: 'You' }], {}, true, item.id)).toMatchObject({ isHosting: true, address: item.address, canChat: true })
  expect(readActivityDetails([item], { [item.id]: 'confirmed' }, false, item.id)?.canChat).toBe(false)
  expect(readActivityDetails([{ ...item, private: false }], { [item.id]: 'confirmed' }, true, item.id)).not.toHaveProperty('address')
})
it('preserves official guest and special cost precedence without introducing paid table eligibility', () => {
  const item = activities.find(row => row.kind === 'official')!
  expect(readActivityDetails([item], {}, true, item.id)).toMatchObject({ cost: 0, canChat: false })
  expect(readActivityDetails([item], {}, false, item.id)?.cost).toBe(125)
  expect(readActivityDetails([{ ...item, special: true, price: 250 }], {}, true, item.id)?.cost).toBe(250)
  expect(readActivityDetails([{ ...item, special: true, price: undefined }], {}, false, item.id)?.cost).toBeUndefined()
})
it.each([
  ['instant', 2, 5, 'confirmed', 1], ['request', 2, 5, 'requested', 0],
  ['instant', 5, 5, 'waitlisted', 0], ['request', 5, 5, 'waitlisted', 0],
] as const)('preserves %s reservation at %s/%s', (joinMode, filled, capacity, status, filledChange) => {
  const item = { ...activities[0], joinMode, filled, capacity }
  const result = reserveMockActivity(item, {}, true)!
  expect(result).toMatchObject({ status, filledChange })
  expect(result.notice).toContain(item.title)
  expect(item.filled).toBe(filled)
})
it('keeps existing-seat and guest-table guards without blocking guest official previews', () => {
  const item = activities[0]
  expect(reserveMockActivity(item, { [item.id]: 'confirmed' }, true)).toBeNull()
  expect(reserveMockActivity({ ...item, kind: 'table' }, {}, false)).toBeNull()
  expect(reserveMockActivity(item, {}, false)).not.toBeNull()
})
it.each([undefined, 'confirmed', 'requested', 'waitlisted'] as const)('cancels %s without promoting waitlisted records', status => {
  const seats: Record<string, 'confirmed' | 'requested' | 'waitlisted'> = status ? { test: status } : {}
  expect(cancelMockActivityReservation('test', seats)).toEqual({ filledChange: status === 'confirmed' ? -1 : 0, notice: 'Your participation has been cancelled.' })
  expect(seats).toEqual(status ? { test: status } : {})
})
