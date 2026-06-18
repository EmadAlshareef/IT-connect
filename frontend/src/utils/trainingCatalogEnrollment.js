import { isLocalOnlySession, readStoredAuthToken } from '../api/authApi.js'
import { assertCatalogSeatAvailable } from './catalogTrainingSeats.js'

export const CATALOG_ENROLLMENT_CHANGED_EVENT = 'ts-catalog-enrollment-changed'

const storageKey = (userId) => `ts-catalog-training-enrollments-${userId}`

/** In-memory enrollments for API sessions (localStorage is offline-only). */
const catalogEnrollmentsMemory = new Map()

export function clearCatalogEnrollmentMemory() {
  catalogEnrollmentsMemory.clear()
}

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

function persistCatalogEnrollmentLocally() {
  return isLocalOnlySession(readStoredAuthToken())
}

function dispatchCatalogEnrollmentChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CATALOG_ENROLLMENT_CHANGED_EVENT))
  window.dispatchEvent(new CustomEvent('ts-student-training-access-changed'))
}

function saveCatalogEnrollments(userId, rows) {
  const uid = String(userId ?? '').trim()
  if (!uid) return
  catalogEnrollmentsMemory.set(uid, rows)
  if (persistCatalogEnrollmentLocally()) {
    writeJson(storageKey(uid), rows)
  }
  dispatchCatalogEnrollmentChanged()
}

export function readCatalogEnrollments(userId) {
  const uid = String(userId ?? '').trim()
  if (!uid) return []
  const memory = catalogEnrollmentsMemory.get(uid)
  if (Array.isArray(memory) && memory.length > 0) return memory
  if (persistCatalogEnrollmentLocally()) return readJson(storageKey(uid), [])
  return memory ?? []
}

/** All students with catalog enrollments (localStorage + in-memory for API sessions). */
export function listAllCatalogEnrollmentOwners() {
  const owners = new Map()

  if (typeof window !== 'undefined' && persistCatalogEnrollmentLocally()) {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key?.startsWith('ts-catalog-training-enrollments-')) continue
      const userId = key.slice('ts-catalog-training-enrollments-'.length)
      owners.set(userId, readCatalogEnrollments(userId))
    }
  }

  for (const [userId, enrollments] of catalogEnrollmentsMemory) {
    if (Array.isArray(enrollments) && enrollments.length > 0) {
      owners.set(userId, enrollments)
    }
  }

  return [...owners.entries()].map(([userId, enrollments]) => ({
    userId,
    enrollments: Array.isArray(enrollments) ? enrollments : [],
  }))
}

function isEnrolledCatalogStatus(record) {
  const status = String(record?.status ?? '').toLowerCase()
  return status.includes('accept') || status.includes('enroll')
}

function pickLatestEnrollmentMatch(enrollments, predicate) {
  let best = null
  for (const row of enrollments) {
    if (!predicate(row) || !isEnrolledCatalogStatus(row)) continue
    if (!best || new Date(row.enrolledAtUtc ?? 0) > new Date(best.enrolledAtUtc ?? 0)) {
      best = row
    }
  }
  return best
}

function dedupeEnrollmentRowsByUser(rows) {
  const byUser = new Map()
  for (const row of rows) {
    const key = String(row.userId)
    const existing = byUser.get(key)
    if (!existing) {
      byUser.set(key, row)
      continue
    }
    const nextAt = new Date(row.enrollment.enrolledAtUtc ?? 0).getTime()
    const prevAt = new Date(existing.enrollment.enrolledAtUtc ?? 0).getTime()
    if (nextAt >= prevAt) byUser.set(key, row)
  }
  return [...byUser.values()].sort(
    (a, b) =>
      new Date(b.enrollment.enrolledAtUtc ?? 0).getTime() -
      new Date(a.enrollment.enrolledAtUtc ?? 0).getTime(),
  )
}

export function isActiveCatalogEnrollment(record) {
  const status = String(record?.status ?? '').toLowerCase()
  const enrolled = status.includes('accept') || status.includes('enroll')
  if (!enrolled) return false
  const onboarding = String(record?.onboardingStatus ?? 'approved').toLowerCase()
  return onboarding === 'approved'
}

/** User completed enroll click (local catalog row). */
export function hasCatalogEnrollmentRecord(userId, branchId, trainingId) {
  const row = findCatalogEnrollment(userId, branchId, trainingId)
  if (!row) return false
  const status = String(row?.status ?? '').toLowerCase()
  return status.includes('accept') || status.includes('enroll')
}

export function studentHasCatalogEnrollment(userId) {
  return readCatalogEnrollments(userId).some(isActiveCatalogEnrollment)
}

export function findCatalogEnrollment(userId, branchId, trainingId) {
  const bid = String(branchId ?? '').trim()
  const tid = String(trainingId ?? '').trim()
  return pickLatestEnrollmentMatch(readCatalogEnrollments(userId), (row) => {
    return String(row.branchId ?? '') === bid && String(row.trainingId ?? '') === tid
  })
}

