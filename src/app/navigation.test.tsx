import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { ApplicationRoutes } from './router'
import { navigation, pagePaths, type Page } from './navigation'
function App() { return <BrowserRouter><ApplicationRoutes/></BrowserRouter> }
import { AccountContext } from '../features/user-accounts/accountContext'

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

it('places account tabs above the contents and keeps the summary only on Profile', async () => {
  window.history.replaceState(null, '', '/account/profile')
  await act(async () => {
    render(
      <AccountContext.Provider value={{ status: 'signed-in', email: 'private@example.com', displayName: 'Alex' }}>
        <App/>
      </AccountContext.Provider>,
    )
  })
  await waitForContent()
  expect(screen.getByRole('link', { name: 'Alex' }).getAttribute('href')).toBe('/account')
  expect(screen.queryByRole('region', { name: 'Profile summary' })).toBeTruthy()
  expect(screen.getByRole('region', { name: 'Insights' })).toBeTruthy()
  expect(
    within(screen.getByRole('navigation', { name: 'Account navigation' }))
      .getByRole('link', { name: 'Profile' })
      .getAttribute('aria-current'),
  ).toBe('page')
  await navigate('account-settings')
  expect(screen.queryByRole('region', { name: 'Profile summary' })).toBeNull()
  expect(screen.getByRole('heading', { name: 'My Premium Features' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Make yourself comfortable' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Explore Premium Features' }).getAttribute('href')).toBe('/account/premium-features')
  await navigate('my-home')
  expect(screen.queryByRole('region', { name: 'Profile summary' })).toBeNull()
  expect(
    within(screen.getByRole('navigation', { name: 'Account navigation' }))
      .getByRole('link', { name: 'Home' })
      .getAttribute('aria-current'),
  ).toBe('page')
  await navigate('profile')
  expect(screen.getByRole('button', { name: 'Membership & Settings' })).toBeTruthy()
  expect(screen.queryByRole('region', { name: 'Insights' })).toBeNull()
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
  window.history.replaceState(null, '', '/account/profile')
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
  window.history.replaceState(null, '', '/account/profile')
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
  window.history.replaceState(null, '', '/account/profile')
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
  window.history.replaceState(null, '', '/account/profile')
  await act(async () => { render(<App/>) })
  await waitForContent()
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Account navigation' })).getByRole('link', { name: 'Settings' }))
  expect(window.location.pathname).toBe('/account/settings')
  window.history.back()
  await waitFor(() => expect(
    within(screen.getByRole('navigation', { name: 'Account navigation' }))
      .getByRole('link', { name: 'Profile' })
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
  expect(within(screen.getByRole('region', { name: 'Your space' })).queryByRole('link', { name: 'Communities' })).toBeNull()
  expect(within(screen.getByRole('region', { name: 'Your space' })).queryByRole('link', { name: 'Home' })).toBeNull()
  if (page === 'profile') expect(screen.getByRole('heading', { name: 'Ana M.' })).toBeTruthy()
})


it.each([
  ['/account/profile', 'Sign in to see your account.'],
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


it.each(['/', '/account', '/account/'])('redirects %s to Home without adding a history entry', async path => {
  window.history.replaceState(null, '', '/community/preview');
  window.history.pushState(null, '', path);
  const historyLength = window.history.length;
  await renderReady(<App/>);
  expect(window.location.pathname).toBe('/account/home');
  expect(window.history.length).toBe(historyLength);
  window.history.back();
  await waitFor(() => expect(window.location.pathname).toBe('/community/preview'));
  window.history.forward();
  await waitFor(() => expect(window.location.pathname).toBe('/account/home'));
});

it.each([
  ['/account/home', 'Home'],
  ['/account/profile', 'Profile'],
  ['/account/communities', 'Communities'],
  ['/account/settings', 'Settings'],
])('shows ordered tabs and consistent account metadata at %s', async (path, label) => {
  window.history.replaceState(null, '', path);
  await renderReady(<App/>);
  const nav = screen.getByRole('navigation', { name: 'Account navigation' });
  const links = within(nav).getAllByRole('link');
  expect(links.map(link => [link.textContent, link.getAttribute('href')])).toEqual([
    ['Home', '/account/home'], ['Profile', '/account/profile'],
    ['Communities', '/account/communities'], ['Settings', '/account/settings'],
  ]);
  expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  expect(within(nav).getByRole('link', { name: label }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('banner').textContent).toContain('My Account/' + label);
  expect(document.title).toBe(label + ' · The Crowded Table');
  const mobile = within(screen.getByRole('navigation', { name: 'Personal navigation' })).getByRole('link');
  expect(mobile.getAttribute('href')).toBe('/account');
  expect(mobile.getAttribute('aria-current')).toBe('page');
});

it('keeps Premium Features outside the tabs with an account breadcrumb', async () => {
  window.history.replaceState(null, '', '/account/premium-features');
  await renderReady(<App/>);
  expect(screen.getByRole('banner').textContent).toContain('My Account/Premium Features');
});


it('retains Community Home bookings across routes while resetting only page-owned browsing state', async () => {
  window.history.replaceState(null, '', pagePaths['community-home'])
  await renderReady(<App/>)
  fireEvent.click(screen.getByRole('button', { name: 'Find your next game night' }))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Take a Seat' }))
  expect(within(screen.getByRole('dialog')).getByText('Your seat is confirmed')).toBeTruthy()
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close dialog' }))
  expect(screen.getByRole('button', { name: /Learn & Play: Azul.*You’re going/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  fireEvent.click(screen.getByRole('button', { name: 'Learn & Play' }))
  await navigate('meet-play')
  await navigate('profile')
  await navigate('community-home')
  expect(screen.getByRole('button', { name: 'All evenings' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: 'Upcoming' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: /Learn & Play: Azul.*You’re going/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Find your next game night' }))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
  expect(within(screen.getByRole('dialog')).getByText('8 of 10 seats filled')).toBeTruthy()
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel reservation' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close dialog' }))
  expect(screen.getByRole('button', { name: /Learn & Play: Azul.*3 seats open/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
  expect(screen.getByRole('heading', { name: 'October 2026' })).toBeTruthy()
})

it('retains the guest promotion action and existing special-event checkout preview', async () => {
  window.history.replaceState(null, '', pagePaths['community-home'])
  await renderReady(<App/>)
  fireEvent.click(screen.getByRole('button', { name: 'Switch to guest preview' }))
  expect(screen.getByText(/for L300\/month/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Become a Member' }))
  expect(screen.getByRole('heading', { name: 'The Crowded Table Membership' })).toBeTruthy()
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('button', { name: 'Discover our Halloween gathering' }))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Reserve/ }))
  expect(within(screen.getByRole('dialog')).getByText('Preview checkout. No payment details are collected or charged.')).toBeTruthy()
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Simulate payment & reserve' })).toBeTruthy()
})


it('creates a table through the feature API and preserves it across Profile, Home and preview-mode remounts', async () => {
  window.history.replaceState(null, '', pagePaths['meet-play'])
  await renderReady(<App/>)
  fireEvent.change(screen.getByLabelText('Search tables'), { target: { value: 'no result' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create a Table' }))
  const dialog = within(screen.getByRole('dialog'))
  fireEvent.change(dialog.getByLabelText('What are we playing?'), { target: { value: '  Demo forest evening  ' } })
  fireEvent.change(dialog.getByLabelText('Exact meeting address (confirmed guests only)'), { target: { value: 'Fictional demo room 42' } })
  fireEvent.change(dialog.getByLabelText('Tell us about your table'), { target: { value: 'A friendly demo game' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('button', { name: 'My Tables' }).getAttribute('aria-pressed')).toBe('true')
  expect((screen.getByLabelText('Search tables') as HTMLInputElement).value).toBe('')
  expect(screen.getByRole('button', { name: /Demo forest evening.*4 seats open/ })).toBeTruthy()
  expect(screen.queryByText('Fictional demo room 42')).toBeNull()
  await navigate('profile')
  fireEvent.click(screen.getByRole('button', { name: 'My Activity' }))
  expect(screen.getByText('Demo forest evening', { exact: true })).toBeTruthy()
  await navigate('community-home')
  expect(screen.queryByRole('heading', { name: 'Demo forest evening' })).toBeNull()
  await navigate('meet-play')
  expect(screen.getByRole('button', { name: 'Find a Table' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: /Demo forest evening.*4 seats open/ }))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
  expect(within(screen.getByRole('dialog')).getByText('Fictional demo room 42')).toBeTruthy()
  expect(within(screen.getByRole('dialog')).getByText('You’re hosting this table')).toBeTruthy()
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close dialog' }))
  fireEvent.change(screen.getByLabelText('Search tables'), { target: { value: 'draft filter' } })
  fireEvent.click(screen.getByRole('button', { name: 'Switch to guest preview' }))
  expect(screen.getByRole('heading', { name: 'Your people are here.' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Switch to member preview' }))
  await waitFor(() => expect(screen.getByLabelText('Search tables')).toBeTruthy())
  expect((screen.getByLabelText('Search tables') as HTMLInputElement).value).toBe('')
  expect(screen.getByRole('heading', { name: 'Demo forest evening' })).toBeTruthy()
})

it('keeps matching preferences in the shared simulation across navigation and discards cancelled edits', async () => {
  window.history.replaceState(null, '', pagePaths['meet-play'])
  await renderReady(<App/>)
  fireEvent.click(screen.getByRole('button', { name: 'Find my people' }))
  fireEvent.change(screen.getByLabelText('When would you like to play?'), { target: { value: 'Sunday afternoon' } })
  fireEvent.change(screen.getByLabelText('Anything else?'), { target: { value: 'A demo preference' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(screen.getByRole('button', { name: 'Update your preferences' })).toBeTruthy()
  await navigate('profile')
  await navigate('meet-play')
  fireEvent.click(screen.getByRole('button', { name: 'Update your preferences' }))
  expect((screen.getByLabelText('When would you like to play?') as HTMLSelectElement).value).toBe('Sunday afternoon')
  expect((screen.getByLabelText('Anything else?') as HTMLTextAreaElement).value).toBe('A demo preference')
  fireEvent.change(screen.getByLabelText('Anything else?'), { target: { value: 'Discard this edit' } })
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('button', { name: 'Update your preferences' }))
  expect((screen.getByLabelText('Anything else?') as HTMLTextAreaElement).value).toBe('A demo preference')
})

it('projects confirmed/requested/waitlisted table participation into My Tables and updates after cancellation', async () => {
  window.history.replaceState(null, '', pagePaths['meet-play'])
  await renderReady(<App/>)
  for (const [title, action, status, cancel] of [
    ['Codenames & coffee', 'Take a Seat', 'Your seat is confirmed', 'Cancel reservation'],
    ['A cozy Cascadia afternoon', 'Request a Seat', 'Waiting for host approval', 'Cancel request'],
    ['Commander, casually', 'Join Waitlist', 'You’re on the waitlist', 'Cancel waitlist spot'],
  ]) {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(title) }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: action }))
    expect(within(screen.getByRole('dialog')).getByText(status)).toBeTruthy()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close dialog' }))
    fireEvent.click(screen.getByRole('button', { name: 'My Tables' }))
    expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(title) }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: cancel }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close dialog' }))
    expect(screen.queryByRole('heading', { name: title })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Find a Table' }))
  }
})


it('keeps guest Championship entry independent of membership and persistent across navigation', async () => {
  window.history.replaceState(null, '', pagePaths.championship)
  await renderReady(<App/>)
  fireEvent.click(screen.getByRole('button', { name: 'Switch to guest preview' }))
  fireEvent.click(screen.getByRole('button', { name: 'Join the Championship' }))
  expect(screen.getByRole('button', { name: 'Simulate entry payment' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Simulate entry payment' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('button', { name: 'Submit a match result' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Switch to member preview' })).toBeTruthy()
  await navigate('meet-play')
  expect(screen.getByRole('heading', { name: 'Your people are here.' })).toBeTruthy()
  await navigate('championship')
  expect(screen.getByRole('button', { name: 'Submit a match result' })).toBeTruthy()
})

it.each(['Confirm', 'Dispute'])('applies Championship %s updates consistently across standings/final views and navigation', async action => {
  window.history.replaceState(null, '', pagePaths.championship)
  await renderReady(<App/>)
  fireEvent.click(screen.getByRole('button', { name: 'Join the Championship' }))
  fireEvent.click(screen.getByRole('button', { name: 'Count me in' }))
  fireEvent.click(screen.getByRole('button', { name: 'My Matches' }))
  fireEvent.click(screen.getByRole('button', { name: action }))
  expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull()
  expect(screen.getByRole('status').textContent).toContain(action === 'Confirm' ? 'Result confirmed.' : 'Result flagged for review.')
  fireEvent.click(screen.getByRole('button', { name: 'Leaderboard' }))
  const row = screen.getByRole('row', { name: /Lucía M\./ })
  expect(within(row).getByRole('cell', { name: action === 'Confirm' ? '43' : '38' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'The Final Table' }))
  expect(screen.getByText(action === 'Confirm' ? '43 pts' : '38 pts')).toBeTruthy()
  expect(screen.getByText('Provisional · not final qualification')).toBeTruthy()
  await navigate('community-home')
  await navigate('championship')
  expect(screen.getByRole('button', { name: 'Overview' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'My Matches' }))
  expect(screen.getByText(action === 'Confirm' ? 'confirmed' : 'disputed', { exact: true })).toBeTruthy()
  expect(screen.queryByRole('status')).toBeNull()
})

it('appends pending/tied Championship submissions and prevents self-confirmation while preserving mode state', async () => {
  window.history.replaceState(null, '', pagePaths.championship)
  await renderReady(<App/>)
  fireEvent.click(screen.getByRole('button', { name: 'Join the Championship' }))
  fireEvent.click(screen.getByRole('button', { name: 'Count me in' }))
  for (const [score, opponentScore] of [['120', '100'], ['100', '100']]) {
    fireEvent.click(screen.getByRole('button', { name: 'Submit a match result' }))
    fireEvent.change(screen.getByLabelText('Your score'), { target: { value: score } })
    fireEvent.change(screen.getByLabelText('Opponent’s score'), { target: { value: opponentScore } })
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  }
  expect(screen.getByText('You cannot confirm your own result.', { exact: false })).toBeTruthy()
  expect(screen.getByText('disputed', { exact: true })).toBeTruthy()
  expect(screen.getAllByRole('button', { name: 'Confirm' })).toHaveLength(1)
  expect(screen.getByRole('status').textContent).toBe('Tied result sent for review. It is not included in standings.')
  fireEvent.click(screen.getByRole('button', { name: 'Switch to guest preview' }))
  expect(screen.getByRole('button', { name: 'My Matches' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('status').textContent).toContain('Tied result')
  fireEvent.click(screen.getByRole('button', { name: 'Leaderboard' }))
  expect(within(screen.getByRole('row', { name: /Lucía M\./ })).getByRole('cell', { name: '38' })).toBeTruthy()
  await navigate('profile')
  await navigate('championship')
  fireEvent.click(screen.getByRole('button', { name: 'My Matches' }))
  expect(screen.getByText('2026-10-04 · Score 120 — 100')).toBeTruthy()
  expect(screen.getByText('2026-10-04 · Score 100 — 100')).toBeTruthy()
})


it('retains created Discussion posts/replies/counts through navigation and guest remounts', async () => {
  window.history.replaceState(null, '', pagePaths.discussion)
  await renderReady(<App/>)
  fireEvent.click(screen.getByRole('button', { name: /^Off-topic/ }))
  fireEvent.change(screen.getByLabelText('Search discussions'), { target: { value: 'old query' } })
  fireEvent.click(screen.getByRole('button', { name: 'Start a conversation' }))
  fireEvent.change(screen.getByLabelText('A little headline'), { target: { value: '  A friendly test conversation  ' } })
  fireEvent.change(screen.getByLabelText('Pull up a chair'), { target: { value: '  Everyone is welcome.  ' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect((screen.getByLabelText('Search discussions') as HTMLInputElement).value).toBe('')
  expect(screen.getByRole('button', { name: /^All discussions/ }).textContent).toContain('5')
  expect(screen.getByRole('button', { name: /^Off-topic/ }).textContent).toContain('1')
  const card = screen.getByRole('heading', { name: 'A friendly test conversation' }).closest('button')!
  expect(card.textContent).toContain('Ana M.')
  fireEvent.click(card)
  fireEvent.change(screen.getByLabelText('Join the conversation'), { target: { value: '  A kind reply  ' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(within(screen.getByRole('dialog')).getByText('A kind reply')).toBeTruthy()
  expect((screen.getByLabelText('Join the conversation') as HTMLTextAreaElement).value).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  expect(screen.getByRole('heading', { name: 'A friendly test conversation' }).closest('button')?.textContent).toContain('1 reply')
  await navigate('profile')
  await navigate('discussion')
  expect(screen.getByRole('heading', { name: 'A friendly test conversation' })).toBeTruthy()
  fireEvent.click(screen.getByRole('heading', { name: 'A friendly test conversation' }).closest('button')!)
  fireEvent.change(screen.getByLabelText('Join the conversation'), { target: { value: 'Unsaved reply' } })
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('button', { name: 'Switch to guest preview' }))
  expect(screen.getByRole('heading', { name: 'Come into the conversation.' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Switch to member preview' }))
  expect(screen.getByRole('button', { name: 'Discussions' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('heading', { name: 'A friendly test conversation' }).closest('button')!)
  expect(within(screen.getByRole('dialog')).getByText('A kind reply')).toBeTruthy()
  expect((screen.getByLabelText('Join the conversation') as HTMLTextAreaElement).value).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open community notifications' }))
  expect(screen.getByRole('dialog').textContent).toContain('Your conversation is on the community board.')
})

it('retains saved recommendations across navigation/mode changes while resetting page-local filters', async () => {
  window.history.replaceState(null, '', pagePaths.discussion)
  await renderReady(<App/>)
  fireEvent.click(screen.getByRole('button', { name: 'Game Recommendations' }))
  fireEvent.click(within(screen.getByRole('heading', { name: 'Cascadia' }).closest('article')!).getByRole('button'))
  expect(screen.getByRole('button', { name: 'On your play list' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Local Spots' }))
  fireEvent.change(screen.getByLabelText('Filter local spots'), { target: { value: 'Stores' } })
  await navigate('profile')
  await navigate('discussion')
  fireEvent.click(screen.getByRole('button', { name: 'Local Spots' }))
  expect((screen.getByLabelText('Filter local spots') as HTMLSelectElement).value).toBe('All spots')
  fireEvent.click(screen.getByRole('button', { name: 'Switch to guest preview' }))
  fireEvent.click(screen.getByRole('button', { name: 'Switch to member preview' }))
  fireEvent.click(screen.getByRole('button', { name: 'Game Recommendations' }))
  fireEvent.click(screen.getByRole('button', { name: 'On your play list' }))
  expect(screen.getAllByRole('button', { name: 'Add to my play list' })).toHaveLength(3)
})

it('uses current community profile names for new posts/replies without rewriting prior authors', async () => {
  window.history.replaceState(null, '', pagePaths.profile)
  await renderReady(<App/>)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
  fireEvent.change(screen.getByLabelText('Your display name'), { target: { value: 'New preview name' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  await navigate('discussion')
  fireEvent.click(screen.getByRole('button', { name: 'Start a conversation' }))
  fireEvent.change(screen.getByLabelText('A little headline'), { target: { value: 'A renamed author' } })
  fireEvent.change(screen.getByLabelText('Pull up a chair'), { target: { value: 'Still only the community preview.' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(screen.getByRole('heading', { name: 'A renamed author' }).closest('button')?.textContent).toContain('New preview name')
  fireEvent.click(screen.getByRole('heading', { name: 'A little hello to our newest faces 👋' }).closest('button')!)
  fireEvent.change(screen.getByLabelText('Join the conversation'), { target: { value: 'Reply after rename' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByText('New preview name')).toBeTruthy()
  expect(dialog.getByText('Lucía M.')).toBeTruthy()
})


it('keeps Community Profile preferences immediate and feedback scoped to the settings view across navigation/mode changes', async () => {
  window.history.replaceState(null, '', pagePaths.profile)
  await renderReady(<App/>)
  fireEvent.click(screen.getByRole('button', { name: 'Membership & Settings' }))
  fireEvent.click(screen.getByRole('switch', { name: /Share my activity history/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Preview member-facing profile' }))
  expect(screen.getByRole('dialog').textContent).toContain('12 events attended · 3 tables hosted')
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))
  fireEvent.click(screen.getByRole('button', { name: 'Switch to guest preview' }))
  expect(screen.getByRole('status').textContent).toContain('Saved for this visit')
  fireEvent.click(screen.getByRole('button', { name: 'Overview' }))
  fireEvent.click(screen.getByRole('button', { name: 'Membership & Settings' }))
  expect(screen.queryByRole('status')).toBeNull()
  expect((screen.getByRole('switch', { name: /Share my activity history/ }) as HTMLInputElement).checked).toBe(true)
  await navigate('championship')
  await navigate('profile')
  expect(screen.getByRole('button', { name: 'Overview' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Preview member-facing profile' }))
  expect(screen.getByRole('dialog').textContent).toContain('12 events attended · 3 tables hosted')
})

it('keeps edited community names independent from account identity and propagates them to Championship and new Discussion authors', async () => {
  window.history.replaceState(null, '', pagePaths.profile)
  await renderReady(<AccountContext.Provider value={{ status: 'signed-in', email: 'global@example.test', displayName: 'Global identity', userId: '00000000-0000-0000-0000-000000000001' }}><App/></AccountContext.Provider>)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
  fireEvent.change(screen.getByLabelText('Your display name'), { target: { value: '  Community identity  ' } })
  fireEvent.change(screen.getByLabelText('A little about you'), { target: { value: '  Updated local bio  ' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(screen.getByRole('heading', { name: 'Community identity' })).toBeTruthy()
  expect(within(screen.getByRole('region', { name: 'Your space' })).getByText('Global identity')).toBeTruthy()
  await navigate('championship')
  fireEvent.click(screen.getByRole('button', { name: 'Leaderboard' }))
  expect(screen.getByRole('row', { name: /Community identity/ })).toBeTruthy()
  await navigate('discussion')
  fireEvent.click(screen.getByRole('button', { name: 'Start a conversation' }))
  fireEvent.change(screen.getByLabelText('A little headline'), { target: { value: 'An independent community name' } })
  fireEvent.change(screen.getByLabelText('Pull up a chair'), { target: { value: 'Fictional local post' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(screen.getByRole('heading', { name: 'An independent community name' }).closest('button')?.textContent).toContain('Community identity')
  expect(screen.getByRole('heading', { name: 'A little hello to our newest faces 👋' }).closest('button')?.textContent).toContain('Lucía M.')
})

it('saves only local support notices and preserves activity subviews until route unmount', async () => {
  window.history.replaceState(null, '', pagePaths.profile)
  await renderReady(<App/>)
  fireEvent.click(screen.getByRole('button', { name: 'My Activity' }))
  fireEvent.click(screen.getByRole('button', { name: 'History' }))
  fireEvent.click(screen.getByRole('button', { name: 'Membership & Settings' }))
  fireEvent.click(screen.getByRole('button', { name: /A question/ }))
  fireEvent.change(screen.getByLabelText('Your note'), { target: { value: '  Fictional support note  ' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'My Activity' }))
  expect(screen.getByRole('button', { name: 'History' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Open community notifications' }))
  expect(screen.getByRole('dialog').textContent).toContain('Demo support note saved: Fictional support note')
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  await navigate('community-home')
  await navigate('profile')
  fireEvent.click(screen.getByRole('button', { name: 'My Activity' }))
  expect(screen.getByRole('button', { name: 'Upcoming' }).getAttribute('aria-pressed')).toBe('true')
})


it('retains table messages and host decisions across routes and mode changes while discarding dialog drafts', async () => {
  window.history.replaceState(null, '', pagePaths['meet-play'])
  await renderReady(<App/>)
  const openHosted = async () => {
    fireEvent.click(screen.getByRole('button', { name: /Sunday birds & brunch/ }))
    await screen.findByRole('dialog')
  }
  await openHosted()
  fireEvent.click(screen.getByRole('button', { name: 'Accept' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Message your table' }), { target: { value: '  Retained table hello  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Message your table' }), { target: { value: 'Unsent route draft' } })
  await navigate('community-home')
  expect(screen.queryByRole('dialog')).toBeNull()
  await navigate('meet-play'); await openHosted()
  expect((screen.getByRole('textbox', { name: 'Message your table' }) as HTMLInputElement).value).toBe('')
  expect(screen.getByText('Retained table hello')).toBeTruthy()
  expect(screen.getByText('accepted')).toBeTruthy()
  fireEvent.change(screen.getByRole('textbox', { name: 'Message your table' }), { target: { value: 'Unsent mode draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Switch to guest preview' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Switch to member preview' }))
  await screen.findByLabelText('Search tables'); await openHosted()
  expect((screen.getByRole('textbox', { name: 'Message your table' }) as HTMLInputElement).value).toBe('')
  expect(screen.getByText('Retained table hello')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull()
})


it('clears the current mock inbox in place and shows new action notices afterward', async () => {
  window.history.replaceState(null, '', pagePaths['community-home']); await renderReady(<App/> )
  const bell = () => screen.getByRole('button', { name: 'Open community notifications' })
  expect(bell().querySelector('span')).toBeTruthy()
  fireEvent.click(bell()); expect(screen.getByText('Welcome to your table. October is looking lovely.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
  expect(screen.getByRole('dialog')).toBeTruthy(); expect(screen.getByText(/You’re all caught up/)).toBeTruthy()
  expect(bell().querySelector('span')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('button', { name: /Learn & Play: Azul/ }))
  await screen.findByRole('button', { name: 'Take a Seat' }); fireEvent.click(screen.getByRole('button', { name: 'Take a Seat' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  expect(bell().querySelector('span')).toBeTruthy(); fireEvent.click(bell())
  expect(screen.getByText('Your seat at Learn & Play: Azul is confirmed.')).toBeTruthy()
  expect(screen.queryByText('Welcome to your table. October is looking lovely.')).toBeNull()
})
it('preserves stored notices through guest gating and both preview entry points', async () => {
  window.history.replaceState(null, '', pagePaths['meet-play']); await renderReady(<App/> )
  const bell = () => screen.getByRole('button', { name: 'Open community notifications' })
  fireEvent.click(bell()); fireEvent.click(screen.getByRole('button', { name: 'Switch to guest preview' }))
  expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.getByRole('heading', { name: 'Your people are here.' })).toBeTruthy()
  expect(bell().querySelector('span')).toBeTruthy(); fireEvent.click(bell())
  expect(screen.queryByText('Welcome to your table. October is looking lovely.')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Mark all as read' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('button', { name: 'Become a Member' }))
  expect(screen.getByRole('dialog', { name: 'Pull up a chair. Stay a while.' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Try the member experience' }))
  expect(screen.queryByRole('dialog')).toBeNull(); await screen.findByLabelText('Search tables')
  fireEvent.click(bell()); expect(screen.getByText('Welcome to your table. October is looking lovely.')).toBeTruthy()
})
it('closes membership and notification dialogs on route and Back/Forward transitions without resetting notices', async () => {
  window.history.replaceState(null, '', pagePaths.profile); await renderReady(<App/> )
  fireEvent.click(screen.getByRole('button', { name: 'Membership & Settings' }))
  fireEvent.click(screen.getByRole('button', { name: 'Manage membership' }))
  expect(screen.getByRole('dialog', { name: 'A little more belonging, every month' })).toBeTruthy()
  await act(async () => { window.history.pushState(null, '', pagePaths['community-home']); fireEvent(window, new PopStateEvent('popstate')) })
  await waitForContent(); expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Open community notifications' }))
  await act(async () => { window.history.back() })
  await waitFor(() => expect(window.location.pathname).toBe(pagePaths.profile)); await waitForContent()
  expect(screen.queryByRole('dialog')).toBeNull()
  await act(async () => { window.history.forward() })
  await waitFor(() => expect(window.location.pathname).toBe(pagePaths['community-home'])); await waitForContent()
  fireEvent.click(screen.getByRole('button', { name: 'Open community notifications' }))
  expect(screen.getByText('Welcome to your table. October is looking lovely.')).toBeTruthy()
})
