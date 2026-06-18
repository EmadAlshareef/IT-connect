import { getBranchAdminTrainings } from '../data/adminDashboardData.js'
import { parseCreatedTrainingsSnapshot } from '../hooks/useAdminCreatedTrainings.js'
import { getCompanyTrainingRequestsSnapshot } from './companyPortalStore.js'
import {
  countCatalogStudentsForCourse,
  findCatalogEnrollment,
} from './trainingCatalogEnrollment.js'

function normalizeSeatsTotal(value, fallback = 20) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return fallback
}

/** Resolve seat capacity for a catalog training (seed, admin-created, or company-published). */
export function resolveTrainingSeatsTotal(branchId, trainingId) {
  const bid = String(branchId ?? '').trim()
  const tid = String(trainingId ?? '').trim()
  if (!bid || !tid) return 20

  const seed = getBranchAdminTrainings(bid).find((row) => String(row.id) === tid)
  if (seed) return normalizeSeatsTotal(seed.seatsTotal)

  const created = parseCreatedTrainingsSnapshot()[bid] ?? []
  const createdRow = created.find((row) => String(row.id) === tid)
  if (createdRow) return normalizeSeatsTotal(createdRow.seatsTotal)

  const companyRow = getCompanyTrainingRequestsSnapshot().find(
    (r) => String(r.publishedTrainingId ?? '') === tid,
  )
  if (companyRow) return normalizeSeatsTotal(companyRow.seatsTotal)

  return 20
}

export function resolveTrainingSeatsTaken(branchId, trainingId) {
  const bid = String(branchId ?? '').trim()
  const tid = String(trainingId ?? '').trim()
  if (!bid || !tid) return 0
  return countCatalogStudentsForCourse(bid, tid)
}

export function resolveTrainingSeatAvailability(branchId, trainingId, studentEmail) {
  const bid = String(branchId ?? '').trim()
  const tid = String(trainingId ?? '').trim()
  const total = resolveTrainingSeatsTotal(bid, tid)
  const taken = resolveTrainingSeatsTaken(bid, tid)
  const enrollment = findCatalogEnrollment(studentEmail, bid, tid)
  const isEnrolled = Boolean(enrollment)
  const available = Math.max(0, total - taken)
  return { total, taken, available, isEnrolled, isFull: !isEnrolled && available <= 0 }
}

/** Seat counts for UI badges (Services, Admin, Enroll button). */
export function getCatalogTrainingSeatStats(branchId, trainingId) {
  const total = resolveTrainingSeatsTotal(branchId, trainingId)
  const taken = resolveTrainingSeatsTaken(branchId, trainingId)
  return {
    taken,
    total,
    isFull: taken >= total,
  }
}

/** Throws when the course is full and the student is not already enrolled. */
export function assertCatalogSeatAvailable(branchId, trainingId, userId) {
  const bid = String(branchId ?? '').trim()
  const tid = String(trainingId ?? '').trim()
  const uid = String(userId ?? '').trim()
  if (!bid || !tid) return

  if (findCatalogEnrollment(uid, bid, tid)) return

  const { isFull } = getCatalogTrainingSeatStats(bid, tid)
  if (isFull) {
    throw new Error('This training program is full. No seats are available.')
  }
}
