import { Router } from 'express'
import * as roastController from '../controllers/roast.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireYouTubeConnection } from '../middleware/requireYouTubeConnection.js'
import { requireSameOrigin } from '../middleware/requireSameOrigin.js'

export function createRoastRouter(config) {
  const router = Router()
  const sameOrigin = requireSameOrigin(config)

  router.post(
    '/',
    sameOrigin,
    requireAuth,
    requireYouTubeConnection,
    asyncHandler(roastController.createRoast),
  )
  router.get('/history', requireAuth, asyncHandler(roastController.history))
  router.get('/jobs/:jobId', requireAuth, asyncHandler(roastController.jobStatus))
  router.get('/:id', requireAuth, asyncHandler(roastController.getRoast))
  router.delete('/:id', sameOrigin, requireAuth, asyncHandler(roastController.removeRoast))

  return router
}
