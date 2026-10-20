import { lazy } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LazyContent } from './LazyContent'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('keeps surrounding navigation available while a page loads', async () => {
  let resolve!: (value: { default: () => React.ReactNode }) => void
  const Page = lazy(() => new Promise<{ default: () => React.ReactNode }>(done => { resolve = done }))
  render(<><nav aria-label="Test navigation"><a href="/account">Account</a></nav><LazyContent><Page/></LazyContent></>)
  expect(screen.getByRole('status').textContent).toBe('Loading content…')
  expect(screen.getByRole('link', { name: 'Account' })).toBeTruthy()
  await act(async () => { resolve({ default: () => <h1>Loaded page</h1> }) })
  expect(screen.getByRole('heading', { name: 'Loaded page' })).toBeTruthy()
  expect(screen.queryByRole('status')).toBeNull()
})

it('shows recovery after a failed import and recovers on another route', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const BrokenPage = lazy(() => Promise.reject(new Error('Chunk unavailable')))
  let view!: ReturnType<typeof render>
  await act(async () => { view = render(<LazyContent resetKey="/broken"><BrokenPage/></LazyContent>) })
  expect(screen.getByRole('alert').textContent).toContain('This content couldn’t be loaded.')
  expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy()
  view.rerender(<LazyContent resetKey="/account"><h1>Account</h1></LazyContent>)
  expect(screen.getByRole('heading', { name: 'Account' })).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})
