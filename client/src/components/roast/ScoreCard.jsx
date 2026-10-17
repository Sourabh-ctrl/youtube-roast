import { Flame } from 'lucide-react'
import MockBadge from './MockBadge.jsx'

function scoreColor(score) {
  if (score >= 80) return 'text-accent-600'
  if (score >= 50) return 'text-accent-500'
  return 'text-muted'
}

export default function ScoreCard({ report, illustrative = false }) {
  const { brainRotScore, scoreExplanation } = report
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (brainRotScore / 100) * circumference

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Flame className="size-4 text-accent-500" aria-hidden="true" />
            Brain Rot Score
          </h3>
          <p className="mt-1 text-xs text-muted">AI-generated entertainment score</p>
        </div>
        <MockBadge show={illustrative} />
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 128 128" className="size-32 -rotate-90">
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              strokeWidth="10"
              className="stroke-line"
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="stroke-accent-500 transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${scoreColor(brainRotScore)}`}>
              {brainRotScore}
            </span>
            <span className="text-[10px] tracking-widest text-muted uppercase">
              / 100
            </span>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted">{scoreExplanation}</p>
      </div>
    </section>
  )
}
