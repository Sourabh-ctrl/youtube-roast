import { createApp } from '../../src/createApp.js'
import { TEST_CONFIG } from './fixtures.js'

/**
 * Builds the real Express app with a credential-free test config. No MongoDB
 * client is passed, so the session middleware falls back to its in-memory store
 * and report/user persistence falls back to their in-memory implementations.
 */
export function buildApp() {
  return createApp(TEST_CONFIG)
}
