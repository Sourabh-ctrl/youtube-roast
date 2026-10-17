import { Flame } from 'lucide-react'
import PageContainer from './PageContainer.jsx'

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <PageContainer className="flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent-500 text-white">
            <Flame className="size-3.5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-ink">RoastTube</span>
        </div>
        <p className="max-w-md text-xs text-muted">
          RoastTube is entertainment, not a scientific personality assessment.
          Scores and observations are AI-generated interpretations of accessible
          metadata.
        </p>
      </PageContainer>
    </footer>
  )
}
