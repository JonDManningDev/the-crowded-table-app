// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CommunityGuestGate } from './CommunityGuestGate'
afterEach(cleanup)
it.each([['meet-play', 'Your people are here.'], ['discussion', 'Come into the conversation.']] as const)('preserves %s wording and delegates opening the preview', (variant, heading) => {
  const open = vi.fn(); render(<CommunityGuestGate variant={variant} onOpenMembership={open}/> )
  expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Become a Member' })); expect(open).toHaveBeenCalledOnce()
})
