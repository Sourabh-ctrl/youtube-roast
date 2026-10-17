import rateLimit from 'express-rate-limit'
import { AppError } from '../utils/appError.js'

// Disabled under test so integration suites can exercise routes freely.
const isTest = process.env.NODE_ENV === 'test'

function limitHandler(req, res, next) {
  next(AppError.tooManyRequests('Too many requests. Please slow down and try again shortly.'))
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => isTest,
  handler: limitHandler,
})

/**
 * Stricter bucket for expensive or abuse-prone endpoints (OAuth, AI
 * generation). Registered in the phases that add those routes.
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => isTest,
  handler: limitHandler,
})
