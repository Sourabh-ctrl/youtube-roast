import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { analyzeContent } from './src/services/contentAnalysis.service.js'
import { parseRoastReport } from './src/schemas/roast.schema.js'
import {
  buildReport,
  createMemoryReportStore,
  configureReportStore,
  saveReport,
  getReport,
  listReports,
  latestReport,
  deleteReport,
  clearOwnerReports,
} from './src/services/report.service.js'
import { recordUser, configureUserStore } from './src/services/user.service.js'
import {
  createMongoReportStore,
  ensureReportIndexes,
  REPORTS_COLLECTION,
  REPORT_TTL_MS,
  MAX_REPORTS_PER_OWNER,
} from './src/models/report.model.js'
import {
  createMongoUserStore,
  ensureUserIndexes,
  USERS_COLLECTION,
} from './src/models/user.model.js'

let failures = 0
function check(name, condition, extra = '') {
  if (condition) console.log(`PASS ${name}`)
  else {
    failures += 1
    console.log(`FAIL ${name} ${extra}`)
  }
}
function skip(name, reason) {
  console.log(`SKIP ${name} (${reason})`)
}

function sampleAnalysis() {
  return analyzeContent({
    channel: { id: 'c1', title: 'Me' },
    likedVideos: [
      { type: 'likedVideo', videoId: 'v1', videoTitle: 'Learn React in 10 Minutes', channelTitle: 'DevChannel', categoryId: '28' },
      { type: 'likedVideo', videoId: 'v2', videoTitle: 'Lo-fi beats to relax', channelTitle: 'ChillLoops', categoryId: '10' },
    ],
    subscriptions: [{ type: 'subscription', channelId: 's1', channelTitle: 'DevChannel' }],
    playlists: [],
    playlistItems: [],
    categories: { '28': 'Science & Technology', '10': 'Music' },
    availability: { likedVideos: { available: true, total: 2, sampled: 2 } },
    fetchedAt: 1,
  })
}

const analysis = sampleAnalysis()
const aiReport = parseRoastReport({
  brainRotScore: 72,
  scoreExplanation: 'A playful heuristic, not a measurement.',
  personalitySummary: 'Curious dev-leaning browser.',
  topInterests: [{ category: 'Tech', observation: 'Developer content.', evidenceCount: 2 }],
  redFlags: [{ title: 'Tutorial collector', description: 'Collects courses.' }],
  roast: 'You have more saved tutorials than free evenings.',
  positiveObservations: ['You love learning.'],
})
const report = buildReport(aiReport, analysis, { model: 'test-model', availability: sampleAnalysis().availability })

// ---------------------------------------------------------------------------
// A. in-memory store: same contract the app uses when Mongo is unavailable
// ---------------------------------------------------------------------------
console.log('\n# Memory store')
configureReportStore(createMemoryReportStore())
const ownerA = 'owner-a'
const ownerB = 'owner-b'

const memSaved = await saveReport(ownerA, report)
check('memory: save assigns an id', typeof memSaved.id === 'string' && memSaved.id.length > 0)
check('memory: owner can read', (await getReport(ownerA, memSaved.id))?.report.brainRotScore === 72)
check('memory: other owner cannot read', (await getReport(ownerB, memSaved.id)) === null)
check('memory: history lists it', (await listReports(ownerA)).some((item) => item.id === memSaved.id))
check('memory: other owner history is empty', (await listReports(ownerB)).length === 0)
check('memory: latest resolves', (await latestReport(ownerA))?.id === memSaved.id)
check('memory: delete requires ownership', (await deleteReport(ownerB, memSaved.id)) === false)
check('memory: owner can delete', (await deleteReport(ownerA, memSaved.id)) === true)
check('memory: deleted report is gone', (await getReport(ownerA, memSaved.id)) === null)

for (let index = 0; index < MAX_REPORTS_PER_OWNER + 5; index += 1) {
  await saveReport(ownerA, report)
}
const capped = await listReports(ownerA)
check('memory: per-owner cap enforced', capped.length <= MAX_REPORTS_PER_OWNER, `${capped.length}`)

await clearOwnerReports(ownerA)
check('memory: clear removes all reports', (await listReports(ownerA)).length === 0)

