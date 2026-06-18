import { useEffect, useMemo, useState } from 'react'
import { buildTrainerCompanyWorkspace } from '../utils/trainerCompanyWorkspace.js'
import { listenCompanyPortalStore } from '../utils/companyPortalStore.js'

/**
 * Live company-linked trainer profile, programs, and session cards for `/dashboard`.
 * SQL bootstrap runs from AppShell (trainer/admin/company only) — not here.
 */
export function useTrainerCompanyWorkspace(trainerEmail, authTrainerName = '') {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    const unlistenStore = listenCompanyPortalStore(bump)
    window.addEventListener('admin-created-trainings', bump)
    return () => {
      unlistenStore()
      window.removeEventListener('admin-created-trainings', bump)
    }
  }, [])

  return useMemo(
    () => buildTrainerCompanyWorkspace(trainerEmail, authTrainerName),
    [trainerEmail, authTrainerName, tick],
  )
}
