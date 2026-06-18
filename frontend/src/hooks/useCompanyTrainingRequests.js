import { useCallback, useEffect, useState } from 'react'
import {
  canSyncCompanyPortalApi,
  createCompanyTrainingRequest,
  fetchCompanyTrainingRequests,
  getCompanyPortalApiErrorMessage,
  resolveEntryApiId,
  toTrainingRequestPayload,
  toTrainingRequestUpdatePayload,
  updateCompanyTrainingRequest,
} from '../api/companyPortalApi.js'
import { publishCompanyTrainingRequest } from '../utils/publishCompanyTraining.js'
import {
  getCompanyTrainingRequestsSnapshot,
  listenCompanyPortalStore,
  setCompanyTrainingRequestsSnapshot,
} from '../utils/companyPortalStore.js'

export { parseCompanyTrainingRequestsSnapshot } from '../utils/companyPortalStore.js'

function publishAndApproveEntry(entry, reviewedBy = 'Company') {
  const publishedTrainingId = publishCompanyTrainingRequest(entry)
  return {
    ...entry,
    reviewStatus: 'APPROVED',
    reviewedAt: Date.now(),
    reviewedBy: String(reviewedBy ?? '').trim() || 'Company',
    publishedTrainingId,
  }
}

export function useCompanyTrainingRequests() {
  const canSync = canSyncCompanyPortalApi()
  const [requests, setRequests] = useState(getCompanyTrainingRequestsSnapshot)

  const refreshFromApi = useCallback(async () => {
    const list = await fetchCompanyTrainingRequests()
    setCompanyTrainingRequestsSnapshot(list)
    setRequests(list)
    return list
  }, [])

  useEffect(() => {
    if (!canSync) {
      setRequests(getCompanyTrainingRequestsSnapshot())
      return listenCompanyPortalStore(() => setRequests(getCompanyTrainingRequestsSnapshot()))
    }
    void refreshFromApi().catch(() => setRequests(getCompanyTrainingRequestsSnapshot()))
    return listenCompanyPortalStore(() => setRequests(getCompanyTrainingRequestsSnapshot()))
  }, [canSync, refreshFromApi])

  const submitRequest = useCallback(
    async ({
      title,
      body,
      trackRequestId,
      trackTitle,
      trainer,
      trainerEmail,
      date,
      seatsTotal,
      status,
      requestedBy,
      requestedByEmail,
      branchId,
      documentFileName,
      documentDataUrl,
    }) => {
      const cleanTitle = String(title ?? '').trim()
      const cleanTrainer = String(trainer ?? '').trim()
      const cleanTrainerEmail = String(trainerEmail ?? '').trim().toLowerCase()
      if (!cleanTitle || !cleanTrainer) {
        return { ok: false, message: 'Title and trainer are required.' }
      }
      if (!cleanTrainerEmail) {
        return { ok: false, message: 'Select a trainer for this training.' }
      }

      const createdAt = Date.now()
      const entry = {
        id: `ctrn-${createdAt}`,
        title: cleanTitle,
        body: String(body ?? '').trim() || 'No description provided.',
        trackRequestId: String(trackRequestId ?? '').trim(),
        trackTitle: String(trackTitle ?? '').trim(),
        trainer: cleanTrainer,
        trainerEmail: cleanTrainerEmail,
        date: String(date ?? '').trim() || new Date().toISOString().slice(0, 10),
        seatsTotal: Math.max(1, Number.parseInt(String(seatsTotal ?? '20'), 10) || 20),
        status: String(status ?? '').toLowerCase() === 'upcoming' ? 'upcoming' : 'active',
        requestedBy: String(requestedBy ?? '').trim() || 'Company Member',
        requestedByEmail: String(requestedByEmail ?? '').trim(),
        branchId: String(branchId ?? '').trim() || 'cairo',
        documentFileName: String(documentFileName ?? '').trim(),
        documentDataUrl: String(documentDataUrl ?? '').trim(),
        createdAt,
        reviewStatus: 'PENDING',
        reviewedAt: null,
        reviewedBy: '',
        publishedTrainingId: '',
      }

      const publishLocal = () => {
        const approvedEntry = publishAndApproveEntry(entry, entry.requestedBy)
        const snap = getCompanyTrainingRequestsSnapshot()
        const next = [approvedEntry, ...snap.filter((row) => row.id !== approvedEntry.id)]
        setCompanyTrainingRequestsSnapshot(next)
        setRequests(next)
        return { ok: true, entry: approvedEntry, source: 'local' }
      }

      if (!canSync) {
        return publishLocal()
      }

      try {
        const created = await createCompanyTrainingRequest(toTrainingRequestPayload(entry))
        const apiId = created.apiId || created.id
        if (!apiId) {
          return { ok: false, message: 'Training was created but the server id was missing. Refresh and try again.' }
        }
        const approvedEntry = publishAndApproveEntry(
          { ...entry, apiId, id: created.id || entry.id },
          entry.requestedBy,
        )
        await updateCompanyTrainingRequest(apiId, toTrainingRequestUpdatePayload(approvedEntry))
        await refreshFromApi()
        return { ok: true, entry: approvedEntry, source: 'api' }
      } catch (error) {
        return {
          ok: false,
          message: getCompanyPortalApiErrorMessage(error, 'Could not submit training for approval.'),
        }
      }
    },
    [canSync, refreshFromApi],
  )

  const assignTrainer = useCallback(
    async (requestId, { trainer, trainerEmail }, companyContactEmail) => {
      const ce = String(companyContactEmail ?? '').trim().toLowerCase()
      const name = String(trainer ?? '').trim()
      const te = String(trainerEmail ?? '').trim().toLowerCase()
      if (!name || !te) return { ok: false, message: 'Trainer name and email are required.' }

      const snap = getCompanyTrainingRequestsSnapshot()
      const prev = snap.find(
        (r) =>
          (r.id === requestId || r.apiId === requestId) &&
          (!ce || String(r.requestedByEmail ?? '').trim().toLowerCase() === ce),
      )
      if (!prev) return { ok: false, message: 'Training not found.' }

      const reviewStatus = String(prev.reviewStatus ?? '').toUpperCase()
      if (reviewStatus === 'REJECTED') {
        return { ok: false, message: 'Cannot change trainer on a rejected training.' }
      }

      let updated = { ...prev, trainer: name, trainerEmail: te }
      if (reviewStatus !== 'APPROVED' || !String(prev.publishedTrainingId ?? '').trim()) {
        updated = publishAndApproveEntry(updated, ce || name)
      }

      const apiId = resolveEntryApiId(prev, snap)
      if (!apiId) {
        return { ok: false, message: 'Training record is missing a server id. Refresh the page and try again.' }
      }

      try {
        await updateCompanyTrainingRequest(apiId, toTrainingRequestUpdatePayload(updated))
        setCompanyTrainingRequestsSnapshot(
          snap.map((row) =>
            row.id === prev.id || row.apiId === prev.apiId || row.id === prev.apiId ? updated : row,
          ),
        )
        await refreshFromApi()
        return { ok: true, entry: updated }
      } catch (error) {
        return {
          ok: false,
          message: getCompanyPortalApiErrorMessage(error, 'Could not save trainer link.'),
        }
      }
    },
    [refreshFromApi],
  )

  const republishEligiblePending = useCallback(
    async (companyEmail) => {
      const ce = String(companyEmail ?? '').trim().toLowerCase()
      const snap = getCompanyTrainingRequestsSnapshot()
      let changed = 0

      for (const row of snap) {
        if (ce && String(row.requestedByEmail ?? '').trim().toLowerCase() !== ce) continue
        const status = String(row.reviewStatus ?? '').toUpperCase()
        if (status === 'APPROVED' && row.publishedTrainingId) continue
        if (status === 'REJECTED') continue
        if (!String(row.trainer ?? '').trim() || !String(row.trainerEmail ?? '').trim()) continue

        const updated = publishAndApproveEntry(row, row.requestedBy)
        const apiId = resolveEntryApiId(row, snap)
        await updateCompanyTrainingRequest(apiId, toTrainingRequestUpdatePayload(updated))
        changed += 1
      }

      if (changed > 0) await refreshFromApi()
      return changed
    },
    [refreshFromApi],
  )

  const setRequestStatus = useCallback(
    async (requestId, reviewStatus, reviewedBy, extra = {}) => {
      const upper = String(reviewStatus ?? '').toUpperCase()
      if (upper !== 'APPROVED' && upper !== 'REJECTED') return false

      const snap = getCompanyTrainingRequestsSnapshot()
      const prev = snap.find((r) => r.id === requestId || r.apiId === requestId)
      if (!prev) return false

      const nextRow = {
        ...prev,
        reviewStatus: upper,
        reviewedAt: Date.now(),
        reviewedBy: String(reviewedBy ?? '').trim(),
        ...extra,
      }

      const apiId = resolveEntryApiId(prev, snap)
      await updateCompanyTrainingRequest(apiId, toTrainingRequestUpdatePayload(nextRow))
      await refreshFromApi()
      return true
    },
    [refreshFromApi],
  )

  return { requests, submitRequest, setRequestStatus, assignTrainer, republishEligiblePending, refreshFromApi }
}
