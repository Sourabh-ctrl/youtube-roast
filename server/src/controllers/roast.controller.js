import { waitUntil } from '@vercel/functions'
import { AppError } from '../utils/appError.js'
import {
  createRoastJob,
  getRoastJob,
  publicJob,
  runRoastJob,
} from '../services/roastJob.service.js'
import {
  deleteReport,
  getReport,
  listReports,
} from '../services/report.service.js'
import { aiModelId } from '../services/ai.service.js'

function ownerId(req) {
  return req.session.user.googleId
}

/**
 * Starts a roast job and returns immediately. The job advances real backend
 * stages that the client polls, so the UI progress reflects actual work.
 */
export function createRoast(req, res) {
  const session = req.session

  // Snapshot the credentials so the detached job never touches req.session
  // after the response has been sent.
  const context = {
    id: session.id,
    oauth: { ...session.oauth },
    youtubeData: session.youtubeData,
  }

  const job = createRoastJob({ ownerId: ownerId(req) })

  let model
  try {
    model = aiModelId()
  } catch {
    model = undefined
  }

  res.status(202).json({ success: true, job: publicJob(job) })

  // On Vercel the function may be frozen once the response is sent, which would
  // kill the detached job. waitUntil keeps this invocation alive until the job
  // settles. Off Vercel (local/Render) the promise simply runs detached.
  const task = runRoastJob(job, context, { model })
  if (process.env.VERCEL) {
    waitUntil(task)
  } else {
    void task
  }
}

export function jobStatus(req, res) {
  const job = getRoastJob(req.params.jobId, ownerId(req))
  if (!job) {
    throw AppError.notFound('That roast job was not found or has expired.', 'JOB_NOT_FOUND')
  }
  return res.json({ success: true, job: publicJob(job) })
}

export async function getRoast(req, res) {
  const found = await getReport(ownerId(req), req.params.id)
  if (!found) {
    throw AppError.notFound('That report was not found or has expired.', 'REPORT_NOT_FOUND')
  }
  return res.json({ success: true, id: found.id, createdAt: found.createdAt, report: found.report })
}

export async function history(req, res) {
  return res.json({ success: true, reports: await listReports(ownerId(req)) })
}

export async function removeRoast(req, res) {
  const deleted = await deleteReport(ownerId(req), req.params.id)
  if (!deleted) {
    throw AppError.notFound('That report was not found or has expired.', 'REPORT_NOT_FOUND')
  }
  return res.json({ success: true })
}
