import { Sparkles } from 'lucide-react'
import MockBadge from './MockBadge.jsx'

export default function RoastCard({ report, illustrative = false }) {
  return (
    <section className="rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50 to-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Sparkles className="size-4 text-accent-500" aria-hidden="true" />
          The roast
        </h3>
        <MockBadge show={illustrative} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink">{report.roast}</p>

      <div className="mt-4 border-t border-accent-100 pt-4">
        <p className="text-xs font-medium text-ink">Bright spots</p>
        <ul className="mt-2 space-y-1.5">
          {report.positiveObservations.map((observation) => (
            <li key={observation} className="flex gap-2 text-xs text-muted">
              <span aria-hidden="true" className="text-accent-500">
                •
              </span>
              {observation}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
