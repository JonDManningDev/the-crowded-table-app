import { useEffect, useRef, useState } from 'react'
import { createCommunity, readCommunityCreationOptions } from './api'
import { getCommunityCreationError, validateCommunityCreation } from './creation'
import type { CommunityCreationDraft, CommunityCreationSummary } from './types'

export function useCommunityCreation(onBusyChange: (busy: boolean) => void) {
  const [options] = useState(readCommunityCreationOptions)
  const [draft, setDraft] = useState<CommunityCreationDraft>(() => ({
    name: '', slug: '', country: '', region: '', city: '', timezone: options.initialTimezone, join: false,
  }))
  const [savedCommunity, setSavedCommunity] = useState<CommunityCreationSummary | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [submissionAttempt, setSubmissionAttempt] = useState(0)
  const lifetimeRef = useRef<{ active: boolean } | null>(null)
  const pendingRef = useRef<{ lifetime: { active: boolean }; notifyBusy: (busy: boolean) => void } | null>(null)

  useEffect(() => {
    const lifetime = { active: true }
    lifetimeRef.current = lifetime
    return () => {
      lifetime.active = false
      const pending = pendingRef.current
      if (pending?.lifetime === lifetime) {
        pendingRef.current = null
        pending.notifyBusy(false)
      }
    }
  }, [])

  function changeDraft<Key extends keyof CommunityCreationDraft>(key: Key, value: CommunityCreationDraft[Key]) {
    setDraft(previous => ({ ...previous, [key]: value }))
  }
  async function submitCommunity() {
    const lifetime = lifetimeRef.current
    if (!lifetime?.active || pendingRef.current || savedCommunity) return false
    setSubmissionAttempt(previous => previous + 1)
    const invalid = validateCommunityCreation(draft)
    if (invalid) { setError(invalid); return false }
    if (!options.isConfigured) {
      setError('Account services are not configured yet. Please try again later.')
      return false
    }
    const request = { lifetime, notifyBusy: onBusyChange }
    pendingRef.current = request
    setIsCreating(true)
    request.notifyBusy(true)
    setError('')
    try {
      const summary = await createCommunity({ ...draft })
      if (!lifetime.active || pendingRef.current !== request) return false
      setSavedCommunity(summary)
      return true
    } catch (failure) {
      if (lifetime.active && pendingRef.current === request) {
        setError(failure instanceof Error ? failure.message : getCommunityCreationError({}))
      }
      return false
    } finally {
      // Cleanup already released an unmounted owner's contribution. Never let
      // its late completion release another request or another Auth action.
      if (pendingRef.current === request) {
        pendingRef.current = null
        if (lifetime.active) {
          setIsCreating(false)
          request.notifyBusy(false)
        }
      }
    }
  }
  return { draft, options, savedCommunity, isCreating, error, submissionAttempt, changeDraft, submitCommunity }
}
