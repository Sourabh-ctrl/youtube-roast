import { google } from 'googleapis'
import { createOAuthClient, YOUTUBE_READONLY_SCOPE } from '../config/google.js'
import { AppError } from '../utils/appError.js'
import { logger } from '../utils/logger.js'

/**
 * Sampling caps. The YouTube Data API allows deeper pagination, but the
 * roast only needs a representative sample and every page costs quota
 * (1 unit per list call against a default 10,000/day budget).
 */
export const LIMITS = Object.freeze({
  likedVideos: 200,
  subscriptions: 200,
  playlists: 25,
  playlistItems: 25,
  playlistsWithItems: 10,
  pageSize: 50,
})

const DATA_CACHE_TTL_MS = 15 * 60 * 1000
const CATEGORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000

let categoryCache = { regionCode: null, fetchedAt: 0, categories: {} }

const WATCH_HISTORY_LIMITATION = Object.freeze({
  available: false,
  reason: 'NOT_SUPPORTED',
  message:
    'YouTube does not expose your full watch history to third-party apps. Liked videos and subscriptions are the supported alternatives.',
})

/**
 * Builds an authorized YouTube Data API service for the current session.
 * The OAuth2 client carries the credentials and token-refresh handler; the
 * returned service exposes the resources (channels, videos, ...) used by the
 * fetchers. Refreshed tokens are written back onto the session object so the
 * store persists them at the end of the request.
 */
export function getAuthorizedClient(session) {
  const oauth = session?.oauth
  if (!oauth?.accessToken) return null

  const auth = createOAuthClient()
  auth.setCredentials({
    access_token: oauth.accessToken,
    refresh_token: oauth.refreshToken ?? undefined,
    expiry_date: oauth.expiryDate ?? undefined,
    scope: (oauth.scope ?? []).join(' '),
  })

  auth.on('tokens', (tokens) => {
    if (tokens.access_token) oauth.accessToken = tokens.access_token
    if (tokens.refresh_token) oauth.refreshToken = tokens.refresh_token
    if (tokens.expiry_date) oauth.expiryDate = tokens.expiry_date
  })

  return google.youtube({ version: 'v3', auth })
}

export function isConnected(session) {
  const scopes = session?.oauth?.scope ?? []
  return Boolean(session?.oauth?.accessToken && scopes.includes(YOUTUBE_READONLY_SCOPE))
}

function wrapYoutubeError(error) {
  const status = error?.response?.status ?? error?.code
  const dataError = error?.response?.data?.error
  const reason =
    dataError?.errors?.[0]?.reason ??
    error?.errors?.[0]?.reason ??
    (typeof dataError === 'string' ? dataError : null)

  // Provider-level detail for logs only. Never surfaced to the browser in
  // production; the logger redacts anything resembling a secret.
  const providerMessage =
    (typeof dataError === 'string' ? dataError : dataError?.message) ?? error?.message ?? null
  const requestUrl = error?.response?.config?.url ?? error?.config?.url ?? null

  if (dataError === 'invalid_grant' || status === 401) {
    logger.warn('YouTube token rejected', { status, reason, message: providerMessage, url: requestUrl })
    return AppError.unauthorized(
      'Your YouTube connection expired. Please reconnect your account.',
      'YOUTUBE_RECONNECT_REQUIRED',
    )
  }

  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded') {
    return AppError.serviceUnavailable(
      'The YouTube API quota has been reached. Please try again later.',
      'YOUTUBE_QUOTA_EXCEEDED',
    )
  }

  if (status === 403 || reason === 'accountClosed' || reason === 'accountSuspended') {
    logger.warn('YouTube access denied', { status, reason, message: providerMessage, url: requestUrl })
    return AppError.forbidden(
      'YouTube did not allow access to that data.',
      'YOUTUBE_PERMISSION_REQUIRED',
    )
  }

  logger.warn('YouTube API call failed', { status, reason, message: providerMessage, url: requestUrl })
  return AppError.serviceUnavailable(
    'Could not reach YouTube right now. Please try again.',
    'YOUTUBE_UNAVAILABLE',
  )
}

const FATAL_CODES = new Set(['YOUTUBE_RECONNECT_REQUIRED', 'YOUTUBE_QUOTA_EXCEEDED'])

/**
 * Collects a source without letting one unavailable source sink the whole
 * report. Connection/quota failures are fatal; anything else degrades to an
 * "unavailable" source the UI can explain.
 */
async function attempt(collect) {
  try {
    return { ok: true, value: await collect() }
  } catch (error) {
    const appError = error instanceof AppError ? error : wrapYoutubeError(error)
    if (FATAL_CODES.has(appError.code)) throw appError
    return { ok: false, error: appError }
  }
}

