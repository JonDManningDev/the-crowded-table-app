import type { CommunityNotification } from './types'

// Existing in-memory inbox only. Clearing removes entries; it is not a remote
// read receipt, durable delivery service or app-scoped toast dispatcher.
export function readInitialCommunityNotifications(): string[] {
  return [
    'Welcome to your table. October is looking lovely.',
    'David P. requested a seat at Sunday birds & brunch.',
  ]
}
export function readCommunityNotifications(source: readonly string[]): CommunityNotification[] {
  return source.map(message => ({ message }))
}
export function addMockCommunityNotification(source: readonly string[], message: string): string[] {
  return [message, ...source]
}
export function markAllMockCommunityNotificationsRead(): string[] {
  return []
}
