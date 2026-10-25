import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MeetPlayPage } from './MeetPlayPage'
import { createMockTable, readMeetPlayContent, readMeetPlayTables } from '../api'
import { activities } from '../../../mock/data'
import type { CreateTableDraft } from '../types'

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
afterEach(cleanup)
function props() {
  return {
    content: readMeetPlayContent(), tables: readMeetPlayTables(activities, {}), matching: false,
    matchingPreferences: { availability: 'Saturday evening', game: 'Strategy games', style: 'Casual — here for good company', notes: '' },
    onOpenTable: vi.fn(), onCreateTable: vi.fn<(draft: CreateTableDraft) => string | null>().mockReturnValue(null), onSaveMatchingPreferences: vi.fn(),
  }
}

it('keeps filters when dialogs cancel but resets creation drafts and errors on reopening', () => {
  const input = props()
  input.onCreateTable.mockReturnValue('A creation error')
  render(<MeetPlayPage {...input}/>)
  fireEvent.change(screen.getByLabelText('Search tables'), { target: { value: 'Cascadia' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create a Table' }))
  let dialog = within(screen.getByRole('dialog'))
  fireEvent.change(dialog.getByLabelText('What are we playing?'), { target: { value: 'Draft title' } })
  fireEvent.click(dialog.getByLabelText('This is a private location'))
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(dialog.getByRole('alert').textContent).toBe('A creation error')
  fireEvent.click(dialog.getByRole('button', { name: 'Close dialog' }))
  expect((screen.getByLabelText('Search tables') as HTMLInputElement).value).toBe('Cascadia')
  fireEvent.click(screen.getByRole('button', { name: 'Create a Table' }))
  dialog = within(screen.getByRole('dialog'))
  expect((dialog.getByLabelText('What are we playing?') as HTMLInputElement).value).toBe('')
  expect((dialog.getByLabelText('This is a private location') as HTMLInputElement).checked).toBe(true)
  expect(dialog.queryByRole('alert')).toBeNull()
})

it('retains drafts after API validation errors and resets filters/view only after successful creation', () => {
  const input = props()
  input.onCreateTable.mockImplementation(draft => { const result = createMockTable(draft); return result.ok ? null : result.error })
  render(<MeetPlayPage {...input}/>)
  fireEvent.change(screen.getByLabelText('Search tables'), { target: { value: 'no result' } })
  fireEvent.change(screen.getByLabelText('Game type'), { target: { value: 'RPG' } })
  fireEvent.click(screen.getByLabelText('Beginner friendly'))
  fireEvent.click(screen.getByRole('button', { name: 'Create a Table' }))
  const dialog = within(screen.getByRole('dialog'))
  fireEvent.change(dialog.getByLabelText('What are we playing?'), { target: { value: '  My demo  ' } })
  fireEvent.change(dialog.getByLabelText('Exact meeting address (confirmed guests only)'), { target: { value: 'Fictional room 42' } })
  fireEvent.change(dialog.getByLabelText('Ends'), { target: { value: '15:00' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(dialog.getByRole('alert').textContent).toMatch(/End time must be after/)
  expect((dialog.getByLabelText('What are we playing?') as HTMLInputElement).value).toBe('  My demo  ')
  fireEvent.change(dialog.getByLabelText('Ends'), { target: { value: '19:00' } })
  fireEvent.change(dialog.getByLabelText('Tell us about your table'), { target: { value: 'A demo evening' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('button', { name: 'My Tables' }).getAttribute('aria-pressed')).toBe('true')
  expect((screen.getByLabelText('Search tables') as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('Game type') as HTMLSelectElement).value).toBe('All games')
  expect((screen.getByLabelText('Beginner friendly') as HTMLInputElement).checked).toBe(false)
})

it('discards cancelled matching edits, submits controlled values and uses saved props on reopening', () => {
  const input = props()
  const view = render(<MeetPlayPage {...input}/>)
  fireEvent.click(screen.getByRole('button', { name: 'Find my people' }))
  fireEvent.change(screen.getByLabelText('Anything else?'), { target: { value: 'Discard me' } })
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  expect(input.onSaveMatchingPreferences).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Find my people' }))
  expect((screen.getByLabelText('Anything else?') as HTMLTextAreaElement).value).toBe('')
  fireEvent.change(screen.getByLabelText('When would you like to play?'), { target: { value: 'Sunday afternoon' } })
  fireEvent.change(screen.getByLabelText('Anything else?'), { target: { value: 'Keep me' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  const saved = { ...input.matchingPreferences, availability: 'Sunday afternoon', notes: 'Keep me' }
  expect(input.onSaveMatchingPreferences).toHaveBeenCalledWith(saved)
  view.rerender(<MeetPlayPage {...input} matching matchingPreferences={saved}/>)
  fireEvent.click(screen.getByRole('button', { name: 'Update your preferences' }))
  expect((screen.getByLabelText('Anything else?') as HTMLTextAreaElement).value).toBe('Keep me')
  expect((screen.getByLabelText('When would you like to play?') as HTMLSelectElement).value).toBe('Sunday afternoon')
})
