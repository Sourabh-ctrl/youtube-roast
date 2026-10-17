import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ScoreCard from '../components/roast/ScoreCard.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import Loader from '../components/common/Loader.jsx'

describe('ScoreCard', () => {
  const report = { brainRotScore: 87, scoreExplanation: 'A playful heuristic.' }

  it('renders the score and label as entertainment, not measurement', () => {
    render(<ScoreCard report={report} />)
    expect(screen.getByText('87')).toBeInTheDocument()
    expect(screen.getByText('/ 100')).toBeInTheDocument()
    expect(screen.getByText(/AI-generated entertainment score/i)).toBeInTheDocument()
  })

  it('shows the illustrative badge only when flagged', () => {
    const { rerender } = render(<ScoreCard report={report} />)
    expect(screen.queryByText(/illustrative sample/i)).not.toBeInTheDocument()

    rerender(<ScoreCard report={report} illustrative />)
    expect(screen.getByText(/illustrative sample/i)).toBeInTheDocument()
  })
})

describe('ErrorMessage', () => {
  it('is announced as an alert and can retry', () => {
    const onRetry = vi.fn()
    render(<ErrorMessage message="Could not reach YouTube." onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach YouTube.')
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('omits the retry control when no handler is provided', () => {
    render(<ErrorMessage message="Something broke." />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('Loader', () => {
  it('is exposed as a status region with a label', () => {
    render(<Loader label="Loading your report…" />)
    expect(screen.getByRole('status')).toHaveTextContent(/loading your report/i)
  })
})
