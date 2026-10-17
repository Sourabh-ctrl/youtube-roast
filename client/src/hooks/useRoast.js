import { useCallback, useEffect, useState } from 'react'
import { apiError } from '../services/api.js'
import { fetchRoastJob } from '../services/roastService.js'

/**
 * Each step maps 1:1 to a stage the backend actually reports, so the UI shows
 * real progress rather than a fabricated animation.
 */
export const ROAST_STEPS = [
  {
    stage: 'checking_permissions',
    label: 'Checking account permissions',
    detail: 'Confirming your YouTube connection and scopes.',
  },
  {
    stage: 'fetching_metadata',
    label: 'Fetching your YouTube metadata',
    detail: 'Reading your liked videos, subscriptions, and playlists.',
  },
  {
    stage: 'analyzing',
    label: 'Analyzing your content interests',
    detail: 'Grouping categories, channels, and recurring keywords.',
  },
  {
    stage: 'generating',
    label: 'Generating the roast',
    detail: 'Asking the AI to write your personalized report.',
  },
  {
    stage: 'preparing_report',
    label: 'Preparing the report',
    detail: 'Validating and formatting the results.',
  },
]

const POLL_INTERVAL_MS = 1200

/**
 * Polls an already-started roast job. The job is created from an explicit user
 * action (the dashboard button) so mounting this hook can never double-start
 * generation, even under React StrictMode.
 */
export function useRoast(jobId, { intervalMs = POLL_INTERVAL_MS } = {}) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(() =>
    jobId
      ? { status: 'running', stage: 'queued', reportId: null, error: null }
      : {
          status: 'error',
          stage: 'failed',
          reportId: null,
          error: 'No roast is in progress. Start one from your dashboard.',
        },
  )

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    if (!jobId) return undefined

    let active = true
    let timer

    const poll = async () => {
      let current
      try {
        current = await fetchRoastJob(jobId)
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            stage: 'failed',
            reportId: null,
            error: apiError(error).message,
          })
        }
        return
      }

      if (!active) return

      if (current.status === 'ready') {
        setState({ status: 'ready', stage: 'ready', reportId: current.reportId, error: null })
        return
      }
      if (current.status === 'failed') {
        setState({
          status: 'error',
          stage: 'failed',
          reportId: null,
          error: current.error?.message ?? 'We could not generate your roast. Please try again.',
        })
        return
      }

      setState({ status: 'running', stage: current.stage, reportId: null, error: null })
      timer = window.setTimeout(poll, intervalMs)
    }

    poll()

    return () => {
      active = false
      if (timer) window.clearTimeout(timer)
    }
  }, [jobId, intervalMs, attempt])

  const activeIndex = Math.max(
    0,
    ROAST_STEPS.findIndex((step) => step.stage === state.stage),
  )

  return { ...state, activeIndex, retry }
}
