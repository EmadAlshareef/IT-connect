import { fetchTraining, mapTrainingDtoToCard } from '../api/catalogApi.js'
import { getBranchAdminTrainings } from '../data/adminDashboardData.js'
import { parseCreatedTrainingsSnapshot } from '../hooks/useAdminCreatedTrainings.js'
import { parseRegisteredMembersSnapshot } from '../hooks/useRegisteredMembers.js'
import {
  getCompanyTrainingRequestsSnapshot,
  getTrainerCatalogTrainingsSnapshot,
} from './companyPortalStore.js'
import { normalizePortalEmail } from './portalUserDirectory.js'
import { PLATFORM_DEFAULT_TRAINER } from './platformDefaultTrainer.js'

const catalogTrainerCache = new Map()

function resolveTrainerUserId(trainerEmail) {
  const email = normalizePortalEmail(trainerEmail)
  if (!email) return ''
  const member = parseRegisteredMembersSnapshot().find(
    (row) => normalizePortalEmail(row.email) === email,
  )
  return member?.id ? String(member.id) : ''
}

function packTrainer(meta = {}) {
  const trainerEmail = String(meta.trainerEmail ?? '').trim().toLowerCase()
  const trainerName = String(meta.trainerName ?? meta.trainer ?? '').trim()
  const trainerId = String(meta.trainerId ?? '').trim() || resolveTrainerUserId(trainerEmail)
  return {
    trainerId,
    trainerEmail,
    trainerName: trainerName || trainerEmail,
    courseTitle: String(meta.courseTitle ?? '').trim(),
  }
}

/**
 * Resolve trainer metadata for a catalog course (admin seed + company-published).
 */
export function resolveCourseTrainer(branchId, courseId) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!bid || !cid) {
    return { trainerId: '', trainerEmail: '', trainerName: '', courseTitle: '' }
  }

  const seed = getBranchAdminTrainings(bid).find((t) => String(t.id) === cid)
  if (seed) {
    return packTrainer({
      trainerId: seed.trainerId ?? '',
      trainerEmail: seed.trainerEmail ?? '',
      trainerName: seed.trainer ?? seed.trainerName ?? '',
      courseTitle: seed.title ?? '',
    })
  }

  const created = parseCreatedTrainingsSnapshot()[bid] ?? []
  const createdRow = created.find((t) => String(t.id) === cid)
  if (createdRow) {
    const email = String(createdRow.trainerEmail ?? '').trim().toLowerCase()
    return packTrainer({
      trainerId: resolveTrainerUserId(email),
      trainerEmail: email,
      trainerName: String(createdRow.trainer ?? '').trim(),
      courseTitle: String(createdRow.title ?? '').trim(),
    })
  }

  const companyRow = getCompanyTrainingRequestsSnapshot().find(
    (r) => String(r.publishedTrainingId ?? '') === cid,
  )
  if (companyRow) {
    const email = String(companyRow.trainerEmail ?? '').trim().toLowerCase()
    return packTrainer({
      trainerId: resolveTrainerUserId(email),
      trainerEmail: email,
      trainerName: String(companyRow.trainer ?? '').trim(),
      courseTitle: String(companyRow.title ?? '').trim(),
    })
  }

  const catalogRow = getTrainerCatalogTrainingsSnapshot().find((t) => String(t.id) === cid)
  if (catalogRow) {
    const email = String(catalogRow.trainerEmail ?? '').trim().toLowerCase()
    return packTrainer({
      trainerId: catalogRow.trainerId ?? resolveTrainerUserId(email),
      trainerEmail: email,
      trainerName: String(catalogRow.trainerName ?? catalogRow.trainer ?? '').trim(),
      courseTitle: String(catalogRow.title ?? '').trim(),
    })
  }

  const cacheKey = `${bid}::${cid}`
  const cached = catalogTrainerCache.get(cacheKey)
  if (cached) return cached

  return packTrainer({ courseTitle: '' })
}

/** Load instructor for a catalog course (SQL catalog + local fallbacks). */
export async function fetchCourseTrainer(branchId, courseId) {
  const local = resolveCourseTrainer(branchId, courseId)
  if (local.trainerEmail) return local

  const cacheKey = `${String(branchId ?? '').trim()}::${String(courseId ?? '').trim()}`
  if (catalogTrainerCache.has(cacheKey)) return catalogTrainerCache.get(cacheKey)

  try {
    const dto = await fetchTraining(courseId)
    if (!dto) return local
    const row = mapTrainingDtoToCard(dto)
    const bid = String(branchId ?? '').trim()
    if (bid && row.branchId && bid !== row.branchId) return local
    const packed = packTrainer({
      trainerId: row.trainerId,
      trainerEmail: row.trainerEmail,
      trainerName: row.trainerName || row.trainer,
      courseTitle: row.title,
    })
    if (packed.trainerEmail) catalogTrainerCache.set(cacheKey, packed)
    return packed
  } catch {
    return local
  }
}

export function isDefaultCourseTrainer(meta) {
  if (!meta?.trainerEmail && !meta?.trainerId) return true
  return (
    meta.trainerId === PLATFORM_DEFAULT_TRAINER.trainerId ||
    normalizePortalEmail(meta.trainerEmail) === normalizePortalEmail(PLATFORM_DEFAULT_TRAINER.trainerEmail)
  )
}
