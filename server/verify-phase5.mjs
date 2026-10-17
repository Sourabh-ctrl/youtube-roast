import { analyzeContent, publicAnalysis, ANALYSIS_LIMITS } from './src/services/contentAnalysis.service.js'
import {
  parseRoastReport,
  extractJson,
  CANONICAL_DISCLAIMER,
} from './src/schemas/roast.schema.js'
import {
  buildUserPrompt,
  generateRoastReport,
  SYSTEM_INSTRUCTION,
} from './src/services/ai.service.js'
import {
  buildReport,
  saveReport,
  getReport,
  listReports,
  latestReport,
  deleteReport,
} from './src/services/report.service.js'
import {
  createRoastJob,
  runRoastJob,
  ROAST_STAGES,
} from './src/services/roastJob.service.js'
import { AppError } from './src/utils/appError.js'

let failures = 0
function check(name, condition, extra = '') {
  if (condition) console.log(`PASS ${name}`)
  else {
    failures += 1
    console.log(`FAIL ${name} ${extra}`)
  }
}

function sampleSnapshot() {
  return {
    channel: { id: 'c1', title: 'Me' },
    likedVideos: [
      { type: 'likedVideo', videoId: 'v1', videoTitle: 'Learn React in 10 Minutes', channelTitle: 'DevChannel', categoryId: '28', publishedAt: '2026-01-01' },
      { type: 'likedVideo', videoId: 'v1', videoTitle: 'Learn React in 10 Minutes', channelTitle: 'DevChannel', categoryId: '28', publishedAt: '2026-01-01' },
      { type: 'likedVideo', videoId: 'v2', videoTitle: 'React Patterns EXPLAINED', channelTitle: 'DevChannel', categoryId: '28', publishedAt: '2026-02-01' },
      { type: 'likedVideo', videoId: 'v3', videoTitle: 'Lo-fi beats to relax', channelTitle: 'ChillLoops', categoryId: '10', publishedAt: '2026-03-01' },
      { type: 'likedVideo', videoId: 'v4', videoTitle: '', channelTitle: '', categoryId: null },
    ],
    subscriptions: [
      { type: 'subscription', channelId: 's1', channelTitle: 'DevChannel' },
      { type: 'subscription', channelId: 's1', channelTitle: 'DevChannel' },
      { type: 'subscription', channelId: 's2', channelTitle: 'ChillLoops' },
    ],
    playlists: [
      { type: 'playlist', playlistId: 'p1', title: 'Watch later', itemCount: 12 },
      { type: 'playlist', playlistId: 'p1', title: 'Watch later', itemCount: 12 },
    ],
    playlistItems: [
      { type: 'playlistItem', playlistId: 'p1', videoId: 'v9', videoTitle: 'React Advanced Course', channelTitle: 'DevChannel' },
    ],
    categories: { '28': 'Science & Technology', '10': 'Music' },
    availability: {
      watchHistory: { available: false, message: 'not supported' },
      likedVideos: { available: true, total: 1000, sampled: 4, truncated: true, reason: null, message: null },
      subscriptions: { available: true, total: 3, sampled: 2, truncated: false, reason: null, message: null },
      playlists: { available: true, total: 2, sampled: 1, truncated: false, reason: null, message: null },
      playlistItems: { available: true, total: 1, sampled: 1, truncated: false, reason: null, message: null },
      channel: { available: true, total: 1, sampled: 1, truncated: false, reason: null, message: null },
    },
    fetchedAt: 1,
  }
}

// 1. content analysis: dedupe, grouping, stats, caps
const analysis = analyzeContent(sampleSnapshot())
check('analysis dedupes liked videos', analysis.counts.likedVideos === 4, `${analysis.counts.likedVideos}`)
check('analysis dedupes subscriptions', analysis.counts.subscriptions === 2, `${analysis.counts.subscriptions}`)
check('analysis dedupes playlists', analysis.counts.playlists === 1, `${analysis.counts.playlists}`)
check('analysis flags data present', analysis.hasData === true)
check('analysis groups categories with names', analysis.categories[0]?.name === 'Science & Technology', JSON.stringify(analysis.categories))
check(
  'analysis buckets uncategorized records',
  analysis.categories.some((entry) => entry.name === 'Uncategorized'),
)
check('analysis ranks top channels', analysis.channels[0]?.name === 'DevChannel', JSON.stringify(analysis.channels))
check(
  'analysis extracts recurring keywords',
  analysis.keywords.some((entry) => entry.term === 'react'),
  JSON.stringify(analysis.keywords.slice(0, 5)),
)
check('analysis computes category diversity', analysis.stats.categoryDiversity > 0)
check('analysis caps keyword list', analysis.keywords.length <= ANALYSIS_LIMITS.topKeywords)
check(
  'analysis does not expose raw titles to the client',
  !('sample' in publicAnalysis(analysis)) && !JSON.stringify(publicAnalysis(analysis)).includes('Learn React'),
)

