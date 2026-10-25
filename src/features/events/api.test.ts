import { expect, it } from 'vitest'
import { activities, type Activity } from '../../mock/data'
import { readCommunityHomeEvents, selectCommunityEvents } from './api'

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
