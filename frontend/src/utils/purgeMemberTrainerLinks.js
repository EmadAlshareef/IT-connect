import {
  fetchCatalogTrainings,
  mapTrainingDtoToCard,
  saveTraining,
} from '../api/catalogApi.js'
import { deleteCompanyTrainer, fetchCompanyTrainers, resolveEntryApiId } from '../api/companyPortalApi.js'
import { adminBranches } from '../data/adminDashboardData.js'
import {
  parseCreatedTrainingsSnapshot,
  updateTrainingInSnapshot,
} from '../hooks/useAdminCreatedTrainings.js'
import { deleteMemberCredential } from '../hooks/useRegisteredMembers.js'
import { setCompanyTrainersSnapshot } from './companyPortalStore.js'
import { trainerTrackAssignmentKeys } from './branchTrainerRoster.js'

const TRAINER_TRACK_ASSIGNMENTS_STORAGE_KEY = 'itconnect_trainer_track_assignments_v1'

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function trainingMatchesTrainer(training, emailNorm, nameNorm) {
  const trainerEmail = normalizeEmail(training.trainerEmail)
  const trainerName = String(training.trainer ?? training.trainerName ?? '').trim().toLowerCase()
  return (emailNorm && trainerEmail === emailNorm) || (nameNorm && trainerName === nameNorm)
}

async function removeCompanyTrainersByEmail(email) {
  const emailNorm = normalizeEmail(email)
  if (!emailNorm) return

  const snap = await fetchCompanyTrainers()
  const toRemove = snap.filter((row) => normalizeEmail(row.email) === emailNorm)
  for (const row of toRemove) {
    const apiId = resolveEntryApiId(row, snap)
    await deleteCompanyTrainer(apiId).catch(() => undefined)
  }
  const remaining = await fetchCompanyTrainers()
  setCompanyTrainersSnapshot(remaining)
}

function removeTrainerTrackAssignments(trainerKeys) {
  if (typeof window === 'undefined' || trainerKeys.length === 0) return

  try {
    const raw = localStorage.getItem(TRAINER_TRACK_ASSIGNMENTS_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return

    const next = { ...parsed }
    for (const key of trainerKeys) {
      delete next[key]
    }
    localStorage.setItem(TRAINER_TRACK_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

async function clearTrainerFromCatalogTrainings(emailNorm, nameNorm) {
  for (const branch of adminBranches) {
    let rows = []
    try {
      rows = (await fetchCatalogTrainings(branch.id)).map(mapTrainingDtoToCard)
    } catch {
      rows = parseCreatedTrainingsSnapshot()[branch.id] ?? []
    }

    for (const training of rows) {
      if (!trainingMatchesTrainer(training, emailNorm, nameNorm)) continue
      try {
        await saveTraining({
          id: training.id,
          branchId: branch.id,
          trackId: training.trackId ?? training.linkedTrackId ?? null,
          category: training.category ?? 'FRONTEND',
          title: training.title,
          body: training.body ?? '',
          startDate: training.startDate ?? training.date ?? null,
          trainerLegacyId: null,
          seatsTotal: training.seatsTotal ?? 20,
          status: training.status ?? 'active',
          filterTag: training.filterTag ?? null,
        })
      } catch {
        updateTrainingInSnapshot(branch.id, training.id, { trainer: '', trainerEmail: '' })
      }
    }
  }
}

/**
 * When a member is removed, detach them from company trainer roster, track assignments, and catalog trainings.
 */
export async function purgeMemberTrainerLinks(member) {
  const email = String(member?.email ?? '').trim()
  const emailNorm = normalizeEmail(email)
  const nameNorm = String(member?.fullName ?? '').trim().toLowerCase()
  if (!emailNorm && !nameNorm) return

  await removeCompanyTrainersByEmail(email)
  removeTrainerTrackAssignments(trainerTrackAssignmentKeys({ email, fullName: member?.fullName }))
  await clearTrainerFromCatalogTrainings(emailNorm, nameNorm)
  if (emailNorm) deleteMemberCredential(emailNorm)
}
