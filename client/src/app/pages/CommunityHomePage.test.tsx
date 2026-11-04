import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CommunityHomePage } from './CommunityHomePage'
import { readCommunityHomeContent } from '../../features/communities/api'
import { readCommunityHomeEvents } from '../../features/events/api'
import { activities } from '../../mock/data'

afterEach(cleanup)
function props() {
  return {
    content: readCommunityHomeContent(), events: readCommunityHomeEvents(activities, {}),
    isMemberPreview: true, onOpenEvent: vi.fn(), onOpenMembership: vi.fn(),
  }
}

it('keeps category/month state when switching views and rerendering the current simulation', () => {
  const input = props()
  const view = render(<CommunityHomePage {...input}/>)
  fireEvent.click(screen.getByRole('button', { name: 'Learn & Play' }))
  expect(screen.queryByRole('heading', { name: 'An evening of adventure' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(screen.getByRole('heading', { name: 'November 2026' })).toBeTruthy()
  expect(screen.getByText(/Our November evenings/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Upcoming' }))
  const booked = activities.map(item => item.id === 'azul' ? { ...item, filled: item.filled + 1 } : item)
  view.rerender(<CommunityHomePage {...input} events={readCommunityHomeEvents(booked, { azul: 'confirmed' })} isMemberPreview={false}/>)
  expect(screen.getByRole('button', { name: 'Learn & Play' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: /Learn & Play: Azul.*You’re going/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
  expect(screen.getByRole('heading', { name: 'November 2026' })).toBeTruthy()
})

it('disables calendar boundary controls and opens supplied event IDs from hero, cards, calendar and highlight', () => {
  const input = props()
  render(<CommunityHomePage {...input}/>)
  fireEvent.click(screen.getByRole('button', { name: 'Find your next game night' }))
  expect(input.onOpenEvent).toHaveBeenLastCalledWith('azul')
  fireEvent.click(screen.getByRole('button', { name: /Learn & Play: Wingspan/ }))
  expect(input.onOpenEvent).toHaveBeenLastCalledWith('wingspan')
  fireEvent.click(screen.getByRole('button', { name: 'Discover our Halloween gathering' }))
  expect(input.onOpenEvent).toHaveBeenLastCalledWith('halloween')
  fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
  fireEvent.click(screen.getByRole('button', { name: /A most curious murder.*6:00 PM/ }))
  expect(input.onOpenEvent).toHaveBeenLastCalledWith('halloween')
  for (let i = 0; i < 9; i++) fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
  expect(screen.getByRole('heading', { name: 'January 2026' })).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Previous month' }) as HTMLButtonElement).disabled).toBe(true)
  for (let i = 0; i < 11; i++) fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(screen.getByRole('heading', { name: 'December 2026' })).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Next month' }) as HTMLButtonElement).disabled).toBe(true)
})

it('retains guest commercial copy and membership callback while preserving the highlight in both previews', () => {
  const input = props()
  const view = render(<CommunityHomePage {...input} isMemberPreview={false}/>)
  expect(screen.getByText(/for L300\/month/)).toBeTruthy()
  expect(screen.getByText('Separate ticket required')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Become a Member' }))
  expect(input.onOpenMembership).toHaveBeenCalledOnce()
  view.rerender(<CommunityHomePage {...input}/>)
  expect(screen.queryByRole('button', { name: 'Become a Member' })).toBeNull()
  expect(screen.getByText('Separate ticket required')).toBeTruthy()
})

it('returns fresh sample configuration so one consumer cannot change later reads', () => {
  const content = readCommunityHomeContent()
  content.hero.initials[0] = 'Changed'
  content.weeklySchedule[0].day = 'Changed'
  content.categories.push('Changed')
  const next = readCommunityHomeContent()
  expect(next.hero.initials[0]).toBe('LM')
  expect(next.weeklySchedule[0].day).toBe('TUESDAYS')
  expect(next.categories).not.toContain('Changed')
})
