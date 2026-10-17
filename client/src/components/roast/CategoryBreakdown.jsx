import { ChartColumn } from 'lucide-react'
import MockBadge from './MockBadge.jsx'

export default function CategoryBreakdown({ report, illustrative = false }) {
  const { topInterests } = report
  const max = Math.max(...topInterests.map((item) => item.evidenceCount), 1)

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ChartColumn className="size-4 text-accent-500" aria-hidden="true" />
          Content categories
        </h3>
        <MockBadge show={illustrative} />
      </div>

      <ul className="mt-4 space-y-4">
        {topInterests.map((item) => (
          <li key={item.category}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink">{item.category}</span>
              <span className="text-xs text-muted">
                {item.evidenceCount} items in sample
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-surface">
              <div
                className="h-2 rounded-full bg-accent-500"
                style={{ width: `${Math.round((item.evidenceCount / max) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">{item.observation}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
