export function formatOverviewRelativeTime(tsMs) {
  const diffSec = Math.round((Date.now() - tsMs) / 1000)
  if (diffSec < 45) return 'just now'
  const min = Math.round(diffSec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 48) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(tsMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
