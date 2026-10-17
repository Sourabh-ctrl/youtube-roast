import { z } from 'zod'
import { AppError } from '../utils/appError.js'

/**
 * Canonical disclaimer. We never trust the model to produce this: whatever it
 * returns is overwritten so the safety framing is identical on every report.
 */
export const CANONICAL_DISCLAIMER =
  'This is an AI-generated entertainment report based only on the YouTube data you chose to share. It is not a scientific personality assessment and not a diagnosis.'

export const ROAST_LIMITS = Object.freeze({
  maxInterests: 6,
  maxRedFlags: 4,
  maxPositiveObservations: 4,
})

const topInterest = z.object({
  category: z.string().trim().min(1).max(60),
  observation: z.string().trim().min(1).max(300),
  evidenceCount: z.number().int().min(0).max(1_000_000),
})

const redFlag = z.object({
  title: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(300),
})

export const roastReportSchema = z.object({
  brainRotScore: z.number().int().min(0).max(100),
  scoreExplanation: z.string().trim().min(1).max(400),
  personalitySummary: z.string().trim().min(1).max(800),
  topInterests: z.array(topInterest).min(1).max(ROAST_LIMITS.maxInterests),
  redFlags: z.array(redFlag).min(1).max(ROAST_LIMITS.maxRedFlags),
  roast: z.string().trim().min(1).max(1200),
  positiveObservations: z
    .array(z.string().trim().min(1).max(300))
    .min(1)
    .max(ROAST_LIMITS.maxPositiveObservations),
  disclaimer: z.string().trim().min(1).max(400).optional(),
})

/**
 * Pulls a JSON object out of model text. Structured output should already be
 * clean JSON, but models occasionally wrap it in code fences or add prose, so
 * we defensively locate the outermost braces.
 */
export function extractJson(text) {
  if (typeof text !== 'string') return null
  let value = text.trim()
  if (!value) return null

  const fence = value.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) value = fence[1].trim()

  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null

  try {
    return JSON.parse(value.slice(start, end + 1))
  } catch {
    return null
  }
}

/**
 * Validates and normalises a raw model response into the report shape used by
 * the rest of the app. Rejects out-of-range scores, oversized arrays and
 * missing fields rather than silently repairing them.
 */
export function parseRoastReport(raw) {
  const object = typeof raw === 'string' ? extractJson(raw) : raw

  if (!object || typeof object !== 'object') {
    throw new AppError(
      502,
      'AI_INVALID_OUTPUT',
      'The AI returned something we could not read. Please try generating again.',
    )
  }

  const parsed = roastReportSchema.safeParse(object)
  if (!parsed.success) {
    throw new AppError(
      502,
      'AI_INVALID_OUTPUT',
      'The AI returned a report we could not validate. Please try generating again.',
      { issues: parsed.error.issues.map((issue) => issue.path.join('.') || 'report') },
    )
  }

  return { ...parsed.data, disclaimer: CANONICAL_DISCLAIMER }
}
