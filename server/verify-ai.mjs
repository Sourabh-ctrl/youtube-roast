// End-to-end feedback loop against the real AI provider.
// Requires AI_API_KEY / AI_MODEL (and optional AI_BASE_URL) in .env.
// Exit 0 = the provider returned a valid, Zod-validated roast report.
import './src/config/env.js'
import { analyzeContent } from './src/services/contentAnalysis.service.js'
import { generateRoastReport, aiModelId } from './src/services/ai.service.js'

const snapshot = {
  channel: { id: 'c1', title: 'Me' },
  likedVideos: [
    { type: 'likedVideo', videoId: 'v1', videoTitle: 'Learn React in 10 Minutes', channelTitle: 'DevChannel', categoryId: '28', publishedAt: '2026-01-01' },
    { type: 'likedVideo', videoId: 'v2', videoTitle: 'React Patterns EXPLAINED', channelTitle: 'DevChannel', categoryId: '28', publishedAt: '2026-02-01' },
    { type: 'likedVideo', videoId: 'v3', videoTitle: 'Lo-fi beats to relax', channelTitle: 'ChillLoops', categoryId: '10', publishedAt: '2026-03-01' },
  ],
  subscriptions: [
    { type: 'subscription', channelId: 's1', channelTitle: 'DevChannel' },
    { type: 'subscription', channelId: 's2', channelTitle: 'ChillLoops' },
  ],
  playlists: [{ type: 'playlist', playlistId: 'p1', title: 'Watch later', itemCount: 12 }],
  playlistItems: [
    { type: 'playlistItem', playlistId: 'p1', videoId: 'v9', videoTitle: 'React Advanced Course', channelTitle: 'DevChannel' },
  ],
  categories: { '28': 'Science & Technology', '10': 'Music' },
  availability: {
    watchHistory: { available: false, message: 'not supported' },
    likedVideos: { available: true, total: 3, sampled: 3, truncated: false, reason: null, message: null },
    subscriptions: { available: true, total: 2, sampled: 2, truncated: false, reason: null, message: null },
    playlists: { available: true, total: 1, sampled: 1, truncated: false, reason: null, message: null },
    playlistItems: { available: true, total: 1, sampled: 1, truncated: false, reason: null, message: null },
    channel: { available: true, total: 1, sampled: 1, truncated: false, reason: null, message: null },
  },
  fetchedAt: 1,
}

const analysis = analyzeContent(snapshot)

console.log('model:', process.env.AI_MODEL, '| base:', process.env.AI_BASE_URL || '(default)')
console.log('key present:', Boolean(process.env.AI_API_KEY?.trim()))

try {
  const started = Date.now()
  const report = await generateRoastReport(analysis)
  console.log(`\nPASS generated in ${Date.now() - started}ms with model ${aiModelId()}`)
  console.log('brainRotScore:', report.brainRotScore)
  console.log('topInterests:', report.topInterests.length, '| redFlags:', report.redFlags.length)
  console.log('roast:', report.roast.slice(0, 160))
  process.exit(0)
} catch (error) {
  console.log(`\nFAIL code=${error.code} status=${error.statusCode}`)
  console.log('message:', error.message)
  process.exit(1)
}