// 2. schema validation
const validAi = {
  brainRotScore: 72,
  scoreExplanation: 'A playful heuristic, not a measurement.',
  personalitySummary: 'Curious dev-leaning browser.',
  topInterests: [{ category: 'Tech', observation: 'Developer content.', evidenceCount: 3 }],
  redFlags: [{ title: 'Tutorial collector', description: 'Collects courses.' }],
  roast: 'You have more saved tutorials than free evenings.',
  positiveObservations: ['You love learning.'],
  disclaimer: 'model supplied text',
}
const parsed = parseRoastReport(validAi)
check('schema accepts a valid report', parsed.brainRotScore === 72)
check('schema overwrites the disclaimer', parsed.disclaimer === CANONICAL_DISCLAIMER)
check('extractJson unwraps code fences', extractJson('```json\n{"a":1}\n```')?.a === 1)
check('extractJson tolerates prose', extractJson('Sure! {"a":2} hope that helps')?.a === 2)

function rejects(name, mutate) {
  const candidate = structuredClone(validAi)
  mutate(candidate)
  try {
    parseRoastReport(candidate)
    check(name, false, 'expected rejection')
  } catch (error) {
    check(name, error.code === 'AI_INVALID_OUTPUT', error.code)
  }
}
rejects('schema rejects score above 100', (r) => { r.brainRotScore = 101 })
rejects('schema rejects negative score', (r) => { r.brainRotScore = -1 })
rejects('schema rejects non-integer score', (r) => { r.brainRotScore = 72.5 })
rejects('schema rejects too many interests', (r) => {
  r.topInterests = Array.from({ length: 7 }, () => ({ category: 'x', observation: 'y', evidenceCount: 1 }))
})
rejects('schema rejects missing roast', (r) => { delete r.roast })
rejects('schema rejects oversized array text', (r) => {
  r.positiveObservations = ['x'.repeat(400)]
})
try {
  parseRoastReport('not json at all')
} catch (error) {
  check('schema rejects malformed JSON', error.code === 'AI_INVALID_OUTPUT', error.code)
}

// 3. prompt is injection-resistant and grounded
const prompt = buildUserPrompt(analysis)
check('prompt fences untrusted data', prompt.includes('<<<DATA') && prompt.includes('DATA>>>'))
check('prompt marks data as untrusted', /untrusted/i.test(prompt))
check('system instruction treats titles as data', /never as instructions/i.test(SYSTEM_INSTRUCTION))
check('system instruction forbids watch-history claims', /watch history/i.test(SYSTEM_INSTRUCTION))
check('system instruction forbids sensitive attributes', /sensitive personal/i.test(SYSTEM_INSTRUCTION))

// 4. ai service with an injected client
const fakeClient = (text) => ({ chat: { completions: { create: async () => ({ choices: [{ message: { content: text } }] }) } } })
const generated = await generateRoastReport(analysis, {
  client: fakeClient(JSON.stringify(validAi)),
  model: 'test-model',
})
check('ai returns a validated report', generated.brainRotScore === 72 && generated.disclaimer === CANONICAL_DISCLAIMER)

async function expectError(name, fn, code) {
  try {
    await fn()
    check(name, false, 'expected throw')
  } catch (error) {
    check(name, error.code === code, `${error.code}`)
  }
}
await expectError(
  'ai maps 429 to AI_RATE_LIMITED',
  () => generateRoastReport(analysis, { model: 'm', client: { chat: { completions: { create: async () => { const e = new Error('quota'); e.status = 429; throw e } } } } }),
  'AI_RATE_LIMITED',
)
await expectError(
  'ai maps timeouts to AI_TIMEOUT',
  () => generateRoastReport(analysis, { model: 'm', client: { chat: { completions: { create: async () => { const e = new Error('request timed out'); throw e } } } } }),
  'AI_TIMEOUT',
)
await expectError(
  'ai maps provider errors to AI_PROVIDER_ERROR',
  () => generateRoastReport(analysis, { model: 'm', client: { chat: { completions: { create: async () => { const e = new Error('boom'); e.status = 500; throw e } } } } }),
  'AI_PROVIDER_ERROR',
)
await expectError(
  'ai rejects invalid output',
  () => generateRoastReport(analysis, { model: 'm', client: fakeClient('{"brainRotScore": 999}') }),
  'AI_INVALID_OUTPUT',
)

