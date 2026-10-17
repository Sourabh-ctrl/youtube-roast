import { ensureUserIndexes, createMongoUserStore } from '../models/user.model.js'
import { ensureReportIndexes, createMongoReportStore } from '../models/report.model.js'
import { configureReportStore } from '../services/report.service.js'
import { configureUserStore } from '../services/user.service.js'
import { logger } from '../utils/logger.js'

/**
 * Binds the MongoDB-backed stores and ensures their indexes exist. Called once
 * at boot, after the database connection is established.
 */
export async function configurePersistence(db) {
  await ensureUserIndexes(db)
  await ensureReportIndexes(db)
  configureReportStore(createMongoReportStore(db))
  configureUserStore(createMongoUserStore(db))
  logger.info('MongoDB persistence configured')
}
