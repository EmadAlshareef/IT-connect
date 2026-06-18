import { useCallback, useEffect, useState } from 'react'
import {
  canSyncCompanyPortalApi,
  createCompany,
  deleteCompany,
  fetchCompanies,
  resolveEntryApiId,
  toCreateCompanyPayload,
  toUpdateCompanyPayload,
  updateCompany as updateCompanyApi,
} from '../api/companyPortalApi.js'
import {
  getCompanyProfilesSnapshot,
  listenCompanyPortalStore,
  setCompanyProfilesSnapshot,
} from '../utils/companyPortalStore.js'

export { parseCompanyProfilesSnapshot } from '../utils/companyPortalStore.js'

function slugifyName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function useCompanyProfiles() {
  const canSync = canSyncCompanyPortalApi()
  const [companies, setCompanies] = useState(getCompanyProfilesSnapshot)

  const refreshFromApi = useCallback(async () => {
    const list = await fetchCompanies()
    setCompanyProfilesSnapshot(list)
    setCompanies(list)
    return list
  }, [])

  useEffect(() => {
    if (!canSync) {
      setCompanies(getCompanyProfilesSnapshot())
      return listenCompanyPortalStore(() => setCompanies(getCompanyProfilesSnapshot()))
    }
    void refreshFromApi().catch(() => setCompanies(getCompanyProfilesSnapshot()))
    return listenCompanyPortalStore(() => setCompanies(getCompanyProfilesSnapshot()))
  }, [canSync, refreshFromApi])

  const addCompany = useCallback(
    async (payload) => {
      const companyName = String(payload?.companyName ?? '').trim()
      if (!companyName) return null

      const localId = `company-${Date.now()}`
      const created = await createCompany(
        toCreateCompanyPayload({
          id: localId,
          slug: slugifyName(companyName) || localId,
          ...payload,
        }),
      )
      await refreshFromApi()
      return created
    },
    [refreshFromApi],
  )

  const updateCompany = useCallback(
    async (companyId, payload) => {
      const id = String(companyId ?? '').trim()
      if (!id) return null

      const companyName = String(payload?.companyName ?? '').trim()
      if (!companyName) return null

      const snap = getCompanyProfilesSnapshot()
      const prev = snap.find((c) => c.id === id || c.apiId === id)
      if (!prev) return null

      const merged = {
        ...prev,
        ...payload,
        companyName,
        slug: slugifyName(companyName) || prev.slug,
        contactEmail: String(payload?.contactEmail ?? prev.contactEmail ?? '').trim().toLowerCase(),
      }

      const apiId = resolveEntryApiId(prev, snap)
      const updated = await updateCompanyApi(apiId, toUpdateCompanyPayload(merged))
      await refreshFromApi()
      return updated
    },
    [refreshFromApi],
  )

  const removeCompany = useCallback(
    async (companyId) => {
      const id = String(companyId ?? '').trim()
      if (!id) return false

      const snap = getCompanyProfilesSnapshot()
      const row = snap.find((c) => c.id === id || c.apiId === id)
      if (!row) return false

      const apiId = resolveEntryApiId(row, snap)
      await deleteCompany(apiId)
      await refreshFromApi()
      return true
    },
    [refreshFromApi],
  )

  return { companies, addCompany, updateCompany, removeCompany, refreshFromApi }
}
