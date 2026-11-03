// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
})
afterEach(cleanup)
import { CommunityNotificationsModal } from './CommunityNotificationsModal'
it('preserves supplied order/duplicates and delegates clearing without mutating controlled content', () => {
  const clear = vi.fn(), close = vi.fn(), notices = [{ message: 'Newest' }, { message: 'Duplicate' }, { message: 'Duplicate' }]
  render(<CommunityNotificationsModal isMemberPreview notices={notices} onMarkAllRead={clear} onClose={close}/> )
  expect(screen.getAllByText('Duplicate')).toHaveLength(2)
  expect([...document.querySelectorAll('dialog p')].map(p => p.textContent)).toEqual(['Newest','Duplicate','Duplicate'])
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' })); expect(clear).toHaveBeenCalledOnce()
  expect(notices).toHaveLength(3); expect(screen.getByText('Newest')).toBeTruthy()
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true })); expect(close).toHaveBeenCalledOnce()
})
it('keeps guest notices private in presentation and supports the controlled empty state', () => {
  const clear = vi.fn(), close = vi.fn()
  const view = render(<CommunityNotificationsModal isMemberPreview={false} notices={[{ message: 'Hidden notice' }]} onMarkAllRead={clear} onClose={close}/> )
  expect(screen.queryByText('Hidden notice')).toBeNull(); expect(screen.queryByRole('button', { name: 'Mark all as read' })).toBeNull()
  expect(screen.getByText(/Member-table notifications are private/)).toBeTruthy()
  view.rerender(<CommunityNotificationsModal isMemberPreview notices={[]} onMarkAllRead={clear} onClose={close}/> )
  expect(screen.getByText(/You’re all caught up/)).toBeTruthy(); expect(clear).not.toHaveBeenCalled()
})
