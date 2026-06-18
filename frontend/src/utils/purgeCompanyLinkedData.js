import {
  deleteCompanyPostRequest,
  deleteCompanyTrainingRequest,
  fetchCompanyPostRequests,
  fetchCompanyTrainingRequests,
  resolveEntryApiId,
} from '../api/companyPortalApi.js'
import { normalizeBranchId } from '../data/adminDashboardData.js'
import { parseCreatedTrainingsSnapshot, removeTrainingsByIdsGlobally } from '../hooks/useAdminCreatedTrainings.js'
import {
  setCompanyPostRequestsSnapshot,
  setCompanyTrainingRequestsSnapshot,
} from './companyPortalStore.js'

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function trainingIdFromRequest(request) {
  const published = String(request?.publishedTrainingId ?? '').trim()
  if (published) return published
  const createdAt = request?.createdAt
  if (!createdAt) return ''
  const branchId = normalizeBranchId(request.branchId)
  return `new-training-${branchId}-${createdAt}`
}

/**
 * Removes catalog trainings and company training/post requests tied to a company contact email.
 */
export async function purgeCompanyLinkedData(contactEmail) {
  const email = normalizeEmail(contactEmail)
  if (!email) {
    return { removedTrainings: 0, removedTrainingRequests: 0, removedPostRequests: 0 }
  }

  const trainingIds = new Set()
  const companyTrainingReqs = await fetchCompanyTrainingRequests({ companyEmail: email })
  const companyTrainingRequestIds = new Set(companyTrainingReqs.map((r) => r.id))

  for (const request of companyTrainingReqs) {
    const id = trainingIdFromRequest(request)
    if (id) trainingIds.add(id)
  }

  const catalog = parseCreatedTrainingsSnapshot()
  for (const list of Object.values(catalog)) {
    if (!Array.isArray(list)) continue
    for (const row of list) {
      if (normalizeEmail(row.companyContactEmail) === email && row.id) {
        trainingIds.add(row.id)
      }
    }
  }

  const removedTrainings = await removeTrainingsByIdsGlobally([...trainingIds])

  for (const request of companyTrainingReqs) {
    const apiId = resolveEntryApiId(request, companyTrainingReqs)
    await deleteCompanyTrainingRequest(apiId)
  }

  const postReqs = await fetchCompanyPostRequests({ companyEmail: email })
  const toDeletePosts = postReqs.filter(
    (r) =>
      normalizeEmail(r.requestedByEmail) === email ||
      companyTrainingRequestIds.has(r.companyTrainingRequestId),
  )

  for (const request of toDeletePosts) {
    const apiId = resolveEntryApiId(request, postReqs)
    await deleteCompanyPostRequest(apiId)
  }

  const remainingTraining = await fetchCompanyTrainingRequests()
  setCompanyTrainingRequestsSnapshot(remainingTraining)

  const remainingPosts = await fetchCompanyPostRequests()
  setCompanyPostRequestsSnapshot(remainingPosts)

  return {
    removedTrainings,
    removedTrainingRequests: companyTrainingReqs.length,
    removedPostRequests: toDeletePosts.length,
  }
}
