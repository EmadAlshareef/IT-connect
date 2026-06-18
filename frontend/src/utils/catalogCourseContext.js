import { adminBranches, getBranchAdminTrainings } from '../data/adminDashboardData.js'
import { parseCreatedTrainingsSnapshot } from '../hooks/useAdminCreatedTrainings.js'
import { getCompanyTrainingRequestsSnapshot } from './companyPortalStore.js'

function readCompanyTrainingRequests() {
  return getCompanyTrainingRequestsSnapshot()
}

/**
 * Map trainer dashboard session / training id to catalog branch + course ids.
 */
export function resolveCatalogCourseForTrainingId(trainingId) {
  const tid = String(trainingId ?? '').trim()
  if (!tid) return null

  for (const branch of adminBranches) {
    const seed = getBranchAdminTrainings(branch.id).find((t) => String(t.id) === tid)
    if (seed) {
      return {
        branchId: branch.id,
        courseId: seed.id,
        courseTitle: String(seed.title ?? '').trim(),
      }
    }
  }

  const created = parseCreatedTrainingsSnapshot()
  for (const [branchId, list] of Object.entries(created)) {
    if (!Array.isArray(list)) continue
    const row = list.find((t) => String(t.id) === tid)
    if (row) {
      return {
        branchId: String(branchId),
        courseId: String(row.id),
        courseTitle: String(row.title ?? '').trim(),
      }
    }
  }

  const companyReq = readCompanyTrainingRequests().find(
    (r) => String(r.publishedTrainingId ?? '') === tid || String(r.id) === tid,
  )
  if (companyReq) {
    return {
      branchId: String(companyReq.branchId ?? adminBranches[0]?.id ?? 'cairo'),
      courseId: String(companyReq.publishedTrainingId ?? companyReq.id),
      courseTitle: String(companyReq.title ?? '').trim(),
    }
  }

  return null
}
