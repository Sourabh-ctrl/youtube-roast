import { Router } from 'express'
import * as youtubeController from '../controllers/youtube.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireYouTubeConnection } from '../middleware/requireYouTubeConnection.js'

export function createYouTubeRouter() {
  const router = Router()

  router.get('/status', requireAuth, youtubeController.status)
  router.get(
    '/data-availability',
    requireAuth,
    requireYouTubeConnection,
    asyncHandler(youtubeController.dataAvailability),
  )
  router.get(
    '/preview',
    requireAuth,
    requireYouTubeConnection,
    asyncHandler(youtubeController.preview),
  )

  return router
}
