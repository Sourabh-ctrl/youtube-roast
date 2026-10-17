import { Flag } from 'lucide-react'
import MockBadge from './MockBadge.jsx'

export default function RedFlagsList({ report, illustrative = false }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Flag className="size-4 text-accent-500" aria-hidden="true" />
          Red flags
        </h3>
        <MockBadge show={illustrative} />
      </div>

      <ul className="mt-4 space-y-3">
        {report.redFlags.map((flag) => (
          <li
            key={flag.title}
            className="rounded-xl border border-accent-100 bg-accent-50 p-3"
          >
            <p className="text-sm font-medium text-accent-700">{flag.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {flag.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
