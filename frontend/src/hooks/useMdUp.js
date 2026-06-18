import { useSyncExternalStore } from 'react'

const query = '(min-width: 768px)'

function subscribeMdUp(callback) {
  if (typeof window === 'undefined') return () => {}
  const mql = window.matchMedia(query)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getMdUpSnapshot() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(query).matches
}

function getMdUpServerSnapshot() {
  return false
}

/** True when viewport is at least Tailwind `md` (768px). */
export function useMdUp() {
  return useSyncExternalStore(subscribeMdUp, getMdUpSnapshot, getMdUpServerSnapshot)
}
