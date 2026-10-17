import { LoaderCircle } from 'lucide-react'

export default function Loader({ label = 'Loading…', className = '' }) {
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-2 text-sm text-muted ${className}`}
    >
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
