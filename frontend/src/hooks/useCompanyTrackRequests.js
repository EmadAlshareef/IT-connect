import { useCallback, useEffect, useState } from 'react'
import {
  canSyncCompanyPortalApi,
  createCompanyTrackRequest,
  fetchCompanyTrackRequests,
  getCompanyPortalApiErrorMessage,
  resolveEntryApiId,
  toTrackRequestPayload,
  toTrackRequestUpdatePayload,
  updateCompanyTrackRequest,
} from '../api/companyPortalApi.js'
import {
  getCompanyTrackRequestsSnapshot,
  listenCompanyPortalStore,
  setCompanyTrackRequestsSnapshot,
} from '../utils/companyPortalStore.js'

export { parseCompanyTrackRequestsSnapshot } from '../utils/companyPortalStore.js'

export function useCompanyTrackRequests() {
  const canSync = canSyncCompanyPortalApi()
  const [requests, setRequests] = useState(getCompanyTrackRequestsSnapshot)

  const refreshFromApi = useCallback(async () => {
    const list = await fetchCompanyTrackRequests()
    setCompanyTrackRequestsSnapshot(list)
    setRequests(list)
    return list
  }, [])

  useEffect(() => {
    if (!canSync) {
      setRequests(getCompanyTrackRequestsSnapshot())
      return listenCompanyPortalStore(() => setRequests(getCompanyTrackRequestsSnapshot()))
    }
    void refreshFromApi().catch(() => setRequests(getCompanyTrackRequestsSnapshot()))
    return listenCompanyPortalStore(() => setRequests(getCompanyTrackRequestsSnapshot()))
  }, [canSync, refreshFromApi])

  const submitRequest = useCallback(
    async ({ title, description, requestedBy, requestedByEmail, branchId }) => {
      const cleanTitle = String(title ?? '').trim()
      if (!cleanTitle) return null

      const payload = toTrackRequestPayload({
        id: `ctr-${Date.now()}`,
        title: cleanTitle,
        description: String(description ?? '').trim(),
        requestedBy: String(requestedBy ?? '').trim() || 'Company Member',
        requestedByEmail: String(requestedByEmail ?? '').trim(),
        branchId: String(branchId ?? '').trim() || 'cairo',
      })
      if (!canSyncCompanyPortalApi()) {
        return { ok: false, message: 'Sign in with a company account connected to the API to request tracks.' }
      }
      try {
        const created = await createCompanyTrackRequest(payload)
        await refreshFromApi()
        return { ok: true, entry: created }
      } catch (error) {
        return { ok: false, message: getCompanyPortalApiErrorMessage(error, 'Could not submit track request.') }
      }
    },
    [refreshFromApi],
  )

  const setRequestStatus = useCallback(
    async (requestId, status, reviewedBy, extra = {}) => {
      const upperStatus = String(status ?? '').toUpperCase()
      if (upperStatus !== 'APPROVED' && upperStatus !== 'REJECTED') return false

      const snap = getCompanyTrackRequestsSnapshot()
      const prev = snap.find((r) => r.id === requestId || r.apiId === requestId)
      if (!prev) return false

      const nextRow = {
        ...prev,
        status: upperStatus,
        reviewedAt: Date.now(),
        reviewedBy: String(reviewedBy ?? '').trim(),
        ...extra,
      }

      const apiId = resolveEntryApiId(prev, snap)
      await updateCompanyTrackRequest(apiId, toTrackRequestUpdatePayload(nextRow))
      await refreshFromApi()
      return true
    },
    [refreshFromApi],
  )

  return { requests, submitRequest, setRequestStatus, refreshFromApi }
}
