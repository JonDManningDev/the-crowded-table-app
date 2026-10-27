// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
})
afterEach(cleanup)
import { MembershipPreviewModal } from './MembershipPreviewModal'
it('renders both controlled preview variants and delegates change/close without creating membership state', () => {
  const change = vi.fn(), close = vi.fn()
  const props = { benefits: ['Supplied benefit'], onChangePreview: change, onClose: close }
  const view = render(<MembershipPreviewModal {...props} isMemberPreview/> )
  expect(screen.getByText('Supplied benefit')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Preview without membership' }))
  expect(change).toHaveBeenCalledOnce(); expect(screen.getByRole('dialog')).toBeTruthy()
  view.rerender(<MembershipPreviewModal {...props} isMemberPreview={false}/> )
  expect(screen.getByRole('dialog', { name: 'Pull up a chair. Stay a while.' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Try the member experience' }))
  expect(change).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' })); expect(close).toHaveBeenCalledOnce()
})
