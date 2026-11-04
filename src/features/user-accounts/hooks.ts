import { useContext, useEffect, useRef, useState } from 'react'
import { AccountContext } from './accountContext'
import { readOwnProfile, saveOwnProfile, readAccountPreferences, saveAccountPreferences,
  readMyCommunities, toCommunityCards } from './api'
import type { AccountPreferences, CommunityCardData, CommunityFilter } from './types'

export function useAccount() {
  return useContext(AccountContext)
}

function initialProfileState(userId?: string) {
  return { userId, displayName: '', bio: '', profileLoading: Boolean(userId), profileError: '' }
}

// Invoked once at the app/auth boundary; AccountContext shares this instance.
export function useUserAccount(userId?: string) {
  const [profile, setProfile] = useState(() => initialProfileState(userId))
  const lifecycle = useRef<{ userId: string; active: boolean; revision: number } | null>(null)
  // Reset before rendering another identity, while leaving refreshes of the same user alone.
  if (profile.userId !== userId) setProfile(initialProfileState(userId))
  useEffect(() => {
    if (!userId) return
    const request = { userId, active: true, revision: 0 }
    lifecycle.current = request
    void readOwnProfile(userId).then(result => {
      // A completed save takes precedence over an older profile read.
      if (request.active && request.revision === 0 && result) setProfile(previous => ({
        ...previous, displayName: result.display_name, bio: result.bio || '',
      }))
    }).catch(() => {
      if (request.active && request.revision === 0) setProfile(previous => ({ ...previous,
        profileError: 'Your account profile could not be loaded. Please reload to try again.',
      }))
    }).finally(() => {
      if (request.active) setProfile(previous => ({ ...previous, profileLoading: false }))
    })
    return () => { request.active = false }
  }, [userId])

  async function saveProfile(name: string, bio: string) {
    const request = lifecycle.current
    if (!userId || !request?.active || request.userId !== userId) throw new Error('Sign in to save your account profile.')
    await saveOwnProfile(userId, name, bio)
    if (request.active) {
      request.revision += 1
      setProfile(previous => ({ ...previous, displayName: name.trim(), bio: bio.trim(), profileError: '' }))
    }
  }

  return { displayName: profile.displayName, bio: profile.bio, profileLoading: profile.profileLoading,
    profileError: profile.profileError, saveProfile }
}

function initialPreferencesState(userId?: string) {
  return {
    userId,
    preferences: null as AccountPreferences | null,
    isLoading: Boolean(userId),
    isSaving: false,
    loadError: '',
    saveError: '',
    isSaved: false,
  }
}

export function useAccountPreferences(userId?: string) {
  const [state, setState] = useState(() => initialPreferencesState(userId))
  const lifecycle = useRef<{ userId: string; active: boolean; saving: boolean } | null>(null)

  // Reset before rendering a different account, without exposing its predecessor's draft.
  if (state.userId !== userId) setState(initialPreferencesState(userId))

  useEffect(() => {
    if (!userId) return
    const request = { userId, active: true, saving: false }
    lifecycle.current = request
    void readAccountPreferences(userId).then(preferences => {
      if (request.active) setState(previous => ({ ...previous, preferences, isLoading: false }))
    }).catch(() => {
      if (request.active) setState(previous => ({
        ...previous,
        isLoading: false,
        loadError: 'Your account preferences could not be loaded. Reload to try again.',
      }))
    })
    return () => { request.active = false }
  }, [userId])

  function changePreference(key: keyof AccountPreferences, checked: boolean) {
    const request = lifecycle.current
    if (!request?.active || request.userId !== userId || request.saving) return
    setState(previous => previous.preferences ? {
      ...previous,
      preferences: { ...previous.preferences, [key]: checked },
      isSaved: false,
    } : previous)
  }

  async function savePreferences() {
    const request = lifecycle.current
    if (!request?.active || request.userId !== userId || request.saving || !state.preferences || state.userId !== userId) return
    // Guard repeated events even before React renders the disabled button.
    request.saving = true
    setState(previous => ({ ...previous, isSaving: true, saveError: '', isSaved: false }))
    try {
      await saveAccountPreferences(request.userId, state.preferences)
      if (request.active) setState(previous => ({ ...previous, isSaved: true }))
    } catch {
      if (request.active) setState(previous => ({
        ...previous,
        saveError: 'Your preferences could not be saved. Please try again.',
      }))
    } finally {
      request.saving = false
      if (request.active) setState(previous => ({ ...previous, isSaving: false }))
    }
  }

  return {
    preferences: state.preferences,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    loadError: state.loadError,
    saveError: state.saveError,
    isSaved: state.isSaved,
    changePreference,
    savePreferences,
  }
}


export function useAccountCommunities(userId?: string) {
  const [selection, setSelection] = useState<{ userId?: string; filter: CommunityFilter }>({ filter: 'all' })
  const filter = selection.userId === userId ? selection.filter : 'all'
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${userId || ''}:${filter}:${attempt}`
  const [result, setResult] = useState<{ key: string; rows: CommunityCardData[]; error: string }>()
  const [previousUserId, setPreviousUserId] = useState(userId)
  if (previousUserId !== userId) {
    setPreviousUserId(userId)
    setResult(undefined)
    setSelection({ userId, filter: 'all' })
  }
  useEffect(() => {
    if (!userId) return
    let active = true
    void readMyCommunities(filter).then(rows => {
      if (active) setResult({ key: requestKey, rows: toCommunityCards(rows), error: '' })
    }).catch((error: unknown) => {
      if (active) setResult({ key: requestKey, rows: [], error: error instanceof Error ? error.message : 'We couldn’t load your communities. Please try again.' })
    })
    return () => { active = false }
  }, [userId, filter, requestKey])
  const current = result?.key === requestKey ? result : undefined
  function changeFilter(value: CommunityFilter) {
    setSelection({ userId, filter: value })
    setAttempt(previous => previous + 1)
  }
  function retry() { setAttempt(previous => previous + 1) }
  return { filter, communities: current?.rows || [], isLoading: Boolean(userId && !current),
    loadError: current?.error || '', changeFilter, retry }
}
