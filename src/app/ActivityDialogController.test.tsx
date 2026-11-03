// @vitest-environment jsdom
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { ActivityDialogController } from './ActivityDialogController'
import { useMockState } from '../mock/useMockState'

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
})
afterEach(cleanup)
function Harness({ id = 'my-table', guest = false }: { id?: string; guest?: boolean }) {
  const model = useMockState(), [open, setOpen] = useState(true)
  return <><button onClick={() => setOpen(true)}>Open details</button><button onClick={() => model.setProfile({ ...model.profile, name: 'Changed community name' })}>Change author</button>
    <output aria-label="Snapshot">{JSON.stringify({ items: model.items, seats: model.seats, messages: model.messages, requests: model.requests })}</output>
    {open && <ActivityDialogController id={id} model={{ ...model, member: !guest }} onClose={() => setOpen(false)}/>}</>
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const snapshot = () => JSON.parse(screen.getByLabelText('Snapshot').textContent!)
it('renders nothing for an unknown activity', () => {
  render(<Harness id="missing"/>); expect(screen.queryByRole('dialog')).toBeNull()
})
it('owns checkout state and preserves back, confirmation, cancellation and reopen behavior', () => {
  render(<Harness id="azul" guest/> )
  click('Reserve for L125'); expect(screen.getByText('Your evening awaits')).toBeTruthy()
  click('Go back'); expect(screen.queryByText('Your evening awaits')).toBeNull()
  click('Reserve for L125'); click('Close dialog'); click('Open details')
  expect(screen.queryByText('Your evening awaits')).toBeNull()
  click('Reserve for L125'); click('Simulate payment & reserve')
  expect(screen.getByText('Your seat is confirmed')).toBeTruthy()
  expect(snapshot().items.find((item: { id: string }) => item.id === 'azul').filled).toBe(8)
  click('Close dialog'); click('Open details'); click('Cancel reservation')
  expect(snapshot().seats.azul).toBeUndefined()
  expect(snapshot().items.find((item: { id: string }) => item.id === 'azul').filled).toBe(7)
})
it('applies host decisions once, updates capacity and retains history across reopening', () => {
  render(<Harness/> )
  const before = snapshot().items.find((item: { id: string }) => item.id === 'my-table').filled
  click('Accept'); expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull()
  expect(snapshot().requests[0].status).toBe('accepted')
  expect(snapshot().items.find((item: { id: string }) => item.id === 'my-table').filled).toBe(before + 1)
  click('Close dialog'); click('Open details'); expect(screen.getByText('accepted')).toBeTruthy()
})
it('preserves blank drafts, trims sends, uses current community author and resets only the unsent draft on close', async () => {
  render(<Harness/> )
  const input = () => screen.getByRole('textbox', { name: 'Message your table' }) as HTMLInputElement
  expect(input().maxLength).toBe(1000); expect(input().required).toBe(true)
  fireEvent.change(input(), { target: { value: '   ' } }); fireEvent.submit(input().closest('form')!)
  expect(input().value).toBe('   '); expect(snapshot().messages['my-table']).toBeUndefined()
  fireEvent.change(input(), { target: { value: '  First hello  ' } }); fireEvent.submit(input().closest('form')!)
  expect(input().value).toBe(''); expect(screen.getByText('First hello')).toBeTruthy()
  click('Change author'); fireEvent.change(input(), { target: { value: 'Second hello' } }); click('Send')
  expect(snapshot().messages['my-table'][1]).toEqual({ author: 'Changed community name', text: 'Second hello' })
  fireEvent.change(input(), { target: { value: 'Unsent draft' } }); click('Close dialog'); click('Open details')
  expect(input().value).toBe(''); expect(screen.getByText('Second hello')).toBeTruthy()
  await act(async () => { fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true })) })
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('keeps conversation unavailable until a table seat is confirmed, then removes it after cancellation', () => {
  render(<Harness id="codenames"/> )
  expect(screen.queryByText('Table conversation')).toBeNull()
  click('Take a Seat'); expect(screen.getByText('Table conversation')).toBeTruthy()
  click('Cancel reservation'); expect(screen.queryByText('Table conversation')).toBeNull()
})
