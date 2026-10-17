import {
  buildAuthorization,
  exchangeCode,
  decodeIdentity,
  revokeToken,
} from '../services/googleOAuth.service.js'
import { recordUser } from '../services/user.service.js'
import { clearOwnerReports } from '../services/report.service.js'
import { YOUTUBE_READONLY_SCOPE } from '../config/google.js'
import { AppError } from '../utils/appError.js'
import { logger } from '../utils/logger.js'

function callbackUrl(config, query) {
  const url = new URL('/auth/callback', `${config.clientUrl}/`)
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value)
  }
  return url.toString()
}

function safeProfile(user) {
  return {
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }
}

function connectionStatus(session) {
  const scopes = session.oauth?.scope ?? []
  return {
    connected: Boolean(session.oauth?.accessToken && scopes.includes(YOUTUBE_READONLY_SCOPE)),
    scopes,
  }
}

function startAuthorization(req, res, purpose) {
  const { url, state, codeVerifier } = buildAuthorization(purpose)
  req.session.oauthState = state
  req.session.oauthCodeVerifier = codeVerifier
  req.session.oauthPurpose = purpose
  res.redirect(url)
}

export function beginAuth(req, res) {
  startAuthorization(req, res, 'signIn')
}

export function beginYoutubeAuth(req, res) {
  startAuthorization(req, res, 'youtube')
}

export async function handleCallback(req, res) {
  const { error, code, state } = req.query

  if (error) {
    return res.redirect(callbackUrl(req.app.locals.config, { error: 'oauth_cancelled' }))
  }

  const expectedState = req.session.oauthState
  const codeVerifier = req.session.oauthCodeVerifier

  if (!code || !state || !expectedState || state !== expectedState) {
    logger.warn('OAuth state validation failed')
    return res.redirect(callbackUrl(req.app.locals.config, { error: 'invalid_state' }))
  }

  try {
    const { tokens } = await exchangeCode({ code, codeVerifier })

    if (!tokens.id_token) {
      throw new AppError(400, 'OAUTH_NO_IDENTITY', 'Google did not return an identity token.')
    }

    const identity = await decodeIdentity(tokens.id_token)

    await new Promise((resolve, reject) => {
      req.session.regenerate((regenerateError) => {
        if (regenerateError) reject(regenerateError)
        else resolve()
      })
    })

    req.session.user = identity
    req.session.oauth = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiryDate: tokens.expiry_date ?? null,
      scope: (tokens.scope ?? '').split(' ').filter(Boolean),
    }

    // Persist the minimal profile, but never block sign-in on it.
    try {
      await recordUser(identity)
    } catch (profileError) {
      logger.warn('Could not persist user profile', { message: profileError.message })
    }

    return res.redirect(callbackUrl(req.app.locals.config, {}))
  } catch (error2) {
    const code2 =
      error2 instanceof AppError ? error2.code.toLowerCase() : 'oauth_failed'
    logger.warn('OAuth callback failed', { code: code2 })
    return res.redirect(callbackUrl(req.app.locals.config, { error: code2 }))
  }
}

export function me(req, res) {
  if (!req.session?.user) {
    return res.json({ success: true, authenticated: false, user: null, youtube: null })
  }

  return res.json({
    success: true,
    authenticated: true,
    user: safeProfile(req.session.user),
    youtube: connectionStatus(req.session),
  })
}

export function logout(req, res, next) {
  const cookieName = 'rt.sid'
  req.session.destroy((error) => {
    if (error) return next(new AppError(500, 'LOGOUT_FAILED', 'Could not sign you out.'))
    res.clearCookie(cookieName, { path: '/' })
    return res.json({ success: true })
  })
}

export async function disconnectYouTube(req, res, next) {
  try {
    const owner = req.session.user?.googleId
    const token = req.session.oauth?.refreshToken || req.session.oauth?.accessToken
    await revokeToken(token)
    delete req.session.oauth

    // Reports were derived from the connected account, so drop them too.
    if (owner) {
      try {
        await clearOwnerReports(owner)
      } catch (purgeError) {
        logger.warn('Could not clear saved reports on disconnect', { message: purgeError.message })
      }
    }

    return res.json({ success: true, youtube: connectionStatus(req.session) })
  } catch (error) {
    return next(error)
  }
}
