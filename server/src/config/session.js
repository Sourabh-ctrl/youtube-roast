import session from 'express-session'
import MongoStore from 'connect-mongo'
import { requireEnv } from './env.js'
import { logger } from '../utils/logger.js'

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

export function sessionMiddleware(config, { mongoClient } = {}) {
  const { SESSION_SECRET } = requireEnv(['SESSION_SECRET'])

  if (SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters for session encryption.')
  }

  let store
  if (mongoClient) {
    store = MongoStore.create({
      clientPromise: Promise.resolve(mongoClient),
      dbName: config.mongoDb,
      collectionName: 'sessions',
      ttl: SESSION_TTL_SECONDS,
      touchAfter: 24 * 60 * 60,
      crypto: { secret: SESSION_SECRET },
    })
  } else if (config.mongoUri) {
    // Lazy store: connect-mongo opens the connection on first use. This lets the
    // serverless entry export the app without awaiting a DB connection at boot.
    store = MongoStore.create({
      mongoUrl: config.mongoUri,
      dbName: config.mongoDb,
      collectionName: 'sessions',
      ttl: SESSION_TTL_SECONDS,
      touchAfter: 24 * 60 * 60,
      crypto: { secret: SESSION_SECRET },
    })
  } else {
    logger.warn('Using in-memory session store. Do not use this outside development/tests.')
  }

  return session({
    name: 'rt.sid',
    secret: SESSION_SECRET,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS * 1000,
    },
  })
}
