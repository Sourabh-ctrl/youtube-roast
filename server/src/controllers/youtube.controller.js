import {
  collectYouTubeData,
  buildPreview,
  isConnected,
} from '../services/youtube.service.js'

function shouldRefresh(query) {
  return query.refresh === '1' || query.refresh === 'true'
}

export function status(req, res) {
  const oauth = req.session?.oauth ?? null
  return res.json({
    success: true,
    youtube: {
      connected: isConnected(req.session),
      hasRefreshToken: Boolean(oauth?.refreshToken),
      scopes: oauth?.scope ?? [],
      cachedAt: req.session?.youtubeData?.fetchedAt ?? null,
    },
  })
}

export async function dataAvailability(req, res) {
  const data = await collectYouTubeData(req.session, { force: shouldRefresh(req.query) })
  return res.json({
    success: true,
    availability: data.availability,
    fetchedAt: data.fetchedAt,
    cached: Boolean(data.cached),
  })
}

export async function preview(req, res) {
  const data = await collectYouTubeData(req.session, { force: shouldRefresh(req.query) })
  return res.json({
    success: true,
    preview: buildPreview(data),
    cached: Boolean(data.cached),
  })
}
