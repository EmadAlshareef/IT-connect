import {
  canSyncCompanyPortalApi,
  fetchCompanies,
  fetchCompanyPostRequests,
  fetchCompanyTrackRequests,
  fetchCompanyTrainers,
  fetchCompanyTrainingRequests,
} from '../api/companyPortalApi.js'
import { fetchCatalogTrainings, mapTrainingDtoToCard } from '../api/catalogApi.js'
import { parseCreatedTrainingsSnapshot } from '../hooks/useAdminCreatedTrainings.js'
import { refreshCompanySelectedTracksFromApi } from './companySelectedTracks.js'
import { bootstrapTrainerTaskBriefs } from './taskApprovalRequests.js'
import { bootstrapTrainerTopicDocs } from './topicDocumentationStorage.js'
import {
  setCompanyPostRequestsSnapshot,
  setCompanyProfilesSnapshot,
  setCompanyTrackRequestsSnapshot,
  setCompanyTrainersSnapshot,
  setCompanyTrainingRequestsSnapshot,
  setTrainerCatalogTrainingsSnapshot,
} from './companyPortalStore.js'

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function catalogCardsForTrainer(trainerEmail) {
  const email = normalizeEmail(trainerEmail)
  if (!email) return []

  const fromLocal = []
  const snap = parseCreatedTrainingsSnapshot()
  for (const [branchId, list] of Object.entries(snap)) {
    if (!Array.isArray(list)) continue
    for (const row of list) {
      if (normalizeEmail(row.trainerEmail) !== email) continue
      fromLocal.push({
        ...row,
        branchId: row.branchId || branchId,
      })
    }
  }
  return fromLocal
}

/** Trainer dashboard: roster + assigned company trainings + catalog matches. */
export async function bootstrapTrainerPortalData(trainerEmail = '') {
  if (!canSyncCompanyPortalApi()) return { trainers: [], trainingRequests: [], catalogTrainings: [] }
  const email = normalizeEmail(trainerEmail)
  const [trainersResult, trainingRequestsResult, catalogResult] = await Promise.allSettled([
    fetchCompanyTrainers(),
    fetchCompanyTrainingRequests(),
    fetchCatalogTrainings(),
  ])

  const trainers = trainersResult.status === 'fulfilled' ? trainersResult.value : []
  const trainingRequests = trainingRequestsResult.status === 'fulfilled' ? trainingRequestsResult.value : []

  let catalogMatches = []
  if (catalogResult.status === 'fulfilled' && email) {
    catalogMatches = catalogResult.value
      .filter((row) => normalizeEmail(row.trainerEmail) === email)
      .map(mapTrainingDtoToCard)
  }

  const localMatches = catalogCardsForTrainer(email)
  const mergedCatalog = [...catalogMatches]
  const seenIds = new Set(catalogMatches.map((row) => row.id))
  for (const row of localMatches) {
    if (!row?.id || seenIds.has(row.id)) continue
    seenIds.add(row.id)
    mergedCatalog.push(row)
  }

  setCompanyTrainersSnapshot(trainers)
  setCompanyTrainingRequestsSnapshot(trainingRequests)
  setTrainerCatalogTrainingsSnapshot(mergedCatalog)
  await Promise.all([bootstrapTrainerTaskBriefs(email), bootstrapTrainerTopicDocs(email)])
  return { trainers, trainingRequests, catalogTrainings: mergedCatalog }
}

/** Preload all company portal data from SQL (no localStorage). */
export async function bootstrapCompanyPortalData({ trainerOnly = false, trainerEmail = '' } = {}) {
  if (trainerOnly) {
    await bootstrapTrainerPortalData(trainerEmail)
    return
  }
  if (!canSyncCompanyPortalApi()) return

  const results = await Promise.allSettled([
    fetchCompanies(),
    fetchCompanyTrainers(),
    fetchCompanyTrackRequests(),
    fetchCompanyTrainingRequests(),
    fetchCompanyPostRequests(),
  ])

  const [profiles, trainers, trackRequests, trainingRequests, postRequests] = results.map((result) =>
    result.status === 'fulfilled' ? result.value : [],
  )

  setCompanyProfilesSnapshot(profiles)
  setCompanyTrainersSnapshot(trainers)
  setCompanyTrackRequestsSnapshot(trackRequests)
  setCompanyTrainingRequestsSnapshot(trainingRequests)
  setCompanyPostRequestsSnapshot(postRequests)
  setTrainerCatalogTrainingsSnapshot([])
  await refreshCompanySelectedTracksFromApi()
}
