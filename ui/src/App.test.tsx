import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import App from './App'
import { config } from './test/fixtures'
const auth = vi.hoisted(() => ({ authenticated: true, signOut: vi.fn() }))
vi.mock('@aws-amplify/ui-react', () => ({ Authenticator: ({ children, hideSignUp }: { children: (value: unknown) => ReactNode; hideSignUp: boolean }) => auth.authenticated ? children({ user: { userId: 'user-sub', username: 'hr@example.com' }, signOut: auth.signOut }) : <p>Sign in {hideSignUp && 'without registration'}</p> }))
vi.mock('./components/Employees', () => ({ default: () => <p>Protected employee records</p> }))
vi.mock('./components/HrRequests', () => ({ default: () => <p>Request forms</p> }))
vi.mock('./components/AgentChat', () => ({ default: () => <p>Assistant conversation</p> }))
describe('FR1 authenticated shell and NFR2 navigation', () => {
  it('shows staff navigation after sign-in and allows sign-out', () => {
    auth.authenticated = true; render(<App config={config} />)
    expect(screen.getByText('Protected employee records')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('nav-requests')); expect(screen.getByText('Request forms')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('sign-out')); expect(auth.signOut).toHaveBeenCalled()
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
  })
  it('does not render protected data before sign-in', () => { auth.authenticated = false; render(<App config={config} />); expect(screen.queryByText('Protected employee records')).not.toBeInTheDocument(); expect(screen.getByText(/without registration/)).toBeInTheDocument(); auth.authenticated = true })
  it('unmounts old screen state on navigation', () => { render(<App config={config} />); fireEvent.click(screen.getByTestId('nav-assistant')); expect(screen.queryByText('Protected employee records')).not.toBeInTheDocument(); expect(screen.getByText('Assistant conversation')).toBeInTheDocument() })
})
