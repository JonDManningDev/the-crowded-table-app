import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { ActionLink, Button, Link, NavItem } from './Controls'

afterEach(cleanup)

it('keeps actions out of form submission and blocks pending commands', async () => {
  const user = userEvent.setup()
  const submit = vi.fn(event => event.preventDefault())
  const action = vi.fn()
  render(<form onSubmit={submit}><Button onClick={action}>Preview</Button><Button type="submit">Save</Button><Button loading onClick={action}>Working</Button><Button disabled onClick={action}>Unavailable</Button></form>)
  await user.tab()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Preview' }))
  await user.keyboard('{Enter}')
  expect(action).toHaveBeenCalledOnce()
  expect(submit).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(submit).toHaveBeenCalledOnce()
  await user.click(screen.getByRole('button', { name: 'Working' }))
  await user.click(screen.getByRole('button', { name: 'Unavailable' }))
  expect(action).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Working' }).getAttribute('aria-busy')).toBe('true')
})

function Location() { const location = useLocation(); return <output>{location.pathname + location.search + location.hash}</output> }
it('preserves relative destinations, search and fragments and supports keyboard navigation', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/account/home']}><Routes><Route path="/account/*" element={<><Link to="../settings?mode=privacy#preferences" relative="path">Preferences</Link><Location/></>}/></Routes></MemoryRouter>)
  expect(screen.getByRole('link').getAttribute('href')).toBe('/account/settings?mode=privacy#preferences')
  await user.tab()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('status').textContent).toBe('/account/settings?mode=privacy#preferences')
})

it('retains native link semantics for prominent and external destinations', () => {
  render(<MemoryRouter><ActionLink to="/account" target="_blank" rel="noopener">Account</ActionLink><ActionLink href="https://example.com/plans" target="_blank" rel="noopener">Plans</ActionLink><Link href="https://example.com/help">Help</Link></MemoryRouter>)
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.getByRole('link', { name: 'Account' }).getAttribute('target')).toBe('_blank')
  expect(screen.getByRole('link', { name: 'Plans' }).getAttribute('href')).toBe('https://example.com/plans')
  expect(screen.getByRole('link', { name: 'Help' }).getAttribute('href')).toBe('https://example.com/help')
})

it('matches exact navigation destinations without selecting their parent', () => {
  render(<MemoryRouter initialEntries={['/account/settings']}><nav><NavItem end to="/account">Overview</NavItem><NavItem end to="/account/settings">Settings</NavItem></nav></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Overview' }).hasAttribute('aria-current')).toBe(false)
  expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('aria-current')).toBe('page')
})
