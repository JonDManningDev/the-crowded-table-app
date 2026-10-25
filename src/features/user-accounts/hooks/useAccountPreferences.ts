import { useEffect, useRef, useState } from 'react'
import { readAccountPreferences, saveAccountPreferences } from '../api'
import type { AccountPreferences } from '../types'

function initialState(userId?: string) {
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
  const [state, setState] = useState(() => initialState(userId))
  const lifecycle = useRef<{ userId: string; active: boolean; saving: boolean } | null>(null)

  // Reset before rendering a different account, without exposing its predecessor's draft.
  if (state.userId !== userId) setState(initialState(userId))

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
