/**
 * Vercel serverless entry point.
 *
 * Vercel's zero-config Express detection requires a file at one of its known
 * locations (`app`/`index`/`server`, at the project root or under `src/`) that
 * imports the `express` package and default-exports the app (or starts a port
 * listener). This file satisfies both: it imports express and exports the real
 * app built by `createApp`.
 *
 * The MongoDB connection is established here (top-level await) because the
 * production session store and report/user persistence both depend on it.
 *
 * The long-running local bootstrap lives in `src/main.js`. It is intentionally
 * not named `server.js`, so Vercel does not mistake it for the entry.
 */
import express from 'express'
import { loadEnv } from './config/env.js'
import { connectDatabase } from './config/database.js'
import { configurePersistence } from './config/persistence.js'
import { createApp } from './createApp.js'
import { logger } from './utils/logger.js'

// Vercel's zero-config Express detection scans this entry file for an import of
// the `express` package. The app is assembled in createApp, so express is
// otherwise unused here.
void express

const config = loadEnv()

let mongoClient
if (config.mongoUri) {
  mongoClient = await connectDatabase({
    uri: config.mongoUri,
    dbName: config.mongoDb,
  })
  await configurePersistence(mongoClient.db(config.mongoDb))
} else {
  logger.warn('No MongoDB URI configured. Sessions and reports will not persist.')
}

const app = createApp(config, { mongoClient })

export default app
