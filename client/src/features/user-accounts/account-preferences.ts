export const accountPreferenceFields = ['user_is_discoverable', 'enable_matchmaking', 'allow_direct_messages'] as const
export type AccountPreferences = Record<(typeof accountPreferenceFields)[number], boolean>
export const preferencesPath = '/api/me/preferences'
