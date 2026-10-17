import { describe, expect, it } from 'vitest'
import {
  analyzeContent,
  publicAnalysis,
  ANALYSIS_LIMITS,
} from '../../src/services/contentAnalysis.service.js'
import { sampleSnapshot } from '../helpers/fixtures.js'

describe('analyzeContent', () => {
  it('dedupes records by their stable id', () => {
    const analysis = analyzeContent(sampleSnapshot())
    expect(analysis.counts.likedVideos).toBe(3)
    expect(analysis.counts.subscriptions).toBe(2)
    expect(analysis.counts.playlists).toBe(1)
  })

  it('flags whether any signal is present', () => {
    expect(analyzeContent(sampleSnapshot()).hasData).toBe(true)
    expect(analyzeContent({}).hasData).toBe(false)
  })

  it('groups content by named category and buckets the uncategorized', () => {
    const analysis = analyzeContent({
      ...sampleSnapshot(),
      likedVideos: [
        { videoId: 'a', videoTitle: 'x', categoryId: '28' },
        { videoId: 'b', videoTitle: 'y', categoryId: null },
      ],
      subscriptions: [],
      playlists: [],
      playlistItems: [],
    })
    expect(analysis.categories.find((entry) => entry.name === 'Science & Technology').count).toBe(1)
    expect(analysis.categories.some((entry) => entry.name === 'Uncategorized')).toBe(true)
  })

  it('ranks channels and extracts recurring keywords', () => {
    const analysis = analyzeContent(sampleSnapshot())
    expect(analysis.channels[0].name).toBe('DevChannel')
    expect(analysis.keywords.some((entry) => entry.term === 'react')).toBe(true)
  })

  it('computes descriptive stats without fabricating watch behaviour', () => {
    const analysis = analyzeContent(sampleSnapshot())
    expect(analysis.stats.uniqueChannels).toBeGreaterThan(0)
    expect(analysis.stats.categoryDiversity).toBeGreaterThan(0)
    expect(analysis).not.toHaveProperty('watchDuration')
    expect(analysis).not.toHaveProperty('watchFrequency')
  })

  it('caps lists at the configured limits', () => {
    const many = Array.from({ length: 200 }, (_, index) => ({
      videoId: `v${index}`,
      videoTitle: `Topic ${index} keyword${index}`,
      channelTitle: `Channel ${index}`,
      categoryId: null,
    }))
    const analysis = analyzeContent({ likedVideos: many })
    expect(analysis.categories.length).toBeLessThanOrEqual(ANALYSIS_LIMITS.topCategories)
    expect(analysis.channels.length).toBeLessThanOrEqual(ANALYSIS_LIMITS.topChannels)
    expect(analysis.keywords.length).toBeLessThanOrEqual(ANALYSIS_LIMITS.topKeywords)
    expect(analysis.sample.likedTitles.length).toBeLessThanOrEqual(ANALYSIS_LIMITS.sampleLikedTitles)
  })

  it('tolerates missing and malformed records', () => {
    const analysis = analyzeContent({
      likedVideos: [{ videoId: 'a' }, { videoTitle: '' }, {}],
    })
    expect(analysis.hasData).toBe(true)
    expect(analysis.sample.likedTitles).toHaveLength(0)
  })
})

describe('publicAnalysis', () => {
  it('exposes counts and aggregates but never raw titles', () => {
    const publicView = publicAnalysis(analyzeContent(sampleSnapshot()))
    expect(publicView.counts.likedVideos).toBe(3)
    expect(publicView).not.toHaveProperty('sample')
    expect(JSON.stringify(publicView)).not.toContain('Learn React')
  })
})
