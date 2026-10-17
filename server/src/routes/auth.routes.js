import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireSameOrigin } from '../middleware/requireSameOrigin.js'

export function createOAuthRouter() {
  const router = Router()
  router.get('/google', asyncHandler(authController.beginAuth))
  router.get('/google/youtube', requireAuth, asyncHandler(authController.beginYoutubeAuth))
  router.get('/google/callback', asyncHandler(authController.handleCallback))
  return router
}

export function createAuthApiRouter(config) {
  const router = Router()
  const sameOrigin = requireSameOrigin(config)

  router.get('/me', authController.me)
  router.post('/logout', sameOrigin, authController.logout)
  router.post(
    '/disconnect-youtube',
    sameOrigin,
    requireAuth,
    asyncHandler(authController.disconnectYouTube),
  )

  return router
}
