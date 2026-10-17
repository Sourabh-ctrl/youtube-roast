import { ChartColumn, Info, ScanSearch } from 'lucide-react'

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-lg font-semibold text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

export default function AnalysisSummary({ report }) {
  const analysis = report?.analysis
  if (!analysis) return null

  const { counts, categories, channels, keywords, stats } = analysis
  const labels = report.provenance?.labels

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <ScanSearch className="size-4 text-accent-500" aria-hidden="true" />
        What we analyzed
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Liked videos" value={counts.likedVideos} />
        <Stat label="Subscriptions" value={counts.subscriptions} />
        <Stat label="Playlists" value={counts.playlists} />
        <Stat label="Playlist items" value={counts.playlistItems} />
      </div>

      <p className="mt-3 text-xs text-muted">{labels?.observed}</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
            <ChartColumn className="size-3.5" aria-hidden="true" />
            Top categories
          </h4>
          <ul className="mt-2 space-y-1.5">
            {categories.slice(0, 5).map((entry) => (
              <li key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-ink">{entry.name}</span>
                <span className="text-xs text-muted">{entry.count}</span>
              </li>
            ))}
          </ul>

          {channels.length > 0 && (
            <>
              <h4 className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">
                Top channels
              </h4>
              <ul className="mt-2 space-y-1.5">
                {channels.slice(0, 5).map((entry) => (
                  <li key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-ink">{entry.name}</span>
                    <span className="text-xs text-muted">{entry.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Recurring keywords
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keywords.slice(0, 14).map((entry) => (
              <span
                key={entry.term}
                className="rounded-full bg-accent-50 px-2.5 py-1 text-xs text-accent-700"
              >
                {entry.term}
              </span>
            ))}
          </div>

          <dl className="mt-4 space-y-1 text-xs text-muted">
            <div className="flex justify-between gap-3">
              <dt>Unique channels</dt>
              <dd className="text-ink">{stats.uniqueChannels}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Unique categories</dt>
              <dd className="text-ink">{stats.uniqueCategories}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Category diversity</dt>
              <dd className="text-ink">{Math.round(stats.categoryDiversity * 100)}%</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">{labels?.estimate}</p>
        </div>
      </div>

      <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-xs text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0 text-accent-500" aria-hidden="true" />
        {labels?.interpretation}
      </p>
    </section>
  )
}
