import { CircleAlert } from 'lucide-react'
import Button from './Button.jsx'

export default function ErrorMessage({
  message = 'Something went wrong.',
  onRetry,
  retryLabel = 'Try again',
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-accent-200 bg-accent-50 p-4 text-left ${className}`}
    >
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm text-ink">{message}</p>
          {onRetry && (
            <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
