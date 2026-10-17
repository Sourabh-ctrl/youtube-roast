import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const baseSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(5000),
  CLIENT_URL: z.url().default('http://localhost:5173'),
  MONGODB_URI: z.string().trim().default(''),
  SESSION_STORE_URI: z.string().trim().default(''),
  MONGODB_DB: z.string().trim().min(1).default('roasttube'),
})

function formatIssues(issues) {
  return issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ')
}

/**
 * Validates configuration required to boot the server. External service
 * credentials (OAuth, Gemini, MongoDB) are validated by the features that
 * need them via requireEnv(), so the server can run before those credentials
 * are configured.
 */
export function loadEnv() {
  const parsed = baseSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    CLIENT_URL: process.env.CLIENT_URL,
    MONGODB_URI: process.env.MONGODB_URI,
    SESSION_STORE_URI: process.env.SESSION_STORE_URI,
    MONGODB_DB: process.env.MONGODB_DB,
  })

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration -> ${formatIssues(parsed.error.issues)}`)
  }

  const { NODE_ENV, PORT, CLIENT_URL, MONGODB_URI, SESSION_STORE_URI, MONGODB_DB } = parsed.data
  const mongoUri = SESSION_STORE_URI || MONGODB_URI

  if (NODE_ENV !== 'test' && !mongoUri) {
    throw new Error(
      'Missing session store URI. Set SESSION_STORE_URI or MONGODB_URI in server/.env.',
    )
  }

  return Object.freeze({
    nodeEnv: NODE_ENV,
    port: PORT,
    clientUrl: CLIENT_URL.replace(/\/$/, ''),
    isProduction: NODE_ENV === 'production',
    mongoUri,
    mongoDb: MONGODB_DB,
  })
}

/**
 * Throws when any of the given environment variables are missing or blank.
 * Call this in the feature that needs the credentials, not on every boot.
 * Never logs the values.
 */
export function requireEnv(keys) {
  const missing = keys.filter((key) => !process.env[key]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Add them to server/.env.`,
    )
  }
  return Object.fromEntries(keys.map((key) => [key, process.env[key].trim()]))
}
