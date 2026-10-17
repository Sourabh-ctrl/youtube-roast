import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
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

    expect(screen.getByRole('link', { name: 'How it works' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Features' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy' })).toBeInTheDocument()
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
