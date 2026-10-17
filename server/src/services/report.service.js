import { randomUUID } from 'node:crypto'
import { CANONICAL_DISCLAIMER } from '../schemas/roast.schema.js'
import { publicAnalysis } from './contentAnalysis.service.js'
import {
  MAX_REPORTS_PER_OWNER,
  REPORT_TTL_MS,
} from '../models/report.model.js'

/**
 * Reports are persisted through a small store contract. Phase 6 binds the
 * MongoDB store at boot; when no database is configured (tests, local dev
 * without Mongo) the in-memory store below keeps the same semantics so the
 * rest of the app — and the verification scripts — stay unchanged.
 *
 * Only report metadata is kept — never raw video titles or the source dataset.
 */
function isExpired(entry, now) {
  return now - entry.createdAt > REPORT_TTL_MS
}

export function createMemoryReportStore() {
  const reports = new Map()
  const byOwner = new Map()

  function pruneOwner(ownerId, now) {
    const ids = byOwner.get(ownerId)
    if (!ids) return
    const kept = ids.filter((id) => {
      const entry = reports.get(id)
      if (!entry || isExpired(entry, now)) {
        reports.delete(id)
        return false
      }
      return true
    })
    kept.splice(0, Math.max(0, kept.length - MAX_REPORTS_PER_OWNER)).forEach((id) => reports.delete(id))
    byOwner.set(ownerId, kept)
  }

  function ownedEntry(ownerId, id) {
    const entry = reports.get(id)
    if (!entry || entry.ownerId !== ownerId) return null
    if (isExpired(entry, Date.now())) {
      reports.delete(id)
      return null
    }
    return entry
  }

  return {
    async save(ownerId, report) {
      const now = Date.now()
      const entry = {
        id: randomUUID(),
        ownerId,
        createdAt: now,
        report: { ...report, createdAt: new Date(now).toISOString() },
      }
      reports.set(entry.id, entry)
      const ids = byOwner.get(ownerId) ?? []
      ids.push(entry.id)
      byOwner.set(ownerId, ids)
      pruneOwner(ownerId, now)
      return { id: entry.id, createdAt: entry.createdAt, report: entry.report }
    },

    async get(ownerId, id) {
      const entry = ownedEntry(ownerId, id)
      if (!entry) return null
      return { id: entry.id, createdAt: entry.createdAt, report: entry.report }
    },

    async list(ownerId) {
      pruneOwner(ownerId, Date.now())
      const ids = byOwner.get(ownerId) ?? []
      return ids
        .map((id) => reports.get(id))
        .filter(Boolean)
        .reverse()
        .map((entry) => ({
          id: entry.id,
          createdAt: entry.createdAt,
          brainRotScore: entry.report.brainRotScore,
          headline: entry.report.scoreExplanation?.slice(0, 120) ?? null,
        }))
    },

    async remove(ownerId, id) {
      const entry = ownedEntry(ownerId, id)
      if (!entry) return false
      reports.delete(id)
      const ids = byOwner.get(ownerId) ?? []
      byOwner.set(ownerId, ids.filter((existing) => existing !== id))
      return true
    },

    async clear(ownerId) {
      for (const id of byOwner.get(ownerId) ?? []) reports.delete(id)
      byOwner.delete(ownerId)
    },
  }
}

let activeStore = createMemoryReportStore()

/** Selects the persistence implementation. Pass nothing to reset to memory. */
export function configureReportStore(store) {
  activeStore = store ?? createMemoryReportStore()
}

export function saveReport(ownerId, report) {
  return activeStore.save(ownerId, report)
}

export function getReport(ownerId, id) {
  return activeStore.get(ownerId, id)
}

export function listReports(ownerId) {
  return activeStore.list(ownerId)
}

export async function latestReport(ownerId) {
  const [first] = await activeStore.list(ownerId)
  return first ? activeStore.get(ownerId, first.id) : null
}

export function deleteReport(ownerId, id) {
  return activeStore.remove(ownerId, id)
}

export function clearOwnerReports(ownerId) {
  return activeStore.clear(ownerId)
}

function trimAvailability(availability = {}) {
  const pick = (source) => ({
    available: Boolean(source?.available),
    total: source?.total ?? null,
    sampled: source?.sampled ?? null,
    truncated: Boolean(source?.truncated),
    reason: source?.reason ?? null,
    message: source?.message ?? null,
  })

  return {
    watchHistory: {
      available: false,
      message: availability?.watchHistory?.message ?? null,
    },
    channel: pick(availability.channel),
    likedVideos: pick(availability.likedVideos),
    subscriptions: pick(availability.subscriptions),
    playlists: pick(availability.playlists),
    playlistItems: pick(availability.playlistItems),
  }
}

/**
 * Composes the stored report from the validated AI output plus the transparent
 * analysis metadata. Separates observed facts, descriptive estimates and AI
 * interpretation so the UI can label each honestly.
 */
export function buildReport(aiReport, analysis, { model, availability } = {}) {
  return {
    isMock: false,
    brainRotScore: aiReport.brainRotScore,
    scoreExplanation: aiReport.scoreExplanation,
    personalitySummary: aiReport.personalitySummary,
    topInterests: aiReport.topInterests,
    redFlags: aiReport.redFlags,
    roast: aiReport.roast,
    positiveObservations: aiReport.positiveObservations,
    disclaimer: CANONICAL_DISCLAIMER,
    analysis: publicAnalysis(analysis),
    provenance: {
      model: model ?? null,
      generatedAt: new Date().toISOString(),
      sampledRecords: analysis.counts.total,
      sources: trimAvailability(availability),
      labels: {
        observed: 'Exact counts of the YouTube records you shared.',
        estimate: 'Diversity and keyword stats are descriptive estimates of the sample.',
        interpretation: 'Personality summary, red flags and roast text are AI-generated.',
      },
    },
  }
}
