import { randomUUID } from 'node:crypto'
import { isConnected, collectYouTubeData } from './youtube.service.js'
import { analyzeContent } from './contentAnalysis.service.js'
import { generateRoastReport } from './ai.service.js'
import { buildReport, saveReport } from './report.service.js'
import { AppError } from '../utils/appError.js'
import { logger } from '../utils/logger.js'

/**
 * Roast generation is a multi-second AI call, so it runs as a lightweight job
 * the client can poll. Every stage below maps to real work performed on the
 * server — the UI never fabricates progress.
 *
 * The job registry is in-process for Phase 5; a durable queue can replace it
 * without changing the stage contract.
 */
export const ROAST_STAGES = Object.freeze({
  queued: 'queued',
  checkingPermissions: 'checking_permissions',
  fetchingMetadata: 'fetching_metadata',
  analyzing: 'analyzing',
  generating: 'generating',
  preparingReport: 'preparing_report',
  ready: 'ready',
  failed: 'failed',
})

export const ROAST_STAGE_ORDER = Object.freeze([
  ROAST_STAGES.checkingPermissions,
  ROAST_STAGES.fetchingMetadata,
  ROAST_STAGES.analyzing,
  ROAST_STAGES.generating,
  ROAST_STAGES.preparingReport,
])

const JOB_TTL_MS = 10 * 60 * 1000
const jobs = new Map()

function pruneJobs() {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.updatedAt > JOB_TTL_MS) jobs.delete(id)
  }
}

function setStage(job, stage) {
  job.stage = stage
  job.updatedAt = Date.now()
}

export function createRoastJob({ ownerId }) {
  pruneJobs()
  const now = Date.now()
  const job = {
    id: randomUUID(),
    ownerId,
    status: 'pending',
    stage: ROAST_STAGES.queued,
    reportId: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  }
  jobs.set(job.id, job)
  return job
}

export function getRoastJob(id, ownerId) {
  pruneJobs()
  const job = jobs.get(id)
  if (!job || job.ownerId !== ownerId) return null
  return job
}

export function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    stage: job.stage,
    reportId: job.reportId,
    error: job.error,
  }
}

/**
 * Runs the full pipeline, advancing stages as real work completes.
 * Dependencies are injectable so the pipeline can be tested without YouTube or
 * AI provider credentials.
 */
export async function runRoastJob(job, context, deps = {}) {
  const {
    collect = collectYouTubeData,
    analyze = analyzeContent,
    generate = generateRoastReport,
    save = saveReport,
    model,
  } = deps

  try {
    job.status = 'running'
    setStage(job, ROAST_STAGES.checkingPermissions)
    if (!isConnected(context)) {
      throw AppError.forbidden(
        'Connect your YouTube account before generating a roast.',
        'YOUTUBE_PERMISSION_REQUIRED',
      )
    }

    setStage(job, ROAST_STAGES.fetchingMetadata)
    const data = await collect(context)

    setStage(job, ROAST_STAGES.analyzing)
    const analysis = analyze(data)
    if (!analysis.hasData) {
      throw new AppError(
        422,
        'YOUTUBE_NO_DATA',
        'We could not find any liked videos, subscriptions, or playlist items to analyze. Like a few videos or follow some channels, then try again.',
      )
    }

    setStage(job, ROAST_STAGES.generating)
    const aiReport = await generate(analysis, { model })

    setStage(job, ROAST_STAGES.preparingReport)
    const report = buildReport(aiReport, analysis, { model, availability: data.availability })
    const saved = await save(job.ownerId, report)

    job.status = 'ready'
    job.reportId = saved.id
    job.stage = ROAST_STAGES.ready
    job.updatedAt = Date.now()
    return job
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : AppError.serviceUnavailable(
            'Something went wrong while generating your roast. Please try again.',
            'ROAST_FAILED',
          )

    job.status = 'failed'
    job.stage = ROAST_STAGES.failed
    job.error = { code: appError.code, message: appError.message }
    job.updatedAt = Date.now()

    if (appError.statusCode >= 500) {
      logger.error('Roast job failed', { code: appError.code, message: appError.message })
    } else {
      logger.warn('Roast job ended without a report', { code: appError.code })
    }
    return job
  }
}
