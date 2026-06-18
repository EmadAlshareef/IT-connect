import { useCallback, useEffect, useState } from 'react'
import {
  canSyncCompanyPortalApi,
  createCompanyTrainer,
  deleteCompanyTrainer,
  fetchCompanyTrainers,
  getCompanyPortalApiErrorMessage,
  resolveEntryApiId,
  toCompanyTrainerPayload,
  updateCompanyTrainer,
} from '../api/companyPortalApi.js'
import {
  getCompanyTrainersSnapshot,
  listenCompanyPortalStore,
  setCompanyTrainersSnapshot,
} from '../utils/companyPortalStore.js'

export { parseCompanyTrainersSnapshot } from '../utils/companyPortalStore.js'

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function filterForCompany(all, companyEmail) {
  const ce = normalizeEmail(companyEmail)
  if (!ce) return []
  return all.filter((row) => normalizeEmail(row.companyEmail) === ce)
}

/** Admin override: sync linked tracks on a company-managed trainer row. */
export async function updateCompanyTrainerLinkedTracks(trainerId, linkedTrackTitles) {
  const id = String(trainerId ?? '').trim()
  if (!id) return false
  const titles = (Array.isArray(linkedTrackTitles) ? linkedTrackTitles : [linkedTrackTitles])
    .map((title) => String(title ?? '').trim())
    .filter(Boolean)
  if (titles.length === 0) return false

  const snap = getCompanyTrainersSnapshot()
  const prev = snap.find((row) => row.id === id || row.apiId === id)
  if (!prev) return false

  const nextRow = { ...prev, linkedTrackTitles: titles }
  const apiId = resolveEntryApiId(prev, snap)
  await updateCompanyTrainer(apiId, toCompanyTrainerPayload(nextRow))
  const list = await fetchCompanyTrainers()
  setCompanyTrainersSnapshot(list)
  return true
}

export function useCompanyTrainers(companyEmail) {
  const canSync = canSyncCompanyPortalApi()
  const [trainers, setTrainers] = useState(() => filterForCompany(getCompanyTrainersSnapshot(), companyEmail))

  const refreshFromApi = useCallback(async () => {
    const list = await fetchCompanyTrainers()
    setCompanyTrainersSnapshot(list)
    setTrainers(filterForCompany(list, companyEmail))
    return list
  }, [companyEmail])

  useEffect(() => {
    if (!canSync) {
      setTrainers(filterForCompany(getCompanyTrainersSnapshot(), companyEmail))
      return listenCompanyPortalStore(() =>
        setTrainers(filterForCompany(getCompanyTrainersSnapshot(), companyEmail)),
      )
    }
    void refreshFromApi().catch(() => setTrainers(filterForCompany(getCompanyTrainersSnapshot(), companyEmail)))
    return listenCompanyPortalStore(() =>
      setTrainers(filterForCompany(getCompanyTrainersSnapshot(), companyEmail)),
    )
  }, [canSync, companyEmail, refreshFromApi])

  const addTrainer = useCallback(
    async ({ fullName, email, companyPosition, linkedTrackTitles, password }) => {
      const ce = normalizeEmail(companyEmail)
      const nameTrim = String(fullName ?? '').trim()
      const emailNorm = normalizeEmail(email)
      const position = String(companyPosition ?? '').trim()
      const titles = Array.isArray(linkedTrackTitles)
        ? linkedTrackTitles.map((t) => String(t ?? '').trim()).filter(Boolean)
        : []

      if (!ce) return { ok: false, message: 'Company session is missing an email.' }
      if (!nameTrim || !emailNorm) return { ok: false, message: 'Name and email are required.' }
      if (titles.length === 0) return { ok: false, message: 'Link at least one approved track.' }
      if (!String(password ?? '').trim()) return { ok: false, message: 'Password is required for trainer login.' }

      const snap = getCompanyTrainersSnapshot()
      const dup = snap.some(
        (row) => normalizeEmail(row.companyEmail) === ce && normalizeEmail(row.email) === emailNorm,
      )
      if (dup) return { ok: false, message: 'This email is already on your trainer roster.' }

      try {
        const entry = await createCompanyTrainer(
          toCompanyTrainerPayload({
            id: `co-tr-${Date.now()}`,
            companyEmail: ce,
            fullName: nameTrim,
            email: emailNorm,
            companyPosition: position,
            linkedTrackTitles: titles,
            password: String(password).trim(),
          }),
        )
        await refreshFromApi()
        return { ok: true, entry }
      } catch (error) {
        return { ok: false, message: getCompanyPortalApiErrorMessage(error, 'Could not add trainer.') }
      }
    },
    [companyEmail, refreshFromApi],
  )

  const updateTrainer = useCallback(
    async (trainerId, { fullName, email, companyPosition, linkedTrackTitles, password }) => {
      const ce = normalizeEmail(companyEmail)
      const nameTrim = String(fullName ?? '').trim()
      const emailNorm = normalizeEmail(email)
      const position = String(companyPosition ?? '').trim()
      const titles = Array.isArray(linkedTrackTitles)
        ? linkedTrackTitles.map((t) => String(t ?? '').trim()).filter(Boolean)
        : []

      if (!ce) return { ok: false, message: 'Company session is missing an email.' }
      if (!nameTrim || !emailNorm) return { ok: false, message: 'Name and email are required.' }
      if (titles.length === 0) return { ok: false, message: 'Link at least one approved track.' }

      const snap = getCompanyTrainersSnapshot()
      const prev = snap.find(
        (row) =>
          (row.id === trainerId || row.apiId === trainerId) && normalizeEmail(row.companyEmail) === ce,
      )
      if (!prev) return { ok: false, message: 'Trainer not found.' }

      const dup = snap.some(
        (row, i) =>
          row !== prev &&
          normalizeEmail(row.companyEmail) === ce &&
          normalizeEmail(row.email) === emailNorm,
      )
      if (dup) return { ok: false, message: 'This email is already on your trainer roster.' }

      const nextRow = {
        ...prev,
        fullName: nameTrim,
        email: emailNorm,
        companyPosition: position,
        linkedTrackTitles: titles,
        password: String(password ?? '').trim() || undefined,
      }
      const apiId = resolveEntryApiId(prev, snap)
      try {
        const entry = await updateCompanyTrainer(apiId, toCompanyTrainerPayload(nextRow))
        await refreshFromApi()
        return { ok: true, entry, previousEmail: normalizeEmail(prev.email) }
      } catch (error) {
        return { ok: false, message: getCompanyPortalApiErrorMessage(error, 'Could not update trainer.') }
      }
    },
    [companyEmail, refreshFromApi],
  )

  const removeTrainer = useCallback(
    async (trainerId) => {
      const ce = normalizeEmail(companyEmail)
      const snap = getCompanyTrainersSnapshot()
      const row = snap.find(
        (r) => (r.id === trainerId || r.apiId === trainerId) && normalizeEmail(r.companyEmail) === ce,
      )
      if (!row) return

      const apiId = resolveEntryApiId(row, snap)
      await deleteCompanyTrainer(apiId)
      await refreshFromApi()
    },
    [companyEmail, refreshFromApi],
  )

  return { trainers, addTrainer, updateTrainer, removeTrainer, refreshFromApi }
}
