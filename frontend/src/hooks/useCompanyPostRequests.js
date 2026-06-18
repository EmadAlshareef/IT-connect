import { useCallback, useEffect, useState } from 'react'
import {
  canSyncCompanyPortalApi,
  createCompanyPostRequest,
  fetchCompanyPostRequests,
  resolveEntryApiId,
  toPostRequestPayload,
  toPostRequestUpdatePayload,
  updateCompanyPostRequest,
} from '../api/companyPortalApi.js'
import {
  getCompanyPostRequestsSnapshot,
  listenCompanyPortalStore,
  setCompanyPostRequestsSnapshot,
} from '../utils/companyPortalStore.js'

export { parseCompanyPostRequestsSnapshot } from '../utils/companyPortalStore.js'

export function useCompanyPostRequests() {
  const canSync = canSyncCompanyPortalApi()
  const [requests, setRequests] = useState(getCompanyPostRequestsSnapshot)

  const refreshFromApi = useCallback(async () => {
    const list = await fetchCompanyPostRequests()
    setCompanyPostRequestsSnapshot(list)
    setRequests(list)
    return list
  }, [])

  useEffect(() => {
    if (!canSync) {
      setRequests(getCompanyPostRequestsSnapshot())
      return listenCompanyPortalStore(() => setRequests(getCompanyPostRequestsSnapshot()))
    }
    void refreshFromApi().catch(() => setRequests(getCompanyPostRequestsSnapshot()))
    return listenCompanyPortalStore(() => setRequests(getCompanyPostRequestsSnapshot()))
  }, [canSync, refreshFromApi])

  const submitRequest = useCallback(
    async ({
      title,
      body,
      trainingTitle,
      companyTrainingRequestId,
      skillsRaw,
      deadline,
      requestedBy,
      requestedByEmail,
      branchId,
    }) => {
      const cleanTitle = String(title ?? '').trim()
      const tt = String(trainingTitle ?? '').trim()
      if (!cleanTitle || !tt) return null

      const created = await createCompanyPostRequest(
        toPostRequestPayload({
          id: `cpos-${Date.now()}`,
          title: cleanTitle,
          body: String(body ?? '').trim() || 'No description provided.',
          trainingTitle: tt,
          companyTrainingRequestId: String(companyTrainingRequestId ?? '').trim(),
          skillsRaw: String(skillsRaw ?? '').trim(),
          deadline: String(deadline ?? '').trim(),
          requestedBy: String(requestedBy ?? '').trim() || 'Company Member',
          requestedByEmail: String(requestedByEmail ?? '').trim(),
          branchId: String(branchId ?? '').trim() || 'cairo',
        }),
      )
      await refreshFromApi()
      return created
    },
    [refreshFromApi],
  )

  const setRequestStatus = useCallback(
    async (requestId, reviewStatus, reviewedBy, extra = {}) => {
      const upper = String(reviewStatus ?? '').toUpperCase()
      if (upper !== 'APPROVED' && upper !== 'REJECTED') return false

      const snap = getCompanyPostRequestsSnapshot()
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
      await updateCompanyPostRequest(apiId, toPostRequestUpdatePayload(nextRow))
      await refreshFromApi()
      return true
    },
    [refreshFromApi],
  )

  return { requests, submitRequest, setRequestStatus, refreshFromApi }
}
