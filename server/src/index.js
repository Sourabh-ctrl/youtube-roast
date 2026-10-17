/**
 * Vercel serverless entry point.
 *
 * Vercel's zero-config Express detection requires a file at one of its known
 * locations (`app`/`index`/`server`, at the project root or under `src/`) that
 * imports the `express` package and default-exports the app (or starts a port
 * listener). This file satisfies both: it imports express and default-exports
 * the real app built by `createApp`.
 *
 * Unlike `src/main.js`, this entry does NOT connect to MongoDB at module load.
 * A cold start that cannot reach the database would otherwise crash the whole
 * function (500 FUNCTION_INVOCATION_FAILED) before any route could respond. The
 * connection is established lazily on the first request and cached across warm
 * invocations; failures surface as a clear 503 instead of a blank 500.
 */
import express from 'express'
import { loadEnv } from './config/env.js'
import { connectDatabase } from './config/database.js'
import { configurePersistence } from './config/persistence.js'
import { createApp } from './createApp.js'
import { AppError } from './utils/appError.js'
import { logger } from './utils/logger.js'

// Vercel's zero-config Express detection scans this entry file for an import of
// the `express` package. The app is assembled in createApp, so express is
// otherwise unused here.
void express

const config = loadEnv()

let ready

function ensureDatabase(req, res, next) {
  if (!config.mongoUri) return next()

  if (!ready) {
    ready = (async () => {
      const mongoClient = await connectDatabase({
        uri: config.mongoUri,
        dbName: config.mongoDb,
      })
      await configurePersistence(mongoClient.db(config.mongoDb))
    })().catch((error) => {
      ready = undefined
      logger.error('Database initialization failed', { message: error.message })
      throw AppError.serviceUnavailable(
        'The database is unavailable. Please try again shortly.',
        'DATABASE_UNAVAILABLE',
      )
    })
  }

  return ready.then(() => next(), next)
}

const app = createApp(config, { init: ensureDatabase })

export default app
