import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { buildApp } from '../helpers/testApp.js'
import { sampleSnapshot } from '../helpers/fixtures.js'

vi.mock('../../src/services/googleOAuth.service.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    buildAuthorization: vi.fn(() => ({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test',
      state: 'fixed-state',
      codeVerifier: 'fixed-verifier',
      purpose: 'signIn',
    })),
    exchangeCode: vi.fn(async () => ({
      client: {},
      tokens: {
        id_token: 'id-token',
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 3_600_000,
        scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
      },
    })),
    decodeIdentity: vi.fn(async () => ({
      googleId: 'user-a',
      email: 'a@example.com',
      displayName: 'Tester',
      avatarUrl: 'http://a',
    })),
    revokeToken: vi.fn(async () => {}),
  }
})

const youtubeMocks = vi.hoisted(() => ({ collectYouTubeData: vi.fn() }))
vi.mock('../../src/services/youtube.service.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, collectYouTubeData: youtubeMocks.collectYouTubeData }
})

import * as googleOAuth from '../../src/services/googleOAuth.service.js'

async function login(agent, identity = { googleId: 'user-a' }) {
  googleOAuth.decodeIdentity.mockResolvedValue({
    googleId: identity.googleId,
    email: `${identity.googleId}@example.com`,
    displayName: identity.googleId,
    avatarUrl: 'http://avatar',
  })
  await agent.get('/auth/google')
  return agent.get('/auth/google/callback?code=abc&state=fixed-state')
}

describe('YouTube data endpoints', () => {
  let app
  beforeEach(() => {
    app = buildApp()
    youtubeMocks.collectYouTubeData.mockResolvedValue({ ...sampleSnapshot(), cached: false })
  })

  it('protects every YouTube endpoint behind authentication', async () => {
    for (const path of ['/api/youtube/status', '/api/youtube/preview', '/api/youtube/data-availability']) {
      const res = await request(app).get(path)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHENTICATED')
    }
  })

  it('reports connection status for a signed-in user', async () => {
    const agent = request.agent(app)
    await login(agent)
    const res = await agent.get('/api/youtube/status')
    expect(res.status).toBe(200)
    expect(res.body.youtube.connected).toBe(true)
  })

  it('returns data availability including the watch-history limitation', async () => {
    const agent = request.agent(app)
    await login(agent)
    const res = await agent.get('/api/youtube/data-availability')
    expect(res.status).toBe(200)
    expect(res.body.availability.watchHistory.available).toBe(false)
    expect(res.body.availability.likedVideos.available).toBe(true)
  })

  it('returns a capped preview of the accessible metadata', async () => {
    const agent = request.agent(app)
    await login(agent)
    const res = await agent.get('/api/youtube/preview')
    expect(res.status).toBe(200)
    expect(res.body.preview.likedVideos.length).toBeLessThanOrEqual(5)
    expect(res.body.preview.channel.title).toBe('Me')
  })

  it('requires an active YouTube grant, not merely a Google sign-in', async () => {
    // Grant identity-only scopes: signed in, but no youtube.readonly.
    googleOAuth.exchangeCode.mockResolvedValueOnce({
      client: {},
      tokens: {
        id_token: 'id-token',
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 3_600_000,
        scope: 'openid email profile',
      },
    })

    const agent = request.agent(app)
    await login(agent)

    const preview = await agent.get('/api/youtube/preview')
    expect(preview.status).toBe(403)
    expect(preview.body.error.code).toBe('YOUTUBE_PERMISSION_REQUIRED')

    const status = await agent.get('/api/youtube/status')
    expect(status.body.youtube.connected).toBe(false)
  })
})
