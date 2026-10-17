import { useCallback, useEffect, useState } from 'react'
import {
  ChartColumn,
  CircleCheck,
  Eye,
  EyeOff,
  Play,
  RefreshCw,
  ThumbsUp,
  Users,
} from 'lucide-react'
import Button from '../common/Button.jsx'
import Loader from '../common/Loader.jsx'
import ErrorMessage from '../common/ErrorMessage.jsx'
import { apiError } from '../../services/api.js'
import {
  fetchDataAvailability,
  fetchPreview,
} from '../../services/youtubeService.js'

const SOURCES = [
  { key: 'likedVideos', label: 'Liked videos', icon: ThumbsUp },
  { key: 'subscriptions', label: 'Subscriptions', icon: Users },
  { key: 'playlists', label: 'Playlists', icon: Play },
  { key: 'channel', label: 'Channel info', icon: ChartColumn },
]

function countLabel(source) {
  if (source?.total == null) return `${source?.sampled ?? 0} found`
  if (source.total === source.sampled) return `${source.sampled} found`
  return `${source.sampled} of ${source.total}`
}

function AvailabilityRow({ label, icon: Icon, source }) {
  const available = source?.available
  return (
    <li className="flex items-start justify-between gap-4 py-2">
      <span className="flex items-center gap-2 text-sm text-ink">
        <Icon className="size-4 text-accent-500" aria-hidden="true" />
        {label}
      </span>
      <span className="text-right text-xs">
        {available ? (
          <span className="inline-flex items-center gap-1 text-muted">
            <CircleCheck className="size-3.5 text-green-600" aria-hidden="true" />
            {countLabel(source)}
          </span>
        ) : (
          <span className="text-muted">
            {source?.message ?? 'Not available'}
            {source?.reason && (
              <span className="mt-0.5 block text-[11px] text-muted/70">{source.reason}</span>
            )}
          </span>
        )}
        {source?.truncated && (
          <span className="mt-0.5 block text-[11px] text-muted">capped for quota</span>
        )}
      </span>
    </li>
  )
}

function SampleList({ title, items, render }) {
  if (!items?.length) return null
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</h4>
      <ul className="mt-2 space-y-1">
        {items.map((item, index) => (
          <li key={`${item.videoId ?? item.playlistId ?? item.channelId ?? index}`} className="truncate text-sm text-ink">
            {render(item)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function YouTubeDataPanel({ connected }) {
  const [state, setState] = useState({ status: 'idle', availability: null, preview: null, error: null })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async ({ refresh = false } = {}) => {
    setBusy(true)
    setState((prev) => ({ ...prev, status: prev.availability ? 'ready' : 'loading', error: null }))
    try {
      const [availability, preview] = await Promise.all([
        fetchDataAvailability({ refresh }),
        fetchPreview({ refresh }),
      ])
      setState({ status: 'ready', availability: availability.availability, preview: preview.preview, error: null })
    } catch (error) {
      setState({ status: 'error', availability: null, preview: null, error: apiError(error).message })
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (!connected) return undefined
    let active = true
    Promise.resolve().then(() => {
      if (active) load()
    })
    return () => {
      active = false
    }
  }, [connected, load])

  if (!connected) return null

  const { status, availability, preview, error } = state
  const watchHistory = availability?.watchHistory

  return (
    <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Your YouTube data</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => load({ refresh: true })}
          disabled={busy}
        >
          <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
          {busy ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {status === 'loading' && <Loader className="py-8" label="Checking your YouTube data…" />}

      {status === 'error' && (
        <ErrorMessage className="mt-4" message={error} onRetry={() => load({ refresh: true })} />
      )}

      {status === 'ready' && availability && (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              What can be analyzed
            </h3>
            <ul className="mt-2 divide-y divide-line">
              {SOURCES.map(({ key, label, icon }) => (
                <AvailabilityRow key={key} label={label} icon={icon} source={availability[key]} />
              ))}
            </ul>

            {watchHistory && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-accent-50 p-3 text-xs text-muted">
                <EyeOff className="mt-0.5 size-3.5 shrink-0 text-accent-500" aria-hidden="true" />
                {watchHistory.message}
              </p>
            )}
          </div>

          <div className="space-y-5">
            <SampleList
              title="Recently liked"
              items={preview?.likedVideos}
              render={(item) => (
                <>
                  {item.videoTitle}
                  {item.channelTitle && <span className="text-muted"> — {item.channelTitle}</span>}
                </>
              )}
            />
            <SampleList
              title="Subscriptions"
              items={preview?.subscriptions}
              render={(item) => item.channelTitle}
            />
            <SampleList
              title="Playlists"
              items={preview?.playlists}
              render={(item) => (
                <>
                  {item.title}
                  {item.itemCount != null && (
                    <span className="text-muted"> — {item.itemCount} videos</span>
                  )}
                </>
              )}
            />
            {!preview?.likedVideos?.length &&
              !preview?.subscriptions?.length &&
              !preview?.playlists?.length && (
                <p className="flex items-start gap-2 text-sm text-muted">
                  <Eye className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden="true" />
                  We could not find accessible data on this account. Make sure you granted the
                  YouTube permission and that your likes and subscriptions are not hidden.
                </p>
              )}
          </div>
        </div>
      )}
    </section>
  )
}
