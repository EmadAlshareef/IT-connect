import { useCallback, useEffect, useState } from 'react'
import {
  deleteTrack,
  fetchTracks,
  mapTrackDtoToCard,
  saveTrack,
} from '../api/catalogApi.js'

const STORAGE_KEY = 'itconnect_admin_created_tracks_v1'

function groupByBranch(rows) {
  const map = {}
  for (const row of rows) {
    const bid = row.branchId || 'cairo'
    if (!map[bid]) map[bid] = []
    map[bid].push(row)
  }
  return map
}

async function loadTracksFromApi() {
  const rows = await fetchTracks()
  return groupByBranch(rows.map(mapTrackDtoToCard))
}

function parseSnapshot() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeSnapshot(data) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota */
  }
}

function notifyChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('admin-created-tracks'))
}

/**
 * Tracks from SQL Server (admin Track Management). Falls back to localStorage when API is unavailable.
 */
export function useAdminCreatedTracks() {
  const [byBranch, setByBranch] = useState(parseSnapshot)

  const refreshFromApi = useCallback(async () => {
    try {
      const grouped = await loadTracksFromApi()
      setByBranch(grouped)
      writeSnapshot(grouped)
    } catch {
      setByBranch(parseSnapshot())
    }
  }, [])

  useEffect(() => {
    refreshFromApi()
    const sync = () => refreshFromApi()
    window.addEventListener('storage', sync)
    window.addEventListener('admin-created-tracks', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('admin-created-tracks', sync)
    }
  }, [refreshFromApi])

  const addCreatedTrack = useCallback(async (branchId, { title, description, id }) => {
    const name = (title ?? '').trim()
    if (!name) return null

    try {
      const saved = await saveTrack({
        id: id ?? undefined,
        branchId,
        title: name,
        icon: 'code',
      })
      await refreshFromApi()
      notifyChanged()
      return mapTrackDtoToCard({ ...saved, branchId })
    } catch {
      const entry = {
        id: id ?? `uct-${branchId}-${Date.now()}`,
        title: name,
        description: (description ?? '').trim(),
        icon: 'code',
        trainings: 0,
        students: 0,
        active: 0,
        userCreated: true,
      }
      const snap = parseSnapshot()
      const next = {
        ...snap,
        [branchId]: [...(snap[branchId] ?? []), entry],
      }
      writeSnapshot(next)
      notifyChanged()
      setByBranch(next)
      return entry
    }
  }, [refreshFromApi])

  const findCreatedTrack = useCallback(
    (branchId, trackId) => (byBranch[branchId] ?? []).find((t) => t.id === trackId),
    [byBranch],
  )

  const removeCreatedTrack = useCallback(async (branchId, trackId) => {
    try {
      await deleteTrack(trackId)
      await refreshFromApi()
      notifyChanged()
      return true
    } catch {
      const snap = parseSnapshot()
      const list = snap[branchId] ?? []
      const isLocalOnly = list.some((t) => t.id === trackId && t.userCreated)
      if (!isLocalOnly) return false
      const next = {
        ...snap,
        [branchId]: list.filter((t) => t.id !== trackId),
      }
      writeSnapshot(next)
      notifyChanged()
      setByBranch(next)
      return true
    }
  }, [refreshFromApi])

  return { byBranch, addCreatedTrack, findCreatedTrack, removeCreatedTrack, refreshFromApi }
}
