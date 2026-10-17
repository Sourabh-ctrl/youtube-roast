import { AppError } from '../utils/appError.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Defense-in-depth CSRF protection for cookie-authenticated requests.
 * Production cookies use SameSite=None (client and API are on different
 * domains), so state-changing requests must also originate from our client.
 */
export function requireSameOrigin(config) {
  return function sameOriginGuard(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next()

    const origin = req.get('origin')
    if (origin && origin === config.clientUrl) return next()

    return next(
      AppError.forbidden('Request origin is not allowed.', 'CROSS_ORIGIN_BLOCKED'),
    )
  }
}
