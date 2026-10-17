import { ObjectId } from 'mongodb'

/**
 * MongoDB persistence for generated roast reports.
 *
 * Only the fields the product needs are stored — never raw video titles or the
 * full source dataset. Reports expire via a TTL index and each owner is capped
 * to a small number of documents so retention stays minimal.
 */
export const REPORTS_COLLECTION = 'roast_reports'
export const REPORT_TTL_MS = 24 * 60 * 60 * 1000
export const MAX_REPORTS_PER_OWNER = 20

const REPORT_FIELDS = [
  'brainRotScore',
  'scoreExplanation',
  'personalitySummary',
  'topInterests',
  'redFlags',
  'roast',
  'positiveObservations',
  'disclaimer',
  'analysis',
  'provenance',
]

function asDate(value) {
  return value instanceof Date ? value : new Date(value)
}

function pickReportFields(report) {
  return Object.fromEntries(REPORT_FIELDS.map((field) => [field, report[field]]))
}

/** Maps a stored document back to the public API envelope. */
function serialize(doc) {
  const createdAt = asDate(doc.createdAt)
  const report = { ...pickReportFields(doc), isMock: false, createdAt: createdAt.toISOString() }
  return { id: doc._id.toString(), createdAt: createdAt.getTime(), report }
}

export async function ensureReportIndexes(db) {
  const collection = db.collection(REPORTS_COLLECTION)
  await collection.createIndex({ ownerId: 1, createdAt: -1 })
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
}

/**
 * Store contract shared with the in-memory implementation:
 *   save(ownerId, report) -> { id, createdAt, report }
 *   get(ownerId, id)      -> { id, createdAt, report } | null
 *   list(ownerId)         -> [{ id, createdAt, brainRotScore, headline }]
 *   remove(ownerId, id)   -> boolean
 *   clear(ownerId)        -> void
 *
 * Every read and write filters by ownerId, so one user can never reach another
 * user's report even by guessing an id.
 */
export function createMongoReportStore(db) {
  const collection = db.collection(REPORTS_COLLECTION)
  const now = () => new Date()

  async function trim(ownerId) {
    const excess = await collection
      .find({ ownerId })
      .sort({ createdAt: -1 })
      .skip(MAX_REPORTS_PER_OWNER)
      .project({ _id: 1 })
      .toArray()

    if (excess.length > 0) {
      await collection.deleteMany({ _id: { $in: excess.map((doc) => doc._id) } })
    }
  }

  return {
    async save(ownerId, report) {
      const createdAt = now()
      const doc = {
        ownerId,
        ...pickReportFields(report),
        createdAt,
        expiresAt: new Date(createdAt.getTime() + REPORT_TTL_MS),
      }
      const { insertedId } = await collection.insertOne(doc)
      await trim(ownerId)
      return serialize({ _id: insertedId, ...doc })
    },

    async get(ownerId, id) {
      if (!ObjectId.isValid(id)) return null
      const doc = await collection.findOne({
        _id: new ObjectId(id),
        ownerId,
        expiresAt: { $gt: now() },
      })
      return doc ? serialize(doc) : null
    },

    async list(ownerId) {
      const docs = await collection
        .find({ ownerId, expiresAt: { $gt: now() } })
        .sort({ createdAt: -1 })
        .limit(MAX_REPORTS_PER_OWNER)
        .toArray()

      return docs.map((doc) => ({
        id: doc._id.toString(),
        createdAt: asDate(doc.createdAt).getTime(),
        brainRotScore: doc.brainRotScore,
        headline: doc.scoreExplanation?.slice(0, 120) ?? null,
      }))
    },

    async remove(ownerId, id) {
      if (!ObjectId.isValid(id)) return false
      const { deletedCount } = await collection.deleteOne({ _id: new ObjectId(id), ownerId })
      return deletedCount === 1
    },

    async clear(ownerId) {
      await collection.deleteMany({ ownerId })
    },
  }
}
