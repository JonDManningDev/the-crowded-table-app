import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ChampionshipPage } from './ChampionshipPage'
import { readChampionshipContent, readChampionshipMatches, readChampionshipStandings } from '../api'

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
afterEach(cleanup)
function props() {
  return { content: readChampionshipContent(), standings: readChampionshipStandings([], 'Ana'), matches: [], isRegistered: false, isMemberPreview: true,
    onRegister: vi.fn(), onSubmitResult: vi.fn().mockReturnValue('Submitted feedback'), onConfirmResult: vi.fn().mockReturnValue('Confirmed feedback'), onDisputeResult: vi.fn() }
}

it('routes result actions through registration and closes entry without auto-opening a result draft', () => {
  const input = props()
  const view = render(<ChampionshipPage {...input}/>)
  fireEvent.click(screen.getByRole('button', { name: 'My Matches' }))
  fireEvent.click(screen.getByRole('button', { name: 'Register to play' }))
  expect(screen.getByRole('dialog').textContent).toContain('Your entry is included with membership.')
  fireEvent.click(screen.getByRole('button', { name: 'Count me in' }))
  expect(input.onRegister).toHaveBeenCalledOnce()
  expect(screen.queryByRole('dialog')).toBeNull()
  view.rerender(<ChampionshipPage {...input} isRegistered isMemberPreview={false}/>)
  expect(screen.getByRole('button', { name: 'My Matches' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Submit Result' }))
  expect(screen.getByRole('dialog').textContent).toContain('Record a good game')
})

it('preserves controlled drafts across preview changes but discards them on cancel/reopen', () => {
  const input = { ...props(), isRegistered: true }
  const view = render(<ChampionshipPage {...input}/>)
  fireEvent.click(screen.getByRole('button', { name: 'Submit a match result' }))
  fireEvent.change(screen.getByLabelText('Your score'), { target: { value: '123' } })
  fireEvent.change(screen.getByLabelText('Played with'), { target: { value: 'Carlos R.' } })
  view.rerender(<ChampionshipPage {...input} isMemberPreview={false}/>)
  expect((screen.getByLabelText('Your score') as HTMLInputElement).value).toBe('123')
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  expect(input.onSubmitResult).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Submit a match result' }))
  expect((screen.getByLabelText('Your score') as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('Played with') as HTMLSelectElement).value).toBe('Lucía M.')
  expect(screen.getByLabelText('Date played').getAttribute('min')).toBe('2026-10-01')
  expect(screen.getByLabelText('Date played').getAttribute('max')).toBe('2026-10-24')
  expect(screen.getByLabelText('Your score').getAttribute('max')).toBe('300')
})

it('submits supplied drafts, selects matches and retains feedback across view changes', () => {
  const input = { ...props(), isRegistered: true }
  render(<ChampionshipPage {...input}/>)
  fireEvent.click(screen.getByRole('button', { name: 'Submit a match result' }))
  fireEvent.change(screen.getByLabelText('Your score'), { target: { value: '123' } })
  fireEvent.change(screen.getByLabelText('Opponent’s score'), { target: { value: '100' } })
  fireEvent.change(screen.getByLabelText('Played with'), { target: { value: 'Valeria G.' } })
  fireEvent.change(screen.getByLabelText('Date played'), { target: { value: '2026-10-05' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(input.onSubmitResult).toHaveBeenCalledWith({ opponent: 'Valeria G.', date: '2026-10-05', score: '123', opponentScore: '100' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('button', { name: 'My Matches' }).getAttribute('aria-pressed')).toBe('true')
  expect(within(screen.getByRole('status')).getByText('Submitted feedback')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Past Champions' }))
  fireEvent.click(screen.getByRole('button', { name: 'My Matches' }))
  expect(screen.getByRole('status').textContent).toBe('Submitted feedback')
})

it('uses API-projected eligibility to display review actions and self-waiting presentation', () => {
  const matches = readChampionshipMatches([
    { id: 'incoming', author: 'Lucía M.', opponent: 'You', score: 120, opponentScore: 100, status: 'pending', date: '2026-10-03' },
    { id: 'self', author: 'You', opponent: 'Carlos R.', score: 120, opponentScore: 100, status: 'pending', date: '2026-10-04' },
  ], 'Ana')
  const input = props()
  render(<ChampionshipPage {...input} isRegistered matches={matches}/>)
  fireEvent.click(screen.getByRole('button', { name: 'My Matches' }))
  expect(screen.getAllByRole('button', { name: 'Confirm' })).toHaveLength(1)
  expect(screen.getByText('You cannot confirm your own result.', { exact: false })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  expect(input.onConfirmResult).toHaveBeenCalledWith('incoming')
  expect(screen.getByRole('status').textContent).toBe('Confirmed feedback')
})
