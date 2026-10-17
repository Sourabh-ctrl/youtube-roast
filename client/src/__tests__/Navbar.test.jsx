import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import Navbar from '../components/layout/Navbar.jsx'
import { renderWithProviders } from './helpers.jsx'

const CTA = 'http://localhost:5000/auth/google'

describe('Navbar', () => {
  it('shows the sign-in call to action when signed out', () => {
    renderWithProviders(<Navbar ctaHref={CTA} />, { auth: { status: 'ready', user: null } })

    expect(screen.getByRole('link', { name: /get roasted/i })).toHaveAttribute('href', CTA)
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument()
  })

  it('shows a dashboard link when signed in', () => {
    renderWithProviders(<Navbar ctaHref={CTA} />, {
      auth: { status: 'ready', user: { displayName: 'Tester' } },
    })

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.queryByRole('link', { name: /get roasted/i })).not.toBeInTheDocument()
  })

  it('exposes an accessible, stateful mobile menu toggle', () => {
    renderWithProviders(<Navbar ctaHref={CTA} />, {
      auth: { status: 'ready', user: null },
    })

    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    const closeButton = screen.getByRole('button', { name: 'Close menu' })
    expect(closeButton).toHaveAttribute('aria-expanded', 'true')
    // Desktop and mobile navigation both render now, hence getAllBy.
    expect(screen.getAllByRole('link', { name: 'Privacy' }).length).toBeGreaterThan(1)
  })
})
