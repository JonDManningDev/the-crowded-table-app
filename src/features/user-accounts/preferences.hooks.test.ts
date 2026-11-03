import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useAccountPreferences } from './hooks'

const api = vi.hoisted(() => ({ readAccountPreferences: vi.fn(), saveAccountPreferences: vi.fn() }))
vi.mock('./api', () => api)
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('blocks duplicate synchronous saves and draft edits during a pending save', async () => {
  const preferences = { user_is_discoverable: true, enable_matchmaking: false, allow_direct_messages: true }
  api.readAccountPreferences.mockResolvedValue(preferences)
  let resolve!: () => void
  api.saveAccountPreferences.mockImplementation(() => new Promise<void>(done => { resolve = done }))
  const { result } = renderHook(() => useAccountPreferences('viewer'))
  await waitFor(() => expect(result.current.preferences).toEqual(preferences))
  await act(async () => {
    void result.current.savePreferences()
    void result.current.savePreferences()
    result.current.changePreference('allow_direct_messages', false)
  })
  expect(api.saveAccountPreferences).toHaveBeenCalledExactlyOnceWith('viewer', preferences)
  expect(result.current.preferences).toEqual(preferences)
  expect(result.current.isSaving).toBe(true)
  await act(async () => { resolve() })
  expect(result.current.isSaved).toBe(true)
  expect(result.current.isSaving).toBe(false)
})

it('ignores a rejected read after unmount', async () => {
  let rejectRead!: (error: Error) => void
  api.readAccountPreferences.mockImplementation(() => new Promise((_resolve, reject) => { rejectRead = reject }))
  const { unmount } = renderHook(() => useAccountPreferences('viewer'))
  unmount()
  await act(async () => { rejectRead(new Error('offline')) })
  expect(api.saveAccountPreferences).not.toHaveBeenCalled()
})

it('ignores a rejected save after unmount', async () => {
  api.readAccountPreferences.mockResolvedValue({ user_is_discoverable: true, enable_matchmaking: true, allow_direct_messages: true })
  let rejectSave!: (error: Error) => void
  api.saveAccountPreferences.mockImplementation(() => new Promise((_resolve, reject) => { rejectSave = reject }))
  const { result, unmount } = renderHook(() => useAccountPreferences('viewer'))
  await waitFor(() => expect(result.current.preferences).toBeTruthy())
  await act(async () => { void result.current.savePreferences() })
  unmount()
  await act(async () => { rejectSave(new Error('offline')) })
  expect(api.saveAccountPreferences).toHaveBeenCalledOnce()
})

