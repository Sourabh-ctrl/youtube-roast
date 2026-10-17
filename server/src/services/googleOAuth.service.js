import { randomBytes, createHash } from 'node:crypto'
import { createOAuthClient, SCOPE_SETS, AUTH_OPTIONS } from '../config/google.js'
import { AppError } from '../utils/appError.js'

const STATE_BYTES = 32

function base64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generateState() {
  return base64Url(randomBytes(STATE_BYTES))
}

function generatePkcePair() {
  const verifier = base64Url(randomBytes(32))
  const challenge = base64Url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

/**
 * Builds the Google consent URL and returns the values that must be
 * persisted in the session for the callback to validate the round trip.
 */
export function buildAuthorization(purpose = 'signIn') {
  const client = createOAuthClient()
  const state = generateState()
  const { verifier, challenge } = generatePkcePair()
  const options = AUTH_OPTIONS[purpose] ?? AUTH_OPTIONS.signIn

  const url = client.generateAuthUrl({
    scope: SCOPE_SETS[purpose] ?? SCOPE_SETS.signIn,
    state,
    include_granted_scopes: true,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...options,
  })

  return { url, state, codeVerifier: verifier, purpose }
}

export async function exchangeCode({ code, codeVerifier }) {
  const client = createOAuthClient()
  try {
    const { tokens } = await client.getToken({ code, codeVerifier })
    return { client, tokens }
  } catch (error) {
    throw new AppError(
      400,
      'OAUTH_EXCHANGE_FAILED',
      'Could not complete Google sign-in. Please try again.',
      { provider: error?.response?.data?.error ?? undefined },
    )
  }
}

export async function decodeIdentity(idToken) {
  const client = createOAuthClient()
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  const claims = ticket.getPayload() ?? {}
  return {
    googleId: claims.sub,
    email: claims.email,
    displayName: claims.name,
    avatarUrl: claims.picture,
  }
}

export async function revokeToken(token) {
  if (!token) return
  const client = createOAuthClient()
  try {
    await client.revokeToken(token)
  } catch {
    return
  }
}