async function paginate(
  resource,
  method,
  { params, extract, limit, pageSize = LIMITS.pageSize, maxPages = 12 },
) {
  const items = []
  let pageToken
  let total = null
  let hasMore = false
  let pages = 0

  do {
    let response
    try {
      // Called on the resource so googleapis keeps its `this.context`.
      response = await resource[method]({ ...params, maxResults: pageSize, pageToken })
    } catch (error) {
      throw wrapYoutubeError(error)
    }

    const data = response.data ?? {}
    if (total === null) total = data.pageInfo?.totalResults ?? null

    for (const item of data.items ?? []) items.push(extract(item))

    pageToken = data.nextPageToken
    pages += 1
  } while (pageToken && items.length < limit && pages < maxPages)

  hasMore = Boolean(pageToken)
  return { items: items.slice(0, limit), total, truncated: hasMore, pages }
}

export function fetchChannel(client) {
  return attempt(async () => {
    const { data } = await client.channels.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
    })
    const channel = data.items?.[0]
    if (!channel) return null
    return {
      id: channel.id,
      title: channel.snippet?.title ?? '',
      thumbnail: channel.snippet?.thumbnails?.default?.url ?? null,
      publishedAt: channel.snippet?.publishedAt ?? null,
      relatedPlaylists: channel.contentDetails?.relatedPlaylists ?? null,
    }
  })
}

export function fetchLikedVideos(client) {
  return attempt(() =>
    paginate(client.videos, 'list', {
      limit: LIMITS.likedVideos,
      params: { part: ['snippet'], myRating: 'like' },
      extract: (item) => ({
        type: 'likedVideo',
        videoId: item.id,
        videoTitle: item.snippet?.title ?? '',
        channelId: item.snippet?.channelId ?? null,
        channelTitle: item.snippet?.channelTitle ?? '',
        categoryId: item.snippet?.categoryId ?? null,
        publishedAt: item.snippet?.publishedAt ?? null,
      }),
    }),
  )
}

export function fetchSubscriptions(client) {
  return attempt(() =>
    paginate(client.subscriptions, 'list', {
      limit: LIMITS.subscriptions,
      params: { part: ['snippet'], mine: true, order: 'alphabetical' },
      extract: (item) => ({
        type: 'subscription',
        channelId: item.snippet?.resourceId?.channelId ?? null,
        channelTitle: item.snippet?.title ?? '',
        publishedAt: item.snippet?.publishedAt ?? null,
      }),
    }),
  )
}

export function fetchPlaylists(client) {
  return attempt(() =>
    paginate(client.playlists, 'list', {
      limit: LIMITS.playlists,
      params: { part: ['snippet', 'contentDetails', 'status'], mine: true },
      extract: (item) => ({
        type: 'playlist',
        playlistId: item.id,
        title: item.snippet?.title ?? '',
        itemCount: item.contentDetails?.itemCount ?? null,
        privacyStatus: item.status?.privacyStatus ?? null,
        publishedAt: item.snippet?.publishedAt ?? null,
      }),
    }),
  )
}

export function fetchPlaylistItems(client, playlists) {
  return attempt(async () => {
    const targets = playlists.slice(0, LIMITS.playlistsWithItems)
    const items = []
    for (const playlist of targets) {
      const page = await paginate(client.playlistItems, 'list', {
        limit: LIMITS.playlistItems,
        maxPages: 1,
        params: { part: ['snippet'], playlistId: playlist.playlistId },
        extract: (item) => ({
          type: 'playlistItem',
          playlistId: playlist.playlistId,
          playlistTitle: playlist.title,
          videoId: item.snippet?.resourceId?.videoId ?? null,
          videoTitle: item.snippet?.title ?? '',
          channelTitle: item.snippet?.videoChannelTitle ?? item.snippet?.channelTitle ?? '',
          publishedAt: item.snippet?.publishedAt ?? null,
        }),
      })
      items.push(...page.items)
    }
    return { items, total: items.length, truncated: false, pages: targets.length }
  })
}

export function fetchVideoCategories(client, regionCode = 'US') {
  return attempt(async () => {
    const now = Date.now()
    if (categoryCache.regionCode === regionCode && now - categoryCache.fetchedAt < CATEGORY_CACHE_TTL_MS) {
      return categoryCache.categories
    }

    const { data } = await client.videoCategories.list({ part: ['snippet'], regionCode })
    const categories = {}
    for (const item of data.items ?? []) categories[item.id] = item.snippet?.title ?? ''

    categoryCache = { regionCode, fetchedAt: now, categories }
    return categories
  })
}

