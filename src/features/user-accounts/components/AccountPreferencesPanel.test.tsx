import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AccountPreferencesPanel } from './AccountPreferencesPanel'
import { PremiumFeaturesPanel } from './PremiumFeaturesPanel'
import { MemoryRouter } from 'react-router'

afterEach(cleanup)

it('renders controlled values and reports switch/save intent without owning the draft', () => {
  const onPreferenceChange = vi.fn()
  const onSave = vi.fn()
  render(<AccountPreferencesPanel preferences={{ user_is_discoverable: false, enable_matchmaking: true, allow_direct_messages: false }}
    isLoading={false} isSaving={false} loadError="" saveError="" isSaved={false}
    onPreferenceChange={onPreferenceChange} onSave={onSave}/>)
  const search = screen.getByRole('switch', { name: /Appear in global/ }) as HTMLInputElement
  fireEvent.click(search)
  expect(onPreferenceChange).toHaveBeenCalledWith('user_is_discoverable', true)
  expect(search.checked).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Save account preferences' }))
  expect(onSave).toHaveBeenCalledOnce()
})

it('renders supplied premium data and destinations without an account provider', () => {
  render(<MemoryRouter><PremiumFeaturesPanel features={[{ id: 'custom', name: 'Supplied placeholder', detail: 'Fixture detail' }]}
    canManage={true} manageTo="/manage-placeholder" exploreTo="/explore-placeholder"/></MemoryRouter>)
  expect(screen.getByText('Supplied placeholder')).toBeTruthy()
  expect(screen.queryByText('Community ownership')).toBeNull()
  expect(screen.getByRole('link', { name: 'Manage' }).getAttribute('href')).toBe('/manage-placeholder')
  expect(screen.getByRole('link', { name: 'Explore Premium Features' }).getAttribute('href')).toBe('/explore-placeholder')
})
