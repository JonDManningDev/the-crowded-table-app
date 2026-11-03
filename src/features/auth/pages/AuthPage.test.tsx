// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { AuthPage } from './AuthPage'
import { AuthFeedback } from '../components/AuthFeedback'

afterEach(cleanup)
const props = () => ({ view: 'signup' as const, email: 'sample@example.test', ready: true, configured: true, busy: false,
  error: '', notice: '', cooldown: 0, canResetPassword: true, onEmailChange: vi.fn(), onSubmit: vi.fn(event => event.preventDefault()), onResend: vi.fn(event => event.preventDefault()) })
it('preserves native password lifetime between credential views and removes it for recovery', () => {
  const supplied = props()
  const { rerender } = render(<MemoryRouter><AuthPage {...supplied}/></MemoryRouter>)
  const password = screen.getByLabelText(/Password/) as HTMLInputElement
  fireEvent.change(password, { target: { value: 'fictional-draft-password' } })
  expect(password.minLength).toBe(12)
  expect(password.autocomplete).toBe('new-password')
  rerender(<MemoryRouter><AuthPage {...supplied} view="signin"/></MemoryRouter>)
  expect(screen.getByLabelText('Password')).toBe(password)
  expect(password.value).toBe('fictional-draft-password')
  expect(password.hasAttribute('minlength')).toBe(false)
  expect(password.autocomplete).toBe('current-password')
  rerender(<MemoryRouter><AuthPage {...supplied} view="forgot"/></MemoryRouter>)
  expect(screen.queryByLabelText('Password')).toBeNull()
  rerender(<MemoryRouter><AuthPage {...supplied} view="signin"/></MemoryRouter>)
  expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('')
})
it('forwards controlled email/resend actions and presents cooldown/busy/unconfigured states', () => {
  const supplied = props()
  const { rerender } = render(<MemoryRouter><AuthPage {...supplied} view="check"/></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'next@example.test' } })
  expect(supplied.onEmailChange).toHaveBeenCalledWith('next@example.test')
  expect((screen.getByLabelText('Email address') as HTMLInputElement).value).toBe('sample@example.test')
  fireEvent.submit(document.querySelector('form')!)
  expect(supplied.onResend).toHaveBeenCalledOnce()
  rerender(<MemoryRouter><AuthPage {...supplied} view="check" cooldown={60}/></MemoryRouter>)
  expect((screen.getByRole('button', { name: 'Resend in 60s' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByLabelText('Email address') as HTMLInputElement).disabled).toBe(false)
  rerender(<MemoryRouter><AuthPage {...supplied} busy/></MemoryRouter>)
  expect((screen.getByLabelText('Email address') as HTMLInputElement).disabled).toBe(true)
  expect(screen.queryByRole('link')).toBeNull()
  expect(screen.getByText('Please wait…', { selector: 'span' })).toBeTruthy()
  rerender(<MemoryRouter><AuthPage {...supplied} configured={false}/></MemoryRouter>)
  expect(screen.getByRole('alert').textContent).toContain('not configured')
  expect((screen.getByRole('button', { name: 'Create Account' }) as HTMLButtonElement).disabled).toBe(true)
})
it('preserves invalid-link recovery, destination links and feedback precedence/roles', () => {
  const supplied = props()
  const { rerender } = render(<MemoryRouter><AuthPage {...supplied} view="reset" canResetPassword={false} error="Expired link"/></MemoryRouter>)
  expect(screen.queryByLabelText('New password')).toBeNull()
  expect(screen.getByRole('link', { name: 'Request a new reset link' }).getAttribute('href')).toBe('/auth/forgot-password')
  expect(screen.getByRole('link', { name: 'Back to My Home' }).getAttribute('href')).toBe('/account/home')
  expect(screen.getByRole('alert').textContent).toBe('Expired link')
  rerender(<AuthFeedback error="Specific failure" notice="Earlier success" placement="shell"/>)
  expect(screen.getByRole('alert').textContent).toBe('Specific failure')
  expect(screen.queryByRole('status')).toBeNull()
  rerender(<AuthFeedback error="" notice="Action completed" placement="shell"/>)
  expect(screen.getByRole('status').textContent).toBe('Action completed')
})
