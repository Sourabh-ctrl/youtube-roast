import { buildAuthorization } from './src/services/googleOAuth.service.js'
import { requireYouTubeConnection } from './src/middleware/requireYouTubeConnection.js'
import {
  collectYouTubeData,
  buildPreview,
  fetchLikedVideos,
  fetchPlaylists,
  fetchPlaylistItems,
  getAuthorizedClient,
} from './src/services/youtube.service.js'

let failures = 0
function check(name, condition, extra = '') {
  if (condition) {
    console.log(`PASS ${name}`)
  } else {
    failures += 1
    console.log(`FAIL ${name} ${extra}`)
  }
}

// 1. sign-in consent stays lightweight/online
const signIn = new URL(buildAuthorization('signIn').url)
check('signIn access_type=online', signIn.searchParams.get('access_type') === 'online')
check('signIn prompt=select_account', signIn.searchParams.get('prompt') === 'select_account')
check('signIn scope is identity only', signIn.searchParams.get('scope') === 'openid email profile')
check('signIn PKCE S256', signIn.searchParams.get('code_challenge_method') === 'S256')

// 2. youtube consent is offline + forces consent (refresh token) and adds readonly
const youtube = new URL(buildAuthorization('youtube').url)
check('youtube access_type=offline', youtube.searchParams.get('access_type') === 'offline')
check('youtube prompt=consent', youtube.searchParams.get('prompt') === 'consent')
check('youtube include_granted_scopes', youtube.searchParams.get('include_granted_scopes') === 'true')
const scopes = youtube.searchParams.get('scope').split(' ')
check('youtube scope has readonly', scopes.includes('https://www.googleapis.com/auth/youtube.readonly'))
check('youtube scope keeps identity', ['openid', 'email', 'profile'].every((s) => scopes.includes(s)))
check('youtube host is accounts.google.com', youtube.host === 'accounts.google.com')

// 3. middleware rejects when not connected
function runMiddleware(session) {
  let result = 'next()'
  const req = { session }
  const next = (err) => {
    result = err ? `${err.statusCode}:${err.code}` : 'next()'
  }
  requireYouTubeConnection(req, {}, next)
  return result
}
check('guard denies signed-in-not-connected', runMiddleware({ user: { googleId: 'x' } }) === '403:YOUTUBE_PERMISSION_REQUIRED')
check('guard denies missing session', runMiddleware(undefined) === '403:YOUTUBE_PERMISSION_REQUIRED')
check(
  'guard allows connected',
  runMiddleware({
    oauth: { accessToken: 't', scope: ['openid', 'https://www.googleapis.com/auth/youtube.readonly'] },
  }) === 'next()',
)
check(
  'guard denies token without youtube scope',
  runMiddleware({ oauth: { accessToken: 't', scope: ['openid', 'email'] } }) === '403:YOUTUBE_PERMISSION_REQUIRED',
)

// 4. collectYouTubeData refuses an unconnected session with a 403
try {
  await collectYouTubeData({ user: { googleId: 'x' } })
  check('collect refuses unconnected session', false, 'expected throw')
} catch (error) {
  check(
    'collect refuses unconnected session',
    error.statusCode === 403 && error.code === 'YOUTUBE_PERMISSION_REQUIRED',
    `${error.statusCode}:${error.code}`,
  )
}

// 4b. the authorized client must be a YouTube service (not a bare OAuth2 client)
const ytClient = getAuthorizedClient({
  oauth: {
    accessToken: 't',
    refreshToken: 'r',
    expiryDate: Date.now() + 60_000,
    scope: ['https://www.googleapis.com/auth/youtube.readonly'],
  },
})
check('authorized client exposes channels.list', typeof ytClient?.channels?.list === 'function')
check('authorized client exposes videos.list', typeof ytClient?.videos?.list === 'function')
check('authorized client exposes subscriptions.list', typeof ytClient?.subscriptions?.list === 'function')
check('authorized client exposes playlists.list', typeof ytClient?.playlists?.list === 'function')
check('authorized client exposes playlistItems.list', typeof ytClient?.playlistItems?.list === 'function')
check('authorized client exposes videoCategories.list', typeof ytClient?.videoCategories?.list === 'function')
check('authorized client is null without a token', getAuthorizedClient({ oauth: {} }) === null)

// 5. buildPreview trims samples and carries availability through
const preview = buildPreview({
  channel: { id: 'c1', title: 'Me' },
  likedVideos: Array.from({ length: 12 }, (_, i) => ({ type: 'likedVideo', videoId: `v${i}` })),
  subscriptions: Array.from({ length: 9 }, (_, i) => ({ type: 'subscription', channelId: `s${i}` })),
  playlists: [{ type: 'playlist', playlistId: 'p1', title: 'Watch later' }],
  playlistItems: Array.from({ length: 7 }, (_, i) => ({ type: 'playlistItem', videoId: `pi${i}` })),
  categories: { '28': 'Science & Technology' },
  availability: { watchHistory: { available: false } },
  fetchedAt: 123,
})
check('preview caps liked videos at 5', preview.likedVideos.length === 5)
check('preview caps subscriptions at 5', preview.subscriptions.length === 5)
check('preview caps playlist items at 5', preview.playlistItems.length === 5)
check('preview keeps channel', preview.channel?.id === 'c1')
check('preview keeps categories', preview.categories['28'] === 'Science & Technology')
check('preview carries availability', preview.availability.watchHistory.available === false)

