import { describe, expect, it } from 'vitest'
import {
  parseRoastReport,
  extractJson,
  CANONICAL_DISCLAIMER,
  ROAST_LIMITS,
} from '../../src/schemas/roast.schema.js'
import { VALID_AI_REPORT } from '../helpers/fixtures.js'

function clone() {
  return structuredClone(VALID_AI_REPORT)
}

function expectInvalid(candidate) {
  try {
    parseRoastReport(candidate)
    throw new Error('expected parseRoastReport to reject')
  } catch (error) {
    expect(error.code).toBe('AI_INVALID_OUTPUT')
    return error
  }
}

describe('extractJson', () => {
  it('unwraps code fences', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it('tolerates surrounding prose', () => {
    expect(extractJson('Sure! {"a":2} hope that helps')).toEqual({ a: 2 })
  })

  it('returns null for non-JSON input', () => {
    expect(extractJson('not json at all')).toBeNull()
    expect(extractJson(undefined)).toBeNull()
    expect(extractJson('')).toBeNull()
  })
})

describe('parseRoastReport', () => {
  it('accepts a valid report and forces the canonical disclaimer', () => {
    const parsed = parseRoastReport({ ...clone(), disclaimer: 'model-supplied text' })
    expect(parsed.brainRotScore).toBe(72)
    expect(parsed.disclaimer).toBe(CANONICAL_DISCLAIMER)
  })

  it('parses a JSON string payload', () => {
    expect(parseRoastReport(JSON.stringify(clone())).brainRotScore).toBe(72)
  })

  it('rejects scores outside 0-100', () => {
    expectInvalid({ ...clone(), brainRotScore: 101 })
    expectInvalid({ ...clone(), brainRotScore: -1 })
  })

  it('rejects a non-integer score', () => {
    expectInvalid({ ...clone(), brainRotScore: 72.5 })
  })

  it('rejects missing required fields', () => {
    const missingRoast = clone()
    delete missingRoast.roast
    expectInvalid(missingRoast)
  })

  it('rejects too many array entries', () => {
    expectInvalid({
      ...clone(),
      topInterests: Array.from({ length: ROAST_LIMITS.maxInterests + 1 }, () => ({
        category: 'x',
        observation: 'y',
        evidenceCount: 1,
      })),
    })
    expectInvalid({
      ...clone(),
      redFlags: Array.from({ length: ROAST_LIMITS.maxRedFlags + 1 }, () => ({
        title: 'x',
        description: 'y',
      })),
    })
  })

  it('rejects empty arrays', () => {
    expectInvalid({ ...clone(), topInterests: [] })
    expectInvalid({ ...clone(), positiveObservations: [] })
  })

  it('rejects oversized strings', () => {
    expectInvalid({ ...clone(), roast: 'x'.repeat(1201) })
    expectInvalid({ ...clone(), positiveObservations: ['x'.repeat(301)] })
  })

  it('rejects malformed JSON strings', () => {
    expectInvalid('this is not json')
  })

  it('rejects non-object payloads', () => {
    expectInvalid(null)
    expectInvalid(42)
  })
})
