export const communityNavigation = [
  { id: 'community-home', label: 'Community Home', icon: 'home' },
  { id: 'meet-play', label: 'Meet & Play', icon: 'people' },
  { id: 'championship', label: 'Championship', icon: 'trophy' },
  { id: 'discussion', label: 'Discussion', icon: 'chat' },
  { id: 'profile', label: 'Profile', icon: 'user' },
] as const

export const accountRootPath = '/account'
export const accountTabs = [
  { id: 'my-home', label: 'Home', path: '/account/home' },
  { id: 'account-profile', label: 'Profile', path: '/account/profile' },
  { id: 'my-communities', label: 'Communities', path: '/account/communities' },
  { id: 'account-settings', label: 'Settings', path: '/account/settings' },
] as const
export type AccountTab = typeof accountTabs[number]['id']

export const navigation = [
  ...communityNavigation,
  ...accountTabs,
  { id: 'premium-features', label: 'Premium Features', icon: 'leaf' },
] as const
export type Page = typeof navigation[number]['id']

export const pagePaths: Record<Page, string> = {
  ...Object.fromEntries(accountTabs.map(tab => [tab.id, tab.path])) as Record<AccountTab, string>,
  'premium-features': '/account/premium-features',
  'community-home': '/community/preview',
  'meet-play': '/community/preview/meet-play',
  'championship': '/community/preview/championship',
  'discussion': '/community/preview/discussion',
  'profile': '/community/preview/profile',
}

export const authPaths = {
  signup: '/auth/sign-up', signin: '/auth/sign-in', forgot: '/auth/forgot-password',
  check: '/auth/check-email', reset: '/auth/reset-password', callback: '/auth/callback',
  'create-community': '/account/communities/new',
} as const
export type AuthView = keyof typeof authPaths
export function authViewAt(pathname: string): AuthView | null {
  return (Object.keys(authPaths) as AuthView[]).find(view => authPaths[view] === pathname) ?? null
}
export function pageAt(pathname: string): Page | undefined {
  return (Object.keys(pagePaths) as Page[]).find(page => pagePaths[page] === pathname.replace(/\/+$/, ''))
}