/** All students who registered in a catalog course (any onboarding stage). */
export function listCatalogEnrollmentsForCourse(branchId, courseId) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!bid || !cid || typeof window === 'undefined') return []

  const rows = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('ts-catalog-training-enrollments-')) continue
    const userId = key.slice('ts-catalog-training-enrollments-'.length)
    const enrollment = findCatalogEnrollment(userId, bid, cid)
    if (!enrollment) continue
    const status = String(enrollment?.status ?? '').toLowerCase()
    if (!status.includes('accept') && !status.includes('enroll')) continue
    rows.push({ userId, enrollment })
  }

  return dedupeEnrollmentRowsByUser(rows)
}

/** Count enrolled students for one course in a branch. */
export function countCatalogStudentsForCourse(branchId, courseId) {
  return listCatalogEnrollmentsForCourse(branchId, courseId).length
}

/** Count unique students with at least one enrollment in a branch. */
export function countUniqueCatalogStudentsForBranch(branchId) {
  const bid = String(branchId ?? '').trim()
  if (!bid || typeof window === 'undefined') return 0

  const userIds = new Set()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('ts-catalog-training-enrollments-')) continue
    const userId = key.slice('ts-catalog-training-enrollments-'.length)
    const hasBranchEnrollment = readCatalogEnrollments(userId).some(
      (row) => String(row.branchId ?? '') === bid && isEnrolledCatalogStatus(row),
    )
    if (hasBranchEnrollment) userIds.add(userId)
  }
  return userIds.size
}

/** All students subscribed to a training id (fallback when branch mapping is unavailable). */
export function listCatalogEnrollmentsForTrainingId(trainingId) {
  const tid = String(trainingId ?? '').trim()
  if (!tid || typeof window === 'undefined') return []

  const rows = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('ts-catalog-training-enrollments-')) continue
    const userId = key.slice('ts-catalog-training-enrollments-'.length)
    const enrollment = pickLatestEnrollmentMatch(
      readCatalogEnrollments(userId),
      (row) => String(row.trainingId ?? '') === tid,
    )
    if (!enrollment) continue
    rows.push({ userId, enrollment })
  }

  return dedupeEnrollmentRowsByUser(rows)
}

export function enrollInCatalogTraining(userId, payload) {
  const branchId = String(payload.branchId ?? '').trim()
  const trainingId = String(payload.trainingId ?? '').trim()
  if (!userId || !branchId || !trainingId) {
    throw new Error('Missing enrollment details.')
  }

  const existing = findCatalogEnrollment(userId, branchId, trainingId)
  if (existing) {
    const status = String(existing?.status ?? '').toLowerCase()
    if (status.includes('accept') || status.includes('enroll')) {
      const merged = {
        ...existing,
        userEmail: String(payload.userEmail ?? '').trim() || existing.userEmail || '',
        userName: String(payload.userName ?? '').trim() || existing.userName || '',
        trainingTitle: String(payload.trainingTitle ?? '').trim() || existing.trainingTitle || 'Training program',
      }
      const prev = readCatalogEnrollments(userId).filter(
        (row) => !(String(row.branchId) === branchId && String(row.trainingId) === trainingId),
      )
      saveCatalogEnrollments(userId, [merged, ...prev])
      return { record: merged, created: false }
    }
  }

  assertCatalogSeatAvailable(branchId, trainingId, userId)

  const now = new Date().toISOString()
  const record = {
    id: `catalog-enroll-${branchId}-${trainingId}-${Date.now()}`,
    studentId: userId,
    branchId,
    trainingId,
    trainingTitle: String(payload.trainingTitle ?? '').trim() || 'Training program',
    branchName: String(payload.branchName ?? '').trim(),
    userEmail: String(payload.userEmail ?? '').trim(),
    userName: String(payload.userName ?? '').trim(),
    status: 'Enrolled',
    onboardingStatus: 'none',
    enrolledAtUtc: now,
    timeline: [
      { label: 'Enrolled in program', state: 'Complete', atUtc: now },
      { label: 'Onboarding application', state: 'Upcoming', atUtc: now },
    ],
  }

  const prev = readCatalogEnrollments(userId).filter(
    (row) => !(String(row.branchId) === branchId && String(row.trainingId) === trainingId),
  )
  saveCatalogEnrollments(userId, [record, ...prev])
  return { record, created: true }
}

/** Remove a student from a catalog course (instructor action). */
export function removeStudentFromCatalogCourse(userId, branchId, courseId, options = {}) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!userId || !bid || !cid) return false

  const existing = findCatalogEnrollment(userId, bid, cid)
  if (!existing) return false

  const now = new Date().toISOString()
  const reason = String(options.reason ?? 'Removed from course by instructor.').trim()
  const removed = {
    ...existing,
    status: 'Removed',
    onboardingStatus: 'rejected',
    rejectionReason: reason,
    removedAtUtc: now,
    removedBy: options.removedBy ?? 'trainer',
  }

  const prev = readCatalogEnrollments(userId).filter(
    (row) => !(String(row.branchId) === bid && String(row.trainingId) === cid),
  )
  writeJson(storageKey(userId), [removed, ...prev])

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CATALOG_ENROLLMENT_CHANGED_EVENT))
    window.dispatchEvent(new CustomEvent('ts-student-training-access-changed'))
    window.dispatchEvent(new CustomEvent('ts-course-access-changed'))
  }

  return true
}