// 5. report service: composition, ownership, deletion
const report = buildReport(parsed, analysis, { model: 'test-model', availability: sampleSnapshot().availability })
check('report carries analysis counts', report.analysis.counts.likedVideos === 4)
check('report carries provenance model', report.provenance.model === 'test-model')
check('report strips raw titles', !JSON.stringify(report.analysis).includes('Learn React'))
check('report labels observed vs interpretation', Boolean(report.provenance.labels.observed && report.provenance.labels.interpretation))

const ownerA = 'owner-a'
const ownerB = 'owner-b'
const saved = await saveReport(ownerA, report)
check('saveReport assigns an id', typeof saved.id === 'string' && saved.id.length > 0)
check('owner can read their report', (await getReport(ownerA, saved.id))?.report.brainRotScore === 72)
check('other owner cannot read the report', (await getReport(ownerB, saved.id)) === null)
check('history lists the report', (await listReports(ownerA)).some((item) => item.id === saved.id))
check('other owner history is empty', (await listReports(ownerB)).length === 0)
check('latest report resolves', (await latestReport(ownerA))?.id === saved.id)
check('delete requires ownership', (await deleteReport(ownerB, saved.id)) === false)
check('owner can delete', (await deleteReport(ownerA, saved.id)) === true)
check('deleted report is gone', (await getReport(ownerA, saved.id)) === null)

// 6. roast job pipeline: real stage transitions, honest failure modes
function makeContext() {
  return { id: 'sess-job', oauth: { accessToken: 't', scope: ['openid', 'https://www.googleapis.com/auth/youtube.readonly'] } }
}

async function runWith(name, deps) {
  const job = createRoastJob({ ownerId: 'job-owner' })
  await runRoastJob(job, makeContext(), deps)
  return job
}

const seenStages = []
const happyJob = await runWith('happy', {
  model: 'test-model',
  collect: async () => sampleSnapshot(),
  generate: async () => { seenStages.push('generate'); return parsed },
  save: (ownerId, r) => saveReport(ownerId, r),
})
check('happy job ends ready', happyJob.status === 'ready' && happyJob.stage === ROAST_STAGES.ready)
check('happy job returns a report id', typeof happyJob.reportId === 'string')
check(
  'pipeline reaches generating before preparing',
  seenStages.includes('generate'),
)

const noDataJob = await runWith('no-data', {
  collect: async () => ({ ...sampleSnapshot(), likedVideos: [], subscriptions: [], playlistItems: [], playlists: [] }),
})
check('empty data yields YOUTUBE_NO_DATA', noDataJob.status === 'failed' && noDataJob.error.code === 'YOUTUBE_NO_DATA', JSON.stringify(noDataJob.error))

const disconnectedJob = createRoastJob({ ownerId: 'job-owner' })
await runRoastJob(disconnectedJob, { id: 'sess-disc', oauth: { scope: ['openid'] } }, {})
check(
  'unconnected session cannot start a roast',
  disconnectedJob.status === 'failed' && disconnectedJob.error.code === 'YOUTUBE_PERMISSION_REQUIRED',
  JSON.stringify(disconnectedJob.error),
)

const providerJob = await runWith('provider', {
  collect: async () => sampleSnapshot(),
  generate: async () => { throw AppError.serviceUnavailable('safe', 'AI_PROVIDER_ERROR') },
})
check(
  'provider AppError passes through the pipeline',
  providerJob.status === 'failed' && providerJob.error.code === 'AI_PROVIDER_ERROR',
  JSON.stringify(providerJob.error),
)

const genericJob = await runWith('generic', {
  collect: async () => sampleSnapshot(),
  generate: async () => { throw new Error('boom') },
})
check(
  'unexpected failure is wrapped with a safe message',
  genericJob.status === 'failed' &&
    genericJob.error.code === 'ROAST_FAILED' &&
    !/boom/.test(genericJob.error.message),
  JSON.stringify(genericJob.error),
)

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
