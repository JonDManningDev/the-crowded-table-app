import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { ApplicationRoutes } from './router'
import { navigation, pagePaths, type Page } from './navigation'
function App() { return <BrowserRouter><ApplicationRoutes/></BrowserRouter> }
import { AccountContext } from '../features/auth/accountContext'

async function waitForContent() {
  await waitFor(() => expect(document.querySelector('#main-content h1')).toBeTruthy())
  await waitFor(() => expect(screen.queryByText(/^Loading content/)).toBeNull())
}

async function renderReady(ui: Parameters<typeof render>[0]) {
  let view!: ReturnType<typeof render>
  await act(async () => { view = render(ui) })
  await waitForContent()
  return view
}

// jsdom does not implement native dialog open/close behavior.
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value: function (this: HTMLDialogElement) { this.setAttribute('open', '') },
})
Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })

beforeEach(() => { window.history.replaceState(null, '', '/'); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

async function navigate(page: Page) {
  window.history.replaceState(null, '', pagePaths[page])
  await act(async () => { fireEvent(window, new PopStateEvent('popstate')) })
  await waitFor(() => expect(document.title).toBe(`${navigation.find(item => item.id === page)?.label} · The Crowded Table`))
  await waitForContent()
}

it('lands on the personal home without presenting the community preview as personal activity', async () => {
  await act(async () => { render(<AccountContext.Provider value={{ status: 'signed-in', email: 'person@example.test', userId: '00000000-0000-0000-0000-000000000001' }}><App/></AccountContext.Provider>) })
  await waitForContent()
  expect(screen.getByRole('heading', { name: 'My Account' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: /All your tables/  })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Switch to guest preview' })).toBeNull()
  expect(screen.queryByText('Ana M.')).toBeNull()
  await navigate('my-communities')
  expect(screen.getByRole('heading', { name: 'My Account' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Explore community' }).getAttribute('href')).toBe('/community/preview')
})

it('separates the account identity from the mock community profile', async () => {
  await act(async () => {
    render(
      <AccountContext.Provider value={{ status: 'signed-in', email: 'actual-user@example.com', displayName: 'Actual User' }}>
        <App/>
      </AccountContext.Provider>,
    )
  })
  await waitForContent()
  const space = within(screen.getByRole('region', { name: 'Your space' }))
  expect(space.getByText('Actual User')).toBeTruthy()
  expect(space.queryByText('Ana M.')).toBeNull()
  await navigate('profile')
  expect(space.getByText('Actual User')).toBeTruthy()
  expect(screen.getByRole('navigation', { name: 'Community navigation' }).querySelector('[aria-current="page"]')?.textContent).toBe('Profile')
})

it('retains community guest access boundaries on clean routes', async () => {
  window.history.replaceState(null, '', '/community/preview')
  await act(async () => { render(<App/>) })
  await waitForContent()
  expect(document.title).toBe('Community Home · The Crowded Table')
  await navigate('discussion')
  expect(document.title).toBe('Discussion · The Crowded Table')
  expect(screen.getByRole('button', { name: 'Start a conversation' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Switch to guest preview' }))
  expect(screen.queryByRole('button', { name: 'Start a conversation' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Become a Member' })).toBeTruthy()
  await navigate('my-home')
  expect(screen.getByRole('heading', { name: 'My Account' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Become a Member' })).toBeNull()
})

it('places account tabs above the contents and keeps the summary only on Overview', async () => {
  window.history.replaceState(null, '', '/account')
  await act(async () => {
    render(
      <AccountContext.Provider value={{ status: 'signed-in', email: 'private@example.com', displayName: 'Alex' }}>
        <App/>
      </AccountContext.Provider>,
    )
  })
  await waitForContent()
  expect(screen.getByRole('link', { name: 'Alex' }).getAttribute('href')).toBe('/account')
  expect(document.querySelector('.profile-summary')).toBeTruthy()
  expect(
    within(screen.getByRole('navigation', { name: 'Account navigation' }))
      .getByRole('link', { name: 'Overview' })
      .getAttribute('aria-current'),
  ).toBe('page')
  await navigate('account-settings')
  expect(document.querySelector('.profile-summary')).toBeNull()
  expect(screen.getByRole('heading', { name: 'My Premium Features' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Make yourself comfortable' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Explore Premium Features' }).getAttribute('href')).toBe('/account/premium-features')
  await navigate('my-home')
  expect(document.querySelector('.profile-summary')).toBeNull()
  expect(
    within(screen.getByRole('navigation', { name: 'Account navigation' }))
      .getByRole('link', { name: 'My Home' })
      .getAttribute('aria-current'),
  ).toBe('page')
  await navigate('profile')
  expect(screen.getByRole('button', { name: 'Membership & Settings' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Ana M.' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Membership & Settings' }))
  expect(screen.getByRole('heading', { name: 'Make yourself comfortable' })).toBeTruthy()
  expect(screen.getByRole('switch', { name: /Share my activity history/ })).toBeTruthy()
})

it('places sign out in the breadcrumb header', async () => {
  const signOut = vi.fn()
  await act(async () => {
    render(
      <AccountContext.Provider value={{ status: 'signed-in', email: 'owner@example.test', signOut }}>
        <App/>
      </AccountContext.Provider>,
    )
  })
  await waitForContent()
  const header = screen.getByRole('banner')
  fireEvent.click(within(header).getByRole('button', { name: 'Sign Out' }))
  expect(signOut).toHaveBeenCalledOnce()
  expect(document.querySelector('.auth-bar')).toBeNull()
  expect(document.querySelector('.preview-disclosure')).toBeNull()
})

it('blocks every account edit entry point when the profile failed to load', async () => {
  window.history.replaceState(null, '', '/account')
  await act(async () => {
    render(
      <AccountContext.Provider value={{
        status: 'signed-in',
        email: 'owner@example.test',
        profileError: 'Profile unavailable',
        saveProfile: vi.fn(),
      }}>
        <App/>
      </AccountContext.Provider>,
    )
  })
  await waitForContent()
  expect(screen.getByRole('button', { name: 'Edit Profile' }).hasAttribute('disabled')).toBe(true)
  expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  expect(screen.getByRole('alert').textContent).toBe('Profile unavailable')
})

it('shows a newly unavailable profile inside the open editor and preserves the draft', async () => {
  window.history.replaceState(null, '', '/account')
  const account = { status: 'signed-in' as const, email: 'owner@example.test', displayName: 'Original', saveProfile: vi.fn() }
  const view = await renderReady(<AccountContext.Provider value={account}><App/></AccountContext.Provider>)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'My draft' } })
  view.rerender(<AccountContext.Provider value={{ ...account, profileError: 'Profile unavailable' }}><App/></AccountContext.Provider>)
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByRole('alert').textContent).toBe('Profile unavailable')
  expect((dialog.getByLabelText('Display name') as HTMLInputElement).value).toBe('My draft')
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(account.saveProfile).not.toHaveBeenCalled()
})

it('retains the profile draft and reports a failed save without claiming success', async () => {
  window.history.replaceState(null, '', '/account')
  const saveProfile = vi.fn().mockRejectedValue(new Error('Could not save'))
  await act(async () => {
    render(
      <AccountContext.Provider value={{ status: 'signed-in', email: 'owner@example.test', saveProfile }}>
        <App/>
      </AccountContext.Provider>,
    )
  })
  await waitForContent()
  fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'My draft' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toBe('Could not save'))
  expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('My draft')
  expect(screen.queryByText('Your account profile has been saved.')).toBeNull()
})

it('does not interpret legacy hash routes', async () => {
  window.history.replaceState(null, '', '/#profile')
  await act(async () => { render(<App/>) })
  await waitForContent()
  expect(window.location.pathname).toBe('/account/home')
  expect(screen.getByRole('heading', { name: 'My Account' })).toBeTruthy()
})
it('shows not found for unknown paths instead of sample tenant data', async () => {
  window.history.replaceState(null, '', '/communities/unknown/profile')
  await act(async () => { render(<App/>) })
  await waitForContent()
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy()
})
it('uses browser history for tabs and sidebar links', async () => {
  window.history.replaceState(null, '', '/account')
  await act(async () => { render(<App/>) })
  await waitForContent()
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Account navigation' })).getByRole('link', { name: 'Settings' }))
  expect(window.location.pathname).toBe('/account/settings')
  window.history.back()
  await waitFor(() => expect(
    within(screen.getByRole('navigation', { name: 'Account navigation' }))
      .getByRole('link', { name: 'Overview' })
      .getAttribute('aria-current'),
  ).toBe('page'))
  window.history.forward()
  await waitFor(() => expect(
    within(screen.getByRole('navigation', { name: 'Account navigation' }))
      .getByRole('link', { name: 'Settings' })
      .getAttribute('aria-current'),
  ).toBe('page'))
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Community navigation' })).getByRole('link', { name: 'Profile' }))
  expect(window.location.pathname).toBe('/community/preview/profile')
  await waitFor(() => expect(document.title).toBe('Profile · The Crowded Table'))
  await waitForContent()
  expect(document.activeElement?.id).toBe('main-content')
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'instant' })
})

it.each(Object.entries(pagePaths))('loads %s directly with consistent navigation metadata', async (page, path) => {
  window.history.replaceState(null, '', path + '/')
  await act(async () => { render(<App/>) })
  await waitForContent()
  expect(screen.queryByRole('heading', { name: 'Page not found' })).toBeNull()
  expect(document.title).not.toContain('Page not found')
  expect(window.location.pathname).toBe(path + '/')
  const accountLink = within(screen.getByRole('region', { name: 'Your space' })).getByRole('link')
  expect(accountLink.getAttribute('aria-current')).toBe(path.startsWith('/account') ? 'page' : null)
  expect(within(screen.getByRole('region', { name: 'Your space' })).queryByRole('link', { name: 'My Communities' })).toBeNull()
  expect(within(screen.getByRole('region', { name: 'Your space' })).queryByRole('link', { name: 'My Home' })).toBeNull()
  if (page === 'profile') expect(screen.getByRole('heading', { name: 'Ana M.' })).toBeTruthy()
})


it.each([
  ['/account', 'Sign in to see your account.'],
  ['/account/home', 'Sign in to review your activity feed.'],
  ['/account/communities', 'Sign in to see your communities.'],
  ['/account/settings', 'Sign in to manage your account settings.'],
])('shows only the signed-out prompt under account navigation at %s', async (path, message) => {
  window.history.replaceState(null, '', path)
  await act(async () => { render(<App/>) })
  await waitForContent()
  expect(screen.getByText(message)).toBeTruthy()
  expect(screen.getByRole('navigation', { name: 'Account navigation' })).toBeTruthy()
  expect(document.querySelector('.account-content')).toBeNull()
  expect(screen.queryByRole('link', { name: 'Explore community' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Edit Profile' })).toBeNull()
})
it('does not flash mock account content while the session is loading', async () => {
  await act(async () => { render(<AccountContext.Provider value={{ status: 'loading', email: null }}><App/></AccountContext.Provider>) })
  await waitForContent()
  expect(screen.getByText('Loading your account…')).toBeTruthy()
  expect(document.querySelector('.account-content')).toBeNull()
})