// ---------------------------------------------------------------------------
// B. MongoDB store: real persistence when a database is reachable
// ---------------------------------------------------------------------------
console.log('\n# MongoDB store')
const uri = process.env.MONGODB_URI || process.env.SESSION_STORE_URI
const dbName = `${process.env.MONGODB_DB || 'roasttube'}_verify`

let client = null
if (!uri) {
  skip('mongodb integration', 'no MONGODB_URI configured')
} else {
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
    await client.connect()
    await client.db(dbName).command({ ping: 1 })
  } catch (error) {
    skip('mongodb integration', `database unreachable: ${error.message}`)
    await client?.close().catch(() => {})
    client = null
  }
}

if (client) {
  const db = client.db(dbName)
  try {
    await db.collection(REPORTS_COLLECTION).deleteMany({})
    await db.collection(USERS_COLLECTION).deleteMany({})
    await ensureReportIndexes(db)
    await ensureUserIndexes(db)

    const indexes = await db.collection(REPORTS_COLLECTION).listIndexes().toArray()
    check('mongo: ownership index exists', indexes.some((index) => index.key.ownerId === 1))
    check(
      'mongo: TTL index on expiresAt',
      indexes.some((index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0),
    )

    configureReportStore(createMongoReportStore(db))

    const saved = await saveReport(ownerA, report)
    check('mongo: save assigns an id', typeof saved.id === 'string' && saved.id.length > 0)
    check('mongo: owner can read', (await getReport(ownerA, saved.id))?.report.brainRotScore === 72)
    check('mongo: other owner cannot read', (await getReport(ownerB, saved.id)) === null)
    check('mongo: invalid id is not found', (await getReport(ownerA, 'not-an-object-id')) === null)
    check('mongo: history lists it', (await listReports(ownerA)).some((item) => item.id === saved.id))
    check('mongo: other owner history is empty', (await listReports(ownerB)).length === 0)
    check('mongo: latest resolves', (await latestReport(ownerA))?.id === saved.id)

    const raw = await db.collection(REPORTS_COLLECTION).findOne({ ownerId: ownerA })
    check(
      'mongo: expiresAt is createdAt + TTL',
      raw.expiresAt.getTime() - raw.createdAt.getTime() === REPORT_TTL_MS,
    )
    check('mongo: report stores no raw titles', !JSON.stringify(raw).includes('Learn React'))

    check('mongo: delete requires ownership', (await deleteReport(ownerB, saved.id)) === false)
    check('mongo: owner can delete', (await deleteReport(ownerA, saved.id)) === true)
    check('mongo: deleted report is gone', (await getReport(ownerA, saved.id)) === null)

    for (let index = 0; index < MAX_REPORTS_PER_OWNER + 5; index += 1) {
      await saveReport(ownerA, report)
    }
    const storedCount = await db.collection(REPORTS_COLLECTION).countDocuments({ ownerId: ownerA })
    check('mongo: per-owner cap enforced', storedCount <= MAX_REPORTS_PER_OWNER, `${storedCount}`)

    await clearOwnerReports(ownerA)
    check('mongo: clear removes all reports', (await db.collection(REPORTS_COLLECTION).countDocuments({ ownerId: ownerA })) === 0)

    // C. user profile persistence
    configureUserStore(createMongoUserStore(db))
    await recordUser({ googleId: 'g-1', displayName: 'First', email: 'secret@example.com', avatarUrl: 'http://a' })
    await recordUser({ googleId: 'g-1', displayName: 'Second', avatarUrl: 'http://b' })
    const user = await db.collection(USERS_COLLECTION).findOne({ googleId: 'g-1' })
    check('mongo: user upsert is idempotent', (await db.collection(USERS_COLLECTION).countDocuments({ googleId: 'g-1' })) === 1)
    check('mongo: user upsert updates fields', user.displayName === 'Second' && user.avatarUrl === 'http://b')
    check('mongo: user profile never stores email', !('email' in user))
    check('mongo: user profile sets createdAt', user.createdAt instanceof Date)
  } finally {
    await db.collection(REPORTS_COLLECTION).drop().catch(() => {})
    await db.collection(USERS_COLLECTION).drop().catch(() => {})
    configureReportStore()
    configureUserStore()
    await client.close().catch(() => {})
  }
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
