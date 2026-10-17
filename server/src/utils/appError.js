/**
 * Operational error carrying a stable machine-readable code for the
 * standard API error envelope.
 */
export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true
    Error.captureStackTrace?.(this, AppError)
  }

  static badRequest(message, code = 'BAD_REQUEST', details) {
    return new AppError(400, code, message, details)
  }

  static unauthorized(message, code = 'UNAUTHENTICATED') {
    return new AppError(401, code, message)
  }

  static forbidden(message, code = 'FORBIDDEN') {
    return new AppError(403, code, message)
  }

  static notFound(message, code = 'NOT_FOUND') {
    return new AppError(404, code, message)
  }

  static tooManyRequests(message, code = 'RATE_LIMITED') {
    return new AppError(429, code, message)
  }

  static serviceUnavailable(message, code = 'SERVICE_UNAVAILABLE') {
    return new AppError(503, code, message)
  }
}
