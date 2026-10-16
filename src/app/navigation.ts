export const communityNavigation = [
  { id: 'community-home', label: 'Community Home', icon: 'home' },
  { id: 'meet-play', label: 'Meet & Play', icon: 'people' },
  { id: 'championship', label: 'Championship', icon: 'trophy' },
  { id: 'discussion', label: 'Discussion', icon: 'chat' },
  { id: 'profile', label: 'Profile', icon: 'user' },
] as const

export const personalNavigation = [
  { id: 'my-communities', label: 'My Communities', icon: 'people' },
  { id: 'my-home', label: 'My Home', icon: 'home' },
] as const

export const accountNavigation = [
  { id: 'account', label: 'My Account', icon: 'user' },
  { id: 'account-settings', label: 'Settings', icon: 'user' },
  { id: 'premium-features', label: 'Premium Features', icon: 'leaf' },
] as const
export const navigation = [...communityNavigation, ...personalNavigation, ...accountNavigation]
export type Page = typeof navigation[number]['id']

export const pagePaths: Record<Page, string> = {
  'account': '/account',
  'my-home': '/account/home',
  'my-communities': '/account/communities',
  'account-settings': '/account/settings',
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
