import { loadEnv } from './config/env.js'
import { connectDatabase } from './config/database.js'
import { configurePersistence } from './config/persistence.js'
import { createApp } from './createApp.js'
import { logger } from './utils/logger.js'

async function main() {
  let config
  try {
    config = loadEnv()
  } catch (error) {
    logger.error('Invalid environment configuration', { message: error.message })
    process.exit(1)
  }

  let mongoClient
  try {
    if (config.nodeEnv !== 'test') {
      mongoClient = await connectDatabase({
        uri: config.mongoUri,
        dbName: config.mongoDb,
      })
      await configurePersistence(mongoClient.db(config.mongoDb))
    }
  } catch (error) {
    logger.error('Could not connect to the database', { message: error.message })
    process.exit(1)
  }

  let app
  try {
    app = createApp(config, { mongoClient })
  } catch (error) {
    logger.error('Server configuration is invalid', { message: error.message })
    process.exit(1)
  }

  const server = app.listen(config.port, () => {
    logger.info('RoastTube API listening', {
      url: `http://localhost:${config.port}`,
      env: config.nodeEnv,
      clientUrl: config.clientUrl,
    })
  })

  server.on('error', (error) => {
    logger.error('Server failed to start', { code: error.code, message: error.message })
    process.exit(1)
  })

  const shutdown = (signal) => async () => {
    logger.info(`Received ${signal}, shutting down`)
    server.close(async () => {
      await mongoClient?.close().catch(() => {})
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown('SIGINT'))
  process.on('SIGTERM', shutdown('SIGTERM'))
}

main()
