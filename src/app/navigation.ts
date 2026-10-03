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

export const navigation = [...communityNavigation, ...personalNavigation]
export type Page = typeof navigation[number]['id']

export function currentPage(): Page {
  const hash = window.location.hash.slice(1)
  // Preserve existing community bookmarks while giving the app its own landing page.
  if (hash === 'home') return 'community-home'
  if (hash === 'community') return 'discussion'
  return navigation.find(item => item.id === hash)?.id ?? 'my-home'
}
