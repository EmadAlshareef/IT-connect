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
  const canWrite = canSyncCompanyPortalApi()
  const [companies, setCompanies] = useState(getCompanyProfilesSnapshot)

  const refreshFromApi = useCallback(async () => {
    const list = await fetchCompanies()
    setCompanyProfilesSnapshot(list)
    setCompanies(list)
    return list
  }, [])

  useEffect(() => {
    // Company profiles are public read data; only create/update/delete require auth.
    void refreshFromApi().catch(() => setCompanies(getCompanyProfilesSnapshot()))
    return listenCompanyPortalStore(() => setCompanies(getCompanyProfilesSnapshot()))
  }, [refreshFromApi])

  const addCompany = useCallback(
    async (payload) => {
      const companyName = String(payload?.companyName ?? '').trim()
      if (!companyName) return null
      if (!canWrite) throw new Error('Sign in with an admin or company account to save companies.')

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
    [canWrite, refreshFromApi],
  )

  const updateCompany = useCallback(
    async (companyId, payload) => {
      const id = String(companyId ?? '').trim()
      if (!id) return null
      if (!canWrite) throw new Error('Sign in with an admin or company account to save companies.')

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
    [canWrite, refreshFromApi],
  )

  const removeCompany = useCallback(
    async (companyId) => {
      const id = String(companyId ?? '').trim()
      if (!id) return false
      if (!canWrite) throw new Error('Sign in with an admin or company account to delete companies.')

      const snap = getCompanyProfilesSnapshot()
      const row = snap.find((c) => c.id === id || c.apiId === id)
      if (!row) return false

      const apiId = resolveEntryApiId(row, snap)
      await deleteCompany(apiId)
      await refreshFromApi()
      return true
    },
    [canWrite, refreshFromApi],
  )

  return { companies, addCompany, updateCompany, removeCompany, refreshFromApi }
}