// 6. pagination, normalization and truncation via a fake client
const makeItems = (n, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({
    id: `vid${offset + i}`,
    snippet: { title: `T${offset + i}`, channelTitle: `C${offset + i}`, categoryId: '28', publishedAt: '2026-01-01T00:00:00Z' },
  }))
const paged = (count, nextToken) => ({ data: { pageInfo: { totalResults: 1000 }, items: makeItems(50, count), nextPageToken: nextToken } })

const fakePaging = { videos: { list: (() => { const pages = [paged(0, 'a'), paged(50, 'b'), paged(100, 'c'), paged(150, 'd')]; let i = 0; return async () => pages[i++] })() } }
const likedPage = await fetchLikedVideos(fakePaging)
check('pagination normalizes records', likedPage.ok && likedPage.value.items[0].videoTitle === 'T0')
check('normalization maps channel/category', likedPage.value.items[0].channelTitle === 'C0' && likedPage.value.items[0].categoryId === '28')
check('cap stops at 200 (4 pages)', likedPage.value.items.length === 200)
check('truncation flagged when API had more', likedPage.value.truncated === true)
check('total results captured', likedPage.value.total === 1000)

// 7. playlists.list must specify exactly one filter (mine/channelId/id)
const playlistArgs = []
const fakePlaylists = {
  playlists: {
    list: async (params) => {
      playlistArgs.push(params)
      return { data: { items: [] } }
    },
  },
}
await fetchPlaylists(fakePlaylists)
const playlistParams = playlistArgs[0] ?? {}
const playlistFilters = ['mine', 'channelId', 'id'].filter((key) => playlistParams[key] != null)
check('playlists.list sends a filter', playlistFilters.length === 1, `filters=${JSON.stringify(playlistFilters)}`)
check('playlists.list uses mine=true', playlistParams.mine === true)

// 8. playlistItems.list scopes each call to a playlistId
const playlistItemArgs = []
const fakePlaylistItems = {
  playlistItems: {
    list: async (params) => {
      playlistItemArgs.push(params)
      return { data: { items: [] } }
    },
  },
}
await fetchPlaylistItems(fakePlaylistItems, [{ playlistId: 'p1', title: 'Watch later' }])
check('playlistItems.list targets a playlistId', playlistItemArgs[0]?.playlistId === 'p1')

// 9. error mapping
const quotaClient = { videos: { list: async () => { const e = new Error('q'); e.response = { status: 403, data: { error: { errors: [{ reason: 'quotaExceeded' }] } } }; throw e } } }
try {
  await fetchLikedVideos(quotaClient)
  check('quota error is fatal (rethrows)', false, 'expected throw')
} catch (error) {
  check('quota error is fatal (rethrows)', error.code === 'YOUTUBE_QUOTA_EXCEEDED', error.code)
}

const forbiddenClient = { videos: { list: async () => { const e = new Error('f'); e.response = { status: 403, data: { error: { errors: [{ reason: 'forbidden' }] } } }; throw e } } }
const forbidden = await fetchLikedVideos(forbiddenClient)
check('non-fatal 403 degrades source', forbidden.ok === false && forbidden.error.code === 'YOUTUBE_PERMISSION_REQUIRED', forbidden.error?.code)

const expiredClient = { videos: { list: async () => { const e = new Error('e'); e.response = { status: 401, data: { error: 'invalid_grant' } }; throw e } } }
try {
  await fetchLikedVideos(expiredClient)
  check('expired token is fatal', false, 'expected throw')
} catch (error) {
  check('expired token is fatal', error.code === 'YOUTUBE_RECONNECT_REQUIRED', error.code)
}

// 10. fresh session cache short-circuits the network
const cachedPayload = { channel: null, likedVideos: [], subscriptions: [], playlists: [], playlistItems: [], categories: {}, availability: { watchHistory: { available: false } }, fetchedAt: 999 }
const cachedSession = {
  oauth: { accessToken: 't', scope: ['openid', 'https://www.googleapis.com/auth/youtube.readonly'] },
  youtubeData: { fetchedAt: Date.now(), payload: cachedPayload },
}
const cachedResult = await collectYouTubeData(cachedSession)
check('cache hit is served', cachedResult.cached === true && cachedResult.fetchedAt === 999)

// 11. concurrent collects for one session share a single upstream fetch
let listCalls = 0
const empty = async () => {
  listCalls += 1
  return { data: { items: [] } }
}
const countingClient = {
  channels: { list: empty },
  videos: { list: empty },
  subscriptions: { list: empty },
  playlists: { list: empty },
  playlistItems: { list: empty },
  videoCategories: { list: empty },
}
const sharedSession = {
  id: 'sess-shared',
  oauth: { accessToken: 't', scope: ['openid', 'https://www.googleapis.com/auth/youtube.readonly'] },
}
const [first, second] = await Promise.all([
  collectYouTubeData(sharedSession, { client: countingClient }),
  collectYouTubeData(sharedSession, { client: countingClient }),
])
check('concurrent collects share one upstream fetch', listCalls === 5, `listCalls=${listCalls}`)
check('coalesced response is marked cached', first.cached !== second.cached, `${first.cached}/${second.cached}`)
check('shared fetch writes the session cache', sharedSession.youtubeData?.payload?.fetchedAt === first.fetchedAt)

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
