import { useCallback, useEffect, useState } from 'react'
import {
  deleteTraining,
  fetchCatalogTrainings,
  mapTrainingDtoToCard,
  saveTraining,
} from '../api/catalogApi.js'

const STORAGE_KEY = 'itconnect_admin_created_trainings_v1'

function groupByBranch(rows) {
  const map = {}
  for (const row of rows) {
    const bid = row.branchId || 'cairo'
    if (!map[bid]) map[bid] = []
    map[bid].push(row)
  }
  return map
}

async function loadTrainingsFromApi() {
  const rows = await fetchCatalogTrainings()
  return groupByBranch(rows.map(mapTrainingDtoToCard))
}

export function parseCreatedTrainingsSnapshot() {
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

/** Most recently created training (any branch), from id suffix `new-training-…-<timestamp>`. */
export function getLatestCreatedTrainingGlobally() {
  const snap = parseCreatedTrainingsSnapshot()
  let best = null
  let bestTs = -1
  for (const list of Object.values(snap)) {
    if (!Array.isArray(list)) continue
    for (const row of list) {
      if (!row?.id) continue
      const m = String(row.id).match(/new-training-.+-(\d+)$/)
      const ts = m ? Number(m[1]) : 0
      if (ts > bestTs) {
        bestTs = ts
        best = row
      }
    }
  }
  return best
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
  window.dispatchEvent(new Event('admin-created-trainings'))
}

/** Removes training rows by id from every branch and SQL Server. @returns {number} rows removed */
export async function removeTrainingsByIdsGlobally(trainingIds) {
  const idSet = new Set((trainingIds ?? []).map((id) => String(id ?? '').trim()).filter(Boolean))
  if (idSet.size === 0) return 0

  await Promise.all(
    [...idSet].map((id) => deleteTraining(id).catch(() => undefined)),
  )

  const snap = parseCreatedTrainingsSnapshot()
  let removed = 0
  const next = {}

  for (const [branchId, list] of Object.entries(snap)) {
    if (!Array.isArray(list)) {
      next[branchId] = list
      continue
    }
    const kept = []
    for (const row of list) {
      if (idSet.has(row.id)) removed += 1
      else kept.push(row)
    }
    next[branchId] = kept
  }

  writeSnapshot(next)
  notifyChanged()
  return removed
}

/** Patch a single training row in branch storage (usable outside React hooks). */
export function updateTrainingInSnapshot(branchId, trainingId, patch) {
  const bid = String(branchId ?? '').trim() || 'cairo'
  const snap = parseCreatedTrainingsSnapshot()
  const list = snap[bid] ?? []
  const idx = list.findIndex((t) => t.id === trainingId)
  if (idx < 0) return false
  const prev = list[idx]
  const nextRow = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch, id: prev.id }
  const nextList = [...list]
  nextList[idx] = nextRow
  writeSnapshot({ ...snap, [bid]: nextList })
  notifyChanged()
  return true
}

/** Prepends a training row to branch storage (usable outside React hooks). */
export function prependTrainingToSnapshot(branchId, training) {
  const bid = String(branchId ?? '').trim() || 'cairo'
  const snap = parseCreatedTrainingsSnapshot()
  const next = {
    ...snap,
    [bid]: [training, ...(snap[bid] ?? [])],
  }
  writeSnapshot(next)
  notifyChanged()
}

/**
 * Trainings created from Admin → Training Management (persisted).
 * Each branch array is newest-first (prepended on create).
 */
export function useAdminCreatedTrainings() {
  const [byBranch, setByBranch] = useState(parseCreatedTrainingsSnapshot)

  const refreshFromApi = useCallback(async () => {
    try {
      const grouped = await loadTrainingsFromApi()
      setByBranch(grouped)
      writeSnapshot(grouped)
    } catch {
      setByBranch(parseCreatedTrainingsSnapshot())
    }
  }, [])

  useEffect(() => {
    refreshFromApi()
    const sync = () => refreshFromApi()
    window.addEventListener('storage', sync)
    window.addEventListener('admin-created-trainings', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('admin-created-trainings', sync)
    }
  }, [refreshFromApi])

  const prependTraining = useCallback(async (branchId, training) => {
    try {
      await saveTraining({
        id: training.id,
        branchId,
        trackId: training.trackId ?? training.linkedTrackId ?? null,
        category: training.category ?? 'FRONTEND',
        title: training.title,
        body: training.body ?? '',
        startDate: training.startDate ?? training.date ?? null,
        trainerLegacyId: training.trainerId ?? training.trainerLegacyId ?? null,
        seatsTotal: training.seatsTotal ?? 20,
        status: training.status ?? 'active',
        filterTag: training.filterTag ?? null,
      })
      await refreshFromApi()
      notifyChanged()
    } catch (error) {
      prependTrainingToSnapshot(branchId, training)
      setByBranch(parseCreatedTrainingsSnapshot())
      throw error
    }
  }, [refreshFromApi])

  const removeTraining = useCallback(async (branchId, trainingId) => {
    try {
      await deleteTraining(trainingId)
      await refreshFromApi()
      notifyChanged()
      return true
    } catch {
      const snap = parseCreatedTrainingsSnapshot()
      const list = snap[branchId] ?? []
      if (!list.some((t) => t.id === trainingId)) return false
      const next = {
        ...snap,
        [branchId]: list.filter((t) => t.id !== trainingId),
      }
      writeSnapshot(next)
      notifyChanged()
      setByBranch(next)
      return true
    }
  }, [refreshFromApi])

  const updateTraining = useCallback(async (branchId, trainingId, patch) => {
    const snap = parseCreatedTrainingsSnapshot()
    const list = snap[branchId] ?? []
    const prev = list.find((t) => t.id === trainingId)
    if (!prev) return
    const nextRow = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch, id: prev.id }
    try {
      await saveTraining({
        id: nextRow.id,
        branchId,
        trackId: nextRow.trackId ?? nextRow.linkedTrackId ?? null,
        category: nextRow.category ?? 'FRONTEND',
        title: nextRow.title,
        body: nextRow.body ?? '',
        startDate: nextRow.startDate ?? nextRow.date ?? null,
        trainerLegacyId: nextRow.trainerId ?? null,
        seatsTotal: nextRow.seatsTotal ?? 20,
        status: nextRow.status ?? 'active',
        filterTag: nextRow.filterTag ?? null,
      })
      await refreshFromApi()
      notifyChanged()
    } catch (error) {
      updateTrainingInSnapshot(branchId, trainingId, patch)
      setByBranch(parseCreatedTrainingsSnapshot())
      throw error
    }
  }, [refreshFromApi])

  return { byBranch, prependTraining, removeTraining, updateTraining, refreshFromApi }
}
