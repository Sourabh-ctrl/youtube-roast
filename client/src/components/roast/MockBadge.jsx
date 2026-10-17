export default function MockBadge({ show = false, label = 'Illustrative sample' }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center rounded-full bg-accent-100 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-accent-700 uppercase">
      {label}
    </span>
  )
}
