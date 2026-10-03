import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { AccountContext } from '../features/auth/accountContext'

beforeEach(() => { window.history.replaceState(null, '', '/'); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

function navigate(hash: string) {
  window.history.replaceState(null, '', `/#${hash}`)
  fireEvent(window, new HashChangeEvent('hashchange'))
}

it('lands on the personal home without presenting the community preview as personal activity', () => {
  render(<App/>)
  expect(screen.getByRole('heading', { name: 'My Home' })).toBeTruthy()
  expect(screen.getByText('No community updates, RSVPs, or suggestions are loaded yet.', { exact: false })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Switch to guest preview' })).toBeNull()
  expect(screen.queryByText('Ana M.')).toBeNull()
  navigate('my-communities')
  expect(screen.getByRole('heading', { name: 'My Communities' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Explore community' }).getAttribute('href')).toBe('#community-home')
})

it('separates the account identity from the mock community profile', () => {
  render(<AccountContext.Provider value={{ status: 'signed-in', email: 'actual-user@example.com' }}><App/></AccountContext.Provider>)
  const space = within(screen.getByRole('region', { name: 'Your space' }))
  expect(space.getByText('actual-user@example.com')).toBeTruthy()
  expect(space.queryByText('Ana M.')).toBeNull()
  navigate('profile')
  expect(space.getByText('actual-user@example.com')).toBeTruthy()
  expect(screen.getByRole('navigation', { name: 'Community navigation' }).querySelector('[aria-current="page"]')?.textContent).toBe('Profile')
})

it('keeps legacy bookmarks scoped to the community and retains guest access boundaries', () => {
  window.history.replaceState(null, '', '/#home')
  render(<App/>)
  expect(document.title).toBe('Community Home · The Crowded Table')
  navigate('community')
  expect(document.title).toBe('Discussion · The Crowded Table')
  expect(screen.getByRole('button', { name: 'Start a conversation' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Switch to guest preview' }))
  expect(screen.queryByRole('button', { name: 'Start a conversation' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Become a Member' })).toBeTruthy()
  navigate('my-home')
  expect(screen.getByRole('heading', { name: 'My Home' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Become a Member' })).toBeNull()
})
