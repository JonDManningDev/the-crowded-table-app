// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useCommunityCreation } from './hooks'
import type { CommunityCreationSummary } from './types'

const api = vi.hoisted(() => ({ createCommunity: vi.fn(), readCommunityCreationOptions: vi.fn() }))
vi.mock('./api', () => api)
const summary = (name = 'Fictional club'): CommunityCreationSummary => ({ id: 'server-uuid', name, slug: 'fictional-club', locationLabel: 'Honduras', timezone: 'UTC' })
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
beforeEach(() => {
  vi.resetAllMocks()
  api.readCommunityCreationOptions.mockReturnValue({ countries: [{ code: 'HN', name: 'Honduras' }], timezones: ['UTC'], initialTimezone: 'UTC', isConfigured: true })
  api.createCommunity.mockResolvedValue(summary())
})
afterEach(cleanup)
function valid(result: { current: ReturnType<typeof useCommunityCreation> }) {
  act(() => {
    result.current.changeDraft('name', 'Fictional club')
    result.current.changeDraft('slug', 'fictional-club')
    result.current.changeDraft('country', 'HN')
    result.current.changeDraft('displayName', 'Player')
  })
}
it('initializes once, validates before requesting, and preserves draft through parent rerenders', async () => {
  const notify = vi.fn()
  const { result, rerender } = renderHook(() => useCommunityCreation('viewer', notify))
  expect(result.current.draft).toMatchObject({ timezone: 'UTC', displayName: '', name: '' })
  await act(async () => { expect(await result.current.submitCommunity()).toBe(false) })
  expect(result.current.error).toContain('community name')
  expect(api.createCommunity).not.toHaveBeenCalled()
  expect(notify).not.toHaveBeenCalled()
  valid(result)
  act(() => result.current.changeDraft('displayName', 'Player'))
  rerender()
  expect(result.current.draft).toMatchObject({ name: 'Fictional club', displayName: 'Player' })
  expect(api.readCommunityCreationOptions).toHaveBeenCalledOnce()
})
it('blocks immediate duplicates, retains failed drafts and releases busy for an explicit retry', async () => {
  const request = deferred<CommunityCreationSummary>(), notify = vi.fn()
  api.createCommunity.mockReturnValueOnce(request.promise)
  const { result } = renderHook(() => useCommunityCreation('viewer', notify))
  valid(result)
  act(() => result.current.changeDraft('displayName', 'Player'))
  let first!: Promise<boolean>, duplicate!: Promise<boolean>
  act(() => { first = result.current.submitCommunity(); duplicate = result.current.submitCommunity() })
  expect(await duplicate).toBe(false)
  expect(api.createCommunity).toHaveBeenCalledOnce()
  expect(notify.mock.calls).toEqual([[true]])
  expect(result.current.isCreating).toBe(true)
  await act(async () => { request.reject(new Error('Collision recovery')); expect(await first).toBe(false) })
  expect(result.current).toMatchObject({ isCreating: false, error: 'Collision recovery', savedCommunity: null })
  expect(result.current.draft).toMatchObject({ name: 'Fictional club', displayName: 'Player' })
  expect(notify.mock.calls).toEqual([[true], [false]])
  await act(async () => { expect(await result.current.submitCommunity()).toBe(true) })
  expect(result.current.error).toBe('')
  expect(result.current.savedCommunity).toEqual(summary())
  expect(api.createCommunity).toHaveBeenCalledTimes(2)
  await act(async () => { expect(await result.current.submitCommunity()).toBe(false) })
  expect(api.createCommunity).toHaveBeenCalledTimes(2)
})
it('does not create or contribute busy state when configuration is unavailable', async () => {
  api.readCommunityCreationOptions.mockReturnValue({ countries: [], timezones: ['UTC'], initialTimezone: 'UTC', isConfigured: false })
  const notify = vi.fn(), { result } = renderHook(() => useCommunityCreation('viewer', notify))
  valid(result)
  await act(async () => { expect(await result.current.submitCommunity()).toBe(false) })
  expect(result.current.error).toContain('not configured')
  expect(api.createCommunity).not.toHaveBeenCalled()
  expect(notify).not.toHaveBeenCalled()
})
it.each(['resolve', 'reject'] as const)('releases an unmounted owner once and ignores its late %s while a new owner is pending', async completion => {
  const old = deferred<CommunityCreationSummary>(), current = deferred<CommunityCreationSummary>(), notify = vi.fn()
  api.createCommunity.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
  const first = renderHook(() => useCommunityCreation('viewer', notify))
  valid(first.result)
  let oldAction!: Promise<boolean>, newAction!: Promise<boolean>
  act(() => { oldAction = first.result.current.submitCommunity() })
  first.unmount()
  expect(notify.mock.calls).toEqual([[true], [false]])
  const second = renderHook(() => useCommunityCreation('viewer', notify))
  valid(second.result)
  act(() => { newAction = second.result.current.submitCommunity() })
  await act(async () => {
    if (completion === 'resolve') old.resolve(summary('Old owner'))
    else old.reject(new Error('Old failure'))
    expect(await oldAction).toBe(false)
  })
  expect(notify.mock.calls).toEqual([[true], [false], [true]])
  expect(second.result.current).toMatchObject({ isCreating: true, savedCommunity: null, error: '' })
  await act(async () => { current.resolve(summary('Current owner')); expect(await newAction).toBe(true) })
  expect(second.result.current.savedCommunity?.name).toBe('Current owner')
  expect(notify.mock.calls).toEqual([[true], [false], [true], [false]])
})
it('survives Strict Mode setup and retains the initiating busy callback across prop changes', async () => {
  const request = deferred<CommunityCreationSummary>(), original = vi.fn(), replacement = vi.fn()
  api.createCommunity.mockReturnValue(request.promise)
  const { result, rerender } = renderHook(({ notify }) => useCommunityCreation('viewer', notify), {
    initialProps: { notify: original }, wrapper: StrictMode,
  })
  valid(result)
  let action!: Promise<boolean>
  act(() => { action = result.current.submitCommunity() })
  rerender({ notify: replacement })
  expect(result.current.isCreating).toBe(true)
  await act(async () => { request.resolve(summary()); expect(await action).toBe(true) })
  expect(original.mock.calls).toEqual([[true], [false]])
  expect(replacement).not.toHaveBeenCalled()
})
