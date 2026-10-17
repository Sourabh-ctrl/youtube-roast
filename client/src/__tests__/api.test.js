import { describe, expect, it } from 'vitest'
import { apiError } from '../services/api.js'

describe('apiError', () => {
  it('passes through the server error envelope', () => {
    expect(
      apiError({ response: { data: { error: { code: 'YOUTUBE_QUOTA_EXCEEDED', message: 'quota' } } } }),
    ).toEqual({ code: 'YOUTUBE_QUOTA_EXCEEDED', message: 'quota' })
  })

  it('maps aborted requests to a timeout message', () => {
    expect(apiError({ code: 'ECONNABORTED' })).toEqual({
      code: 'TIMEOUT',
      message: 'The request timed out. Please try again.',
    })
  })

  it('falls back to a network error for unknown failures', () => {
    expect(apiError(new Error('boom')).code).toBe('NETWORK_ERROR')
    expect(apiError(undefined).code).toBe('NETWORK_ERROR')
  })
})
