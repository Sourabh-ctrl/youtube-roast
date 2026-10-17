import { AppError } from '../utils/appError.js'

export function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return next(AppError.unauthorized('You must be signed in to do that.'))
  }
  return next()
}
