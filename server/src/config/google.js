import { google } from 'googleapis'
import { requireEnv } from './env.js'

export const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'

export const SCOPE_SETS = Object.freeze({
  signIn: ['openid', 'email', 'profile'],
  youtube: ['openid', 'email', 'profile', YOUTUBE_READONLY_SCOPE],
})

/**
 * Per-purpose consent options. Signing in is a lightweight online grant;
 * connecting YouTube asks for offline access so Google issues a refresh
 * token we can use to refresh expired access tokens without re-prompting.
 */
export const AUTH_OPTIONS = Object.freeze({
  signIn: { access_type: 'online', prompt: 'select_account' },
  youtube: { access_type: 'offline', prompt: 'consent' },
})

export function googleConfig() {
  return requireEnv([
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
  ])
}

export function createOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } =
    googleConfig()

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL,
  )
}

export function assertGoogleConfigured() {
  googleConfig()
}
