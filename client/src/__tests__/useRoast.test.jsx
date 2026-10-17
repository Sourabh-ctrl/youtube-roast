import { describe, expect, it, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { ROAST_STEPS, useRoast } from '../hooks/useRoast.js'

vi.mock('../services/roastService.js', () => ({
  fetchRoastJob: vi.fn(),
}))

import { fetchRoastJob } from '../services/roastService.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('useRoast', () => {
  it('reports an error immediately when there is no job to poll', async () => {
    const { result } = renderHook(() => useRoast(undefined))
    expect(result.current.status).toBe('error')
    expect(result.current.error).toMatch(/no roast is in progress/i)
  })

  it('resolves to ready and exposes the report id', async () => {
    fetchRoastJob.mockResolvedValue({ status: 'ready', stage: 'ready', reportId: 'report-1' })

    const { result } = renderHook(() => useRoast('job-1'))

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.reportId).toBe('report-1')
    expect(result.current.error).toBeNull()
  })

  it('maps a running stage to the matching progress step', async () => {
    fetchRoastJob.mockResolvedValue({ status: 'running', stage: 'analyzing' })

    const { result } = renderHook(() => useRoast('job-1'))

    await waitFor(() => expect(result.current.activeIndex).toBe(2))
    expect(ROAST_STEPS[result.current.activeIndex].stage).toBe('analyzing')
  })

  it('surfaces a failed job with the backend message', async () => {
    fetchRoastJob.mockResolvedValue({
      status: 'failed',
      stage: 'failed',
      error: { code: 'AI_TIMEOUT', message: 'The roast took too long to generate.' },
    })

    const { result } = renderHook(() => useRoast('job-1'))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe('The roast took too long to generate.')
  })
})
