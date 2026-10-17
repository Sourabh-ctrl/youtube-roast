import { describe, expect, it } from 'vitest'
import { redact } from '../../src/utils/logger.js'

describe('logger redaction', () => {
  it('redacts anything that looks like a credential', () => {
    const redacted = redact({
      access_token: 'secret-access',
      refresh_token: 'secret-refresh',
      id_token: 'secret-id',
      client_secret: 'secret-client',
      apiKey: 'secret-api',
      session_secret: 'secret-session',
      authorization: 'Bearer secret',
    })

    expect(redacted.access_token).toBe('[redacted]')
    expect(redacted.refresh_token).toBe('[redacted]')
    expect(redacted.id_token).toBe('[redacted]')
    expect(redacted.client_secret).toBe('[redacted]')
    expect(redacted.apiKey).toBe('[redacted]')
    expect(redacted.session_secret).toBe('[redacted]')
    expect(redacted.authorization).toBe('[redacted]')
  })

  it('redacts nested credentials and truncates long strings', () => {
    const redacted = redact({
      oauth: { access_token: 'abc' },
      message: 'x'.repeat(500),
    })
    expect(redacted.oauth.access_token).toBe('[redacted]')
    expect(redacted.message.length).toBeLessThan(300)
  })

  it('leaves ordinary values intact', () => {
    const payload = { path: '/api/roasts', status: 200, ok: true }
    expect(redact(payload)).toEqual(payload)
  })
})
