import { analyzeContent } from '../../src/services/contentAnalysis.service.js'
import { parseRoastReport } from '../../src/schemas/roast.schema.js'
import { buildReport } from '../../src/services/report.service.js'

export const TEST_CONFIG = Object.freeze({
  nodeEnv: 'test',
  port: 5000,
  clientUrl: 'http://localhost:5173',
  isProduction: false,
  mongoUri: '',
  mongoDb: 'roasttube_test',
})

/** A normalized YouTube snapshot with one duplicate to exercise dedupe. */
export function sampleSnapshot(overrides = {}) {
  return {
    channel: { id: 'c1', title: 'Me' },
    likedVideos: [
      { type: 'likedVideo', videoId: 'v1', videoTitle: 'Learn React in 10 Minutes', channelTitle: 'DevChannel', categoryId: '28', publishedAt: '2026-01-01' },
      { type: 'likedVideo', videoId: 'v1', videoTitle: 'Learn React in 10 Minutes', channelTitle: 'DevChannel', categoryId: '28', publishedAt: '2026-01-01' },
      { type: 'likedVideo', videoId: 'v2', videoTitle: 'React Patterns Explained', channelTitle: 'DevChannel', categoryId: '28', publishedAt: '2026-02-01' },
      { type: 'likedVideo', videoId: 'v3', videoTitle: 'Lo-fi beats to relax', channelTitle: 'ChillLoops', categoryId: '10', publishedAt: '2026-03-01' },
    ],
    subscriptions: [
      { type: 'subscription', channelId: 's1', channelTitle: 'DevChannel' },
      { type: 'subscription', channelId: 's2', channelTitle: 'ChillLoops' },
    ],
    playlists: [
      { type: 'playlist', playlistId: 'p1', title: 'Watch later', itemCount: 12 },
    ],
    playlistItems: [
      { type: 'playlistItem', playlistId: 'p1', videoId: 'v9', videoTitle: 'React Advanced Course', channelTitle: 'DevChannel' },
    ],
    categories: { 28: 'Science & Technology', 10: 'Music' },
    availability: {
      watchHistory: { available: false, message: 'not supported' },
      channel: { available: true, total: 1, sampled: 1, truncated: false, reason: null, message: null },
      likedVideos: { available: true, total: 1000, sampled: 3, truncated: true, reason: null, message: null },
      subscriptions: { available: true, total: 2, sampled: 2, truncated: false, reason: null, message: null },
      playlists: { available: true, total: 1, sampled: 1, truncated: false, reason: null, message: null },
      playlistItems: { available: true, total: 1, sampled: 1, truncated: false, reason: null, message: null },
    },
    fetchedAt: 1,
    ...overrides,
  }
}

export const VALID_AI_REPORT = Object.freeze({
  brainRotScore: 72,
  scoreExplanation: 'A playful heuristic, not a measurement.',
  personalitySummary: 'Curious dev-leaning browser.',
  topInterests: [{ category: 'Tech', observation: 'Developer content.', evidenceCount: 3 }],
  redFlags: [{ title: 'Tutorial collector', description: 'Collects courses.' }],
  roast: 'You have more saved tutorials than free evenings.',
  positiveObservations: ['You love learning.'],
})

/** Builds a stored report matching what the roast pipeline would persist. */
export function buildSampleReport(overrides = {}) {
  const analysis = analyzeContent(sampleSnapshot())
  const aiReport = parseRoastReport({ ...VALID_AI_REPORT, ...overrides })
  return buildReport(aiReport, analysis, {
    model: 'test-model',
    availability: sampleSnapshot().availability,
  })
}

/** Minimal session shape used by guards that read oauth scopes. */
export function connectedSession(extra = {}) {
  return {
    id: 'session-1',
    user: { googleId: 'user-a', email: 'a@example.com', displayName: 'Tester', avatarUrl: 'http://a' },
    oauth: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiryDate: Date.now() + 3_600_000,
      scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/youtube.readonly'],
    },
    ...extra,
  }
}
