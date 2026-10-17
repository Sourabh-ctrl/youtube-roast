import { Brain } from 'lucide-react'
import MockBadge from './MockBadge.jsx'

export default function PersonalityCard({ report, illustrative = false }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Brain className="size-4 text-accent-500" aria-hidden="true" />
          Personality-style summary
        </h3>
        <MockBadge show={illustrative} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {report.personalitySummary}
      </p>
      <p className="mt-3 text-xs text-muted italic">
        AI-generated interpretation of the analyzed sample, not a diagnosis.
      </p>
    </section>
  )
}
