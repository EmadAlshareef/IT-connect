import { updateTrainingInSnapshot } from '../hooks/useAdminCreatedTrainings.js'
import { normalizeBranchId } from '../data/adminDashboardData.js'

function initialsFromTrainerName(name) {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return '??'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

/** Keeps catalog training in sync when a company training request gets a trainer link. */
export function syncPublishedTrainingTrainerLink(request) {
  const publishedId = String(request?.publishedTrainingId ?? '').trim()
  if (!publishedId) return false

  const trainer = String(request.trainer ?? '').trim()
  const trainerEmail = String(request.trainerEmail ?? '').trim().toLowerCase()
  if (!trainer || !trainerEmail) return false

  return updateTrainingInSnapshot(normalizeBranchId(request.branchId), publishedId, {
    trainer,
    trainerEmail,
    initials: initialsFromTrainerName(trainer),
  })
}
