/**
 * Deterministic, explainable preprocessing of the YouTube snapshot.
 *
 * This service never calls an external API and never guesses at hidden
 * behaviour. It reports what was actually retrieved (observed counts) and a
 * small set of clearly-labelled descriptive estimates (diversity, recurring
 * keywords). Everything downstream — including the AI prompt — is built from
 * this object, so the roast stays grounded in real records.
 *
 * We deliberately do not pass raw datasets to the model. Only a capped,
 * de-identified sample of titles/channel names is included.
 */
export const ANALYSIS_LIMITS = Object.freeze({
  topCategories: 8,
  topChannels: 10,
  topKeywords: 20,
  sampleLikedTitles: 60,
  sampleSubscriptions: 40,
  samplePlaylists: 15,
})

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'this', 'that', 'from', 'have',
  'how', 'what', 'why', 'who', 'when', 'where', 'are', 'was', 'were', 'will',
  'would', 'can', 'could', 'should', 'about', 'into', 'out', 'over', 'under',
  'ep', 'episode', 'part', 'full', 'video', 'official', 'live', 'new', 'best',
  'top', 'vs', 'feat', 'ft', 'the', 'his', 'her', 'its', 'our', 'their', 'not',
  'but', 'all', 'any', 'one', 'two', 'get', 'got', 'make', 'made', 'just',
  'like', 'don', 'did', 'does', 'doing', 'very', 'too', 'also', 'more', 'most',
  'some', 'than', 'then', 'them', 'they', 'she', 'him', 'because', 'been',
  'being', 'has', 'had', 'some', 'no', 'yes', 'off', 'on', 'in', 'of', 'to',
  'a', 'an', 'is', 'it', 'as', 'at', 'by', 'be', 'do', 'if', 'or', 'so', 'up',
  'we', 'us', 'my', 'me', 'i',
])

function dedupe(records, keyOf) {
  const seen = new Set()
  const out = []
  for (const record of records ?? []) {
    const key = keyOf(record)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(record)
  }
  return out
}

function tokenize(title) {
  if (!title) return []
  return title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word) && !/^\d+$/.test(word))
}

function bump(map, key) {
  if (!key) return
  map.set(key, (map.get(key) ?? 0) + 1)
}

function topEntries(map, limit) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
}

/**
 * @param {object} data the normalized snapshot from youtube.service
 * @returns {object} analysis consumed by the prompt and the report
 */
export function analyzeContent(data = {}) {
  const categoryNames = data.categories ?? {}

  const likedVideos = dedupe(data.likedVideos, (item) => item.videoId)
  const subscriptions = dedupe(data.subscriptions, (item) => item.channelId)
  const playlists = dedupe(data.playlists, (item) => item.playlistId)
  const playlistItems = dedupe(
    data.playlistItems,
    (item) => `${item.playlistId}:${item.videoId}`,
  )

  const videoRecords = [...likedVideos, ...playlistItems]
  const categoryCounts = new Map()
  const channelCounts = new Map()
  const keywordCounts = new Map()

  for (const record of videoRecords) {
    const title = (record.videoTitle ?? '').trim()
    const categoryId = record.categoryId ?? null
    const categoryName = categoryId
      ? categoryNames[categoryId] ?? `Category ${categoryId}`
      : 'Uncategorized'
    bump(categoryCounts, categoryName)
    bump(channelCounts, (record.channelTitle ?? '').trim())
    for (const token of tokenize(title)) bump(keywordCounts, token)
  }

  for (const sub of subscriptions) {
    bump(channelCounts, (sub.channelTitle ?? '').trim())
  }

  const categorizedCount = [...categoryCounts.values()].reduce((sum, n) => sum + n, 0)
  const counts = {
    likedVideos: likedVideos.length,
    subscriptions: subscriptions.length,
    playlists: playlists.length,
    playlistItems: playlistItems.length,
    channel: data.channel ? 1 : 0,
    total: likedVideos.length + subscriptions.length + playlists.length + playlistItems.length,
  }

  const categories = topEntries(categoryCounts, ANALYSIS_LIMITS.topCategories).map(
    ([name, count]) => ({
      name,
      count,
      share: categorizedCount ? Number((count / categorizedCount).toFixed(3)) : 0,
    }),
  )

  const channels = topEntries(channelCounts, ANALYSIS_LIMITS.topChannels).map(
    ([name, count]) => ({ name, count }),
  )

  const keywords = topEntries(keywordCounts, ANALYSIS_LIMITS.topKeywords).map(
    ([term, count]) => ({ term, count }),
  )

  const signals = counts.likedVideos + counts.playlistItems + counts.subscriptions

  return {
    hasData: signals > 0,
    counts,
    categories,
    channels,
    keywords,
    stats: {
      uniqueChannels: channelCounts.size,
      uniqueCategories: categoryCounts.size,
      categoryDiversity: categorizedCount
        ? Number((categoryCounts.size / categorizedCount).toFixed(3))
        : 0,
      uniqueKeywords: keywordCounts.size,
    },
    sample: {
      likedTitles: likedVideos
        .filter((item) => (item.videoTitle ?? '').trim())
        .slice(0, ANALYSIS_LIMITS.sampleLikedTitles)
        .map((item) => ({
          title: (item.videoTitle ?? '').trim().slice(0, 140),
          channel: (item.channelTitle ?? '').trim().slice(0, 80) || null,
          category: item.categoryId ? categoryNames[item.categoryId] ?? null : null,
        })),
      subscriptionNames: subscriptions
        .map((item) => (item.channelTitle ?? '').trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, ANALYSIS_LIMITS.sampleSubscriptions),
      playlistTitles: playlists
        .map((item) => (item.title ?? '').trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, ANALYSIS_LIMITS.samplePlaylists),
    },
  }
}

/**
 * The subset of the analysis that is safe to return to the browser and to
 * persist: counts and aggregate stats only — no raw titles.
 */
export function publicAnalysis(analysis) {
  return {
    counts: analysis.counts,
    categories: analysis.categories,
    channels: analysis.channels,
    keywords: analysis.keywords,
    stats: analysis.stats,
  }
}
