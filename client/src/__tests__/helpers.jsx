import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContext.js'

/**
 * Renders UI inside a MemoryRouter and a stub AuthContext so components that
 * read `useAuth` do not trigger real network calls. Override `auth` per test.
 */
export function renderWithProviders(ui, { auth, route = '/' } = {}) {
  const value = {
    status: 'ready',
    user: null,
    youtube: null,
    error: null,
    refresh: async () => ({ user: null }),
    login: () => {},
    logout: async () => {},
    disconnect: async () => {},
    ...auth,
  }

  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={value}>{ui}</AuthContext.Provider>
    </MemoryRouter>,
  )
}

export function makeAuthValue(overrides = {}) {
  return {
    status: 'ready',
    user: null,
    youtube: null,
    error: null,
    refresh: async () => ({ user: null }),
    login: () => {},
    logout: async () => {},
    disconnect: async () => {},
    ...overrides,
  }
}
