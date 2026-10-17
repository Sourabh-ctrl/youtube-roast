import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'
import { AuthContext } from '../context/authContext.js'
import { makeAuthValue } from './helpers.jsx'

function renderApp(route, auth) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={makeAuthValue(auth)}>
        <App />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('route protection', () => {
  it('shows a loader while the session is still loading', () => {
    renderApp('/dashboard', { status: 'loading', user: null })
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i)
  })

  it('redirects an unauthenticated visitor to the landing page', () => {
    renderApp('/dashboard', { status: 'ready', user: null })

    expect(
      screen.getByRole('heading', { level: 1, name: /your youtube history/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^hey /i })).not.toBeInTheDocument()
  })

  it('renders the dashboard for an authenticated user', () => {
    renderApp('/dashboard', {
      status: 'ready',
      user: { displayName: 'Tester Kim', email: 't@example.com', avatarUrl: 'http://avatar' },
      youtube: { connected: false },
    })

    expect(screen.getByRole('heading', { name: /hey tester/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /generate your roast/i })).toBeInTheDocument()
  })

  it('renders a 404 page for unknown routes', () => {
    renderApp('/nope', { status: 'ready', user: null })
    expect(screen.getByText('404')).toBeInTheDocument()
  })
})
