import { AppError } from '../utils/appError.js'
import { logger } from '../utils/logger.js'

function fail(res, statusCode, code, message, details) {
  const body = { success: false, error: { code, message } }
  if (details) body.error.details = details
  return res.status(statusCode).json(body)
}

export function notFoundHandler(req, res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'))
}

/**
 * Terminal error middleware. Normalises every failure into the standard
 * envelope and never leaks internals in production.
 */
export function errorHandler(err, req, res, next) {
  void next
  if (err?.type === 'entity.too.large') {
    return fail(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.')
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return fail(res, 400, 'INVALID_JSON', 'Request body must be valid JSON.')
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error(err.code, { path: req.originalUrl, message: err.message })
    return fail(res, err.statusCode, err.code, err.message, err.details)
  }

  logger.error('UNHANDLED_ERROR', {
    path: req.originalUrl,
    method: req.method,
    message: err?.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
  })

  return fail(res, 500, 'INTERNAL_ERROR', 'Something went wrong on our end.')
}