function sourceStatus(result, { total, sampled, truncated, note } = {}) {
  return {
    available: result.ok,
    reason: result.ok ? null : result.error.code,
    message: result.ok ? null : result.error.message,
    total: total ?? null,
    sampled: sampled ?? null,
    truncated: Boolean(truncated),
    note: note ?? null,
  }
}

function buildAvailability({ channel, liked, subs, playlists, playlistItems, categories }) {
  return {
    watchHistory: { ...WATCH_HISTORY_LIMITATION },
    channel: sourceStatus(channel, { sampled: channel.value ? 1 : 0, total: channel.value ? 1 : 0 }),
    likedVideos: sourceStatus(liked, {
      total: liked.value?.total ?? null,
      sampled: liked.value?.items.length ?? 0,
      truncated: liked.value?.truncated ?? false,
      note: 'The API only exposes up to your 1,000 most recent liked videos.',
    }),
    subscriptions: sourceStatus(subs, {
      total: subs.value?.total ?? null,
      sampled: subs.value?.items.length ?? 0,
      truncated: subs.value?.truncated ?? false,
    }),
    playlists: sourceStatus(playlists, {
      total: playlists.value?.total ?? null,
      sampled: playlists.value?.items.length ?? 0,
      truncated: playlists.value?.truncated ?? false,
    }),
    playlistItems: playlists.ok
      ? sourceStatus(playlistItems, {
          total: playlistItems.value?.total ?? null,
          sampled: playlistItems.value?.items.length ?? 0,
        })
      : {
          available: false,
          reason: playlists.error.code,
          message: 'Playlist items depend on your playlists, which could not be loaded.',
          total: null,
          sampled: 0,
          truncated: false,
          note: null,
        },
    categories: sourceStatus(categories, { sampled: Object.keys(categories.value ?? {}).length }),
  }
}

async function fetchAll(client) {
  const [channel, liked, subs, playlists, categories] = await Promise.all([
    fetchChannel(client),
    fetchLikedVideos(client),
    fetchSubscriptions(client),
    fetchPlaylists(client),
    fetchVideoCategories(client),
  ])

  const playlistItems = await fetchPlaylistItems(client, playlists.value?.items ?? [])

  return {
    channel: channel.value ?? null,
    likedVideos: liked.value?.items ?? [],
    subscriptions: subs.value?.items ?? [],
    playlists: playlists.value?.items ?? [],
    playlistItems: playlistItems.value?.items ?? [],
    categories: categories.value ?? {},
    availability: buildAvailability({ channel, liked, subs, playlists, playlistItems, categories }),
    fetchedAt: Date.now(),
  }
}

/**
 * Coalesces concurrent fetches for the same session. The dashboard asks for
 * the preview and the availability at the same time, and a fresh session has
 * no cache yet, so without this both requests would spend the full quota on
 * an identical upstream fetch.
 */
const inFlightFetches = new Map()

/**
 * Gathers a normalized snapshot of the accessible YouTube data for the
 * session, caching the result in the session to avoid re-spending quota on
 * every preview. Pass { force: true } to bypass the cache.
 */
export async function collectYouTubeData(session, { force = false, client } = {}) {
  if (!isConnected(session)) {
    throw AppError.forbidden(
      'Connect your YouTube account before analyzing your data.',
      'YOUTUBE_PERMISSION_REQUIRED',
    )
  }

  const cached = session.youtubeData
  if (!force && cached?.fetchedAt && Date.now() - cached.fetchedAt < DATA_CACHE_TTL_MS) {
    return { ...cached.payload, cached: true }
  }

  const key = session.id
  if (key && !force && inFlightFetches.has(key)) {
    const payload = await inFlightFetches.get(key)
    session.youtubeData = { fetchedAt: payload.fetchedAt, payload }
    return { ...payload, cached: true }
  }

  const pending = fetchAll(client ?? getAuthorizedClient(session))
  if (key && !force) inFlightFetches.set(key, pending)

  try {
    const payload = await pending
    session.youtubeData = { fetchedAt: payload.fetchedAt, payload }
    return { ...payload, cached: false }
  } finally {
    if (key && !force) inFlightFetches.delete(key)
  }
}

export function buildPreview(payload) {
  return {
    channel: payload.channel,
    likedVideos: payload.likedVideos.slice(0, 5),
    subscriptions: payload.subscriptions.slice(0, 5),
    playlists: payload.playlists.slice(0, 5),
    playlistItems: payload.playlistItems.slice(0, 5),
    categories: payload.categories,
    availability: payload.availability,
    fetchedAt: payload.fetchedAt,
  }
}
