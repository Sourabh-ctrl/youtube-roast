import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { buildApp } from '../helpers/testApp.js'
import {
  sampleSnapshot,
  buildSampleReport,
  VALID_AI_REPORT,
} from '../helpers/fixtures.js'
import { saveReport, configureReportStore } from '../../src/services/report.service.js'
import { AppError } from '../../src/utils/appError.js'

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

const aiMocks = vi.hoisted(() => ({ generateRoastReport: vi.fn() }))
vi.mock('../../src/services/ai.service.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, generateRoastReport: aiMocks.generateRoastReport }
})

import * as googleOAuth from '../../src/services/googleOAuth.service.js'

const CLIENT_ORIGIN = 'http://localhost:5173'

async function login(agent, googleId = 'user-a') {
  googleOAuth.decodeIdentity.mockResolvedValue({
    googleId,
    email: `${googleId}@example.com`,
    displayName: googleId,
    avatarUrl: 'http://avatar',
  })
  await agent.get('/auth/google')
  return agent.get('/auth/google/callback?code=abc&state=fixed-state')
}

async function waitForJob(agent, jobId) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const res = await agent.get(`/api/roasts/jobs/${jobId}`)
    const job = res.body.job
    if (job && job.status !== 'pending' && job.status !== 'running') return job
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error('roast job did not finish in time')
}

describe('roast report endpoints', () => {
  let app

  beforeEach(() => {
    configureReportStore()
    app = buildApp()
    youtubeMocks.collectYouTubeData.mockResolvedValue({ ...sampleSnapshot(), cached: false })
    aiMocks.generateRoastReport.mockResolvedValue(VALID_AI_REPORT)
  })

  it('requires authentication', async () => {
    const history = await request(app).get('/api/roasts/history')
    expect(history.status).toBe(401)

    const create = await request(app).post('/api/roasts').set('Origin', CLIENT_ORIGIN)
    expect(create.status).toBe(401)
  })

  it('lets an owner read their own report and hides it from another user', async () => {
    const saved = await saveReport('user-a', buildSampleReport())

    const owner = request.agent(app)
    await login(owner, 'user-a')
    const mine = await owner.get(`/api/roasts/${saved.id}`)
    expect(mine.status).toBe(200)
    expect(mine.body.report.brainRotScore).toBe(72)

    const intruder = request.agent(app)
    await login(intruder, 'user-b')
    const theirs = await intruder.get(`/api/roasts/${saved.id}`)
    expect(theirs.status).toBe(404)
    expect(theirs.body.error.code).toBe('REPORT_NOT_FOUND')
  })

  it('only lets the owner delete a report', async () => {
    const saved = await saveReport('user-a', buildSampleReport())

    const intruder = request.agent(app)
    await login(intruder, 'user-b')
    const blocked = await intruder
      .delete(`/api/roasts/${saved.id}`)
      .set('Origin', CLIENT_ORIGIN)
    expect(blocked.status).toBe(404)

    const owner = request.agent(app)
    await login(owner, 'user-a')
    const deleted = await owner.delete(`/api/roasts/${saved.id}`).set('Origin', CLIENT_ORIGIN)
    expect(deleted.status).toBe(200)

    const gone = await owner.get(`/api/roasts/${saved.id}`)
    expect(gone.status).toBe(404)
  })

  it('lists only the current user reports', async () => {
    await saveReport('user-a', buildSampleReport())
    await saveReport('user-b', buildSampleReport())

    const agent = request.agent(app)
    await login(agent, 'user-a')
    const res = await agent.get('/api/roasts/history')
    expect(res.status).toBe(200)
    expect(res.body.reports).toHaveLength(1)
  })

  it('runs a roast end to end and returns a validated report', async () => {
    const agent = request.agent(app)
    await login(agent, 'user-a')

    const started = await agent.post('/api/roasts').set('Origin', CLIENT_ORIGIN)
    expect(started.status).toBe(202)
    expect(started.body.job.status).toBe('pending')

    const job = await waitForJob(agent, started.body.job.id)
    expect(job.status).toBe('ready')
    expect(typeof job.reportId).toBe('string')

    const report = await agent.get(`/api/roasts/${job.reportId}`)
    expect(report.status).toBe(200)
    expect(report.body.report.brainRotScore).toBe(72)
    expect(report.body.report.disclaimer).toMatch(/not a scientific personality assessment/i)
    expect(report.body.report).not.toHaveProperty('sample')
  })

  it('explains when there is no accessible data to analyze', async () => {
    youtubeMocks.collectYouTubeData.mockResolvedValue({
      ...sampleSnapshot(),
      likedVideos: [],
      subscriptions: [],
      playlists: [],
      playlistItems: [],
    })

    const agent = request.agent(app)
    await login(agent, 'user-a')
    const started = await agent.post('/api/roasts').set('Origin', CLIENT_ORIGIN)
    const job = await waitForJob(agent, started.body.job.id)

    expect(job.status).toBe('failed')
    expect(job.error.code).toBe('YOUTUBE_NO_DATA')
    expect(job.error.message).toMatch(/liked videos, subscriptions, or playlist items/i)
  })

  it('surfaces provider validation failures as a clear job error', async () => {
    aiMocks.generateRoastReport.mockRejectedValue(
      new AppError(502, 'AI_INVALID_OUTPUT', 'The AI returned a report we could not validate. Please try generating again.'),
    )

    const agent = request.agent(app)
    await login(agent, 'user-a')
    const started = await agent.post('/api/roasts').set('Origin', CLIENT_ORIGIN)
    const job = await waitForJob(agent, started.body.job.id)

    expect(job.status).toBe('failed')
    expect(job.error.code).toBe('AI_INVALID_OUTPUT')
  })

  it('surfaces provider timeouts as a clear job error', async () => {
    aiMocks.generateRoastReport.mockRejectedValue(
      new AppError(504, 'AI_TIMEOUT', 'The roast took too long to generate. Please try again.'),
    )

    const agent = request.agent(app)
    await login(agent, 'user-a')
    const started = await agent.post('/api/roasts').set('Origin', CLIENT_ORIGIN)
    const job = await waitForJob(agent, started.body.job.id)

    expect(job.status).toBe('failed')
    expect(job.error.code).toBe('AI_TIMEOUT')
  })

  it('blocks roast creation without an allowed origin', async () => {
    const agent = request.agent(app)
    await login(agent, 'user-a')
    const res = await agent.post('/api/roasts')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CROSS_ORIGIN_BLOCKED')
  })
})
