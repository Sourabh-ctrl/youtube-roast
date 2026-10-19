import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import LandingPage from '../pages/LandingPage.jsx'
import { renderWithProviders } from './helpers.jsx'

describe('LandingPage', () => {
  it('renders the hero heading and primary call to action', () => {
    renderWithProviders(<LandingPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: /your youtube history/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /get roasted/i }).length).toBeGreaterThan(0)
  })

  it('exposes the main navigation links', () => {
    renderWithProviders(<LandingPage />)

    const header = screen.getByRole('banner')
    expect(within(header).getByRole('link', { name: 'How it works' })).toBeInTheDocument()
    expect(within(header).getByRole('link', { name: 'Features' })).toBeInTheDocument()
    expect(within(header).getByRole('link', { name: 'Privacy' })).toBeInTheDocument()
  })

  it('links to the privacy and terms pages from the footer', () => {
    renderWithProviders(<LandingPage />)

    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy',
    )
    expect(within(footer).getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  })

  it('labels the illustrative report preview as sample data', () => {
    renderWithProviders(<LandingPage />)

    expect(
      screen.getByRole('heading', { name: /a taste of your report/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/illustrative sample/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Brain Rot Score/i).length).toBeGreaterThan(0)
  })

  it('communicates the privacy framing', () => {
    renderWithProviders(<LandingPage />)

    expect(
      screen.getAllByText(/not a scientific personality assessment/i).length,
    ).toBeGreaterThan(0)
  })
})
