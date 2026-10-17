import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import healthRoutes from './routes/health.routes.js'
import { createAuthApiRouter, createOAuthRouter } from './routes/auth.routes.js'
import { createYouTubeRouter } from './routes/youtube.routes.js'
import { createRoastRouter } from './routes/roast.routes.js'
import { apiLimiter, strictLimiter } from './middleware/rateLimiter.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { sessionMiddleware } from './config/session.js'
import { assertGoogleConfigured } from './config/google.js'
import { AppError } from './utils/appError.js'

export function createApp(config, { mongoClient } = {}) {
  assertGoogleConfigured()

  const app = express()
  app.locals.config = config

  if (config.isProduction) app.set('trust proxy', 1)

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === config.clientUrl) return callback(null, true)
        return callback(AppError.forbidden('Origin not allowed by CORS.', 'CORS_ORIGIN_DENIED'))
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '10kb' }))
  app.use(sessionMiddleware(config, { mongoClient }))

  app.use('/api', apiLimiter)

  app.use('/auth', strictLimiter, createOAuthRouter())
  app.use('/api/auth', strictLimiter, createAuthApiRouter(config))
  app.use('/api/youtube', createYouTubeRouter())
  app.use('/api/roasts', strictLimiter, createRoastRouter(config))
  app.use('/api/health', healthRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
