import { isConnected } from '../services/youtube.service.js'
import { AppError } from '../utils/appError.js'

/**
 * Guards endpoints that need an active YouTube grant. Signing in with
 * Google does not imply YouTube access, so this is checked separately.
 */
export function requireYouTubeConnection(req, res, next) {
  if (!isConnected(req.session)) {
    return next(
      AppError.forbidden(
        'Connect your YouTube account to access this data.',
        'YOUTUBE_PERMISSION_REQUIRED',
      ),
    )
  }
  return next()
}
