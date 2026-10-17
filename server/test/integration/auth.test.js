import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { buildApp } from '../helpers/testApp.js'

vi.mock('../../src/services/googleOAuth.service.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    buildAuthorization: vi.fn(() => ({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=fixed-state',
      state: 'fixed-state',
      codeVerifier: 'fixed-verifier',
      purpose: 'signIn',
    })),
    exchangeCode: vi.fn(async () => ({
      client: {},
      tokens: {
        id_token: 'test-id-token',
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3_600_000,
        scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
      },
    })),
    decodeIdentity: vi.fn(async () => ({
      googleId: 'user-a',
      email: 'a@example.com',
      displayName: 'Tester',
      avatarUrl: 'http://avatar',
    })),
    revokeToken: vi.fn(async () => {}),
  }
})

import * as googleOAuth from '../../src/services/googleOAuth.service.js'

const CLIENT_ORIGIN = 'http://localhost:5173'

async function login(agent) {
  await agent.get('/auth/google')
  return agent.get('/auth/google/callback?code=abc&state=fixed-state')
}

describe('OAuth flow', () => {
  let app
  beforeEach(() => {
    app = buildApp()
    googleOAuth.decodeIdentity.mockResolvedValue({
      googleId: 'user-a',
      email: 'a@example.com',
      displayName: 'Tester',
      avatarUrl: 'http://avatar',
    })
  })

  it('GET /auth/google redirects to the Google consent screen', async () => {
    const res = await request(app).get('/auth/google')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('accounts.google.com')
  })

  it('rejects a callback with a tampered state', async () => {
    const agent = request.agent(app)
    await agent.get('/auth/google')
    const res = await agent.get('/auth/google/callback?code=abc&state=tampered')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('error=invalid_state')
  })

  it('rejects a callback with no prior state in the session', async () => {
    const res = await request(app).get('/auth/google/callback?code=abc&state=fixed-state')
    expect(res.headers.location).toContain('error=invalid_state')
  })

  it('handles OAuth cancellation without crashing', async () => {
    const res = await request(app).get('/auth/google/callback?error=access_denied')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('error=oauth_cancelled')
  })

  it('completes sign-in and exposes a safe profile', async () => {
    const agent = request.agent(app)
    const callback = await login(agent)
    expect(callback.status).toBe(302)
    expect(callback.headers.location).not.toContain('error=')

    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.authenticated).toBe(true)
    expect(me.body.user).toEqual({
      displayName: 'Tester',
      email: 'a@example.com',
      avatarUrl: 'http://avatar',
    })
    expect(me.body.youtube.connected).toBe(true)
    expect(me.body.youtube.scopes).toContain('https://www.googleapis.com/auth/youtube.readonly')
  })

  it('never exposes tokens through /api/auth/me', async () => {
    const agent = request.agent(app)
    await login(agent)
    const me = await agent.get('/api/auth/me')
    const body = JSON.stringify(me.body)
    expect(body).not.toContain('test-access-token')
    expect(body).not.toContain('test-refresh-token')
    expect(body).not.toContain('test-id-token')
    expect(me.body.youtube).not.toHaveProperty('accessToken')
  })

  it('reports an unauthenticated session', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.body).toEqual({ success: true, authenticated: false, user: null, youtube: null })
  })

  it('destroys the session on logout', async () => {
    const agent = request.agent(app)
    await login(agent)

    const logout = await agent.post('/api/auth/logout').set('Origin', CLIENT_ORIGIN)
    expect(logout.status).toBe(200)
    expect(logout.body.success).toBe(true)

    const me = await agent.get('/api/auth/me')
    expect(me.body.authenticated).toBe(false)
  })

  it('disconnects YouTube and revokes the stored token', async () => {
    const agent = request.agent(app)
    await login(agent)
    googleOAuth.revokeToken.mockClear()

    const res = await agent.post('/api/auth/disconnect-youtube').set('Origin', CLIENT_ORIGIN)
    expect(res.status).toBe(200)
    expect(res.body.youtube.connected).toBe(false)
    expect(googleOAuth.revokeToken).toHaveBeenCalledWith('test-refresh-token')

    const me = await agent.get('/api/auth/me')
    expect(me.body.authenticated).toBe(true)
    expect(me.body.youtube.connected).toBe(false)
  })
})

describe('CSRF protection for state-changing requests', () => {
  let app
  beforeEach(() => {
    app = buildApp()
  })

  it('blocks state-changing requests without an allowed origin', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CROSS_ORIGIN_BLOCKED')
  })

  it('blocks state-changing requests from a foreign origin', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Origin', 'https://evil.example.com')
    expect(res.status).toBe(403)
    // A foreign origin is rejected by the CORS layer before the CSRF guard.
    expect(res.body.error.code).toBe('CORS_ORIGIN_DENIED')
  })

  it('allows state-changing requests from the configured client origin', async () => {
    const res = await request(app).post('/api/auth/logout').set('Origin', CLIENT_ORIGIN)
    expect(res.status).toBe(200)
  })
})
