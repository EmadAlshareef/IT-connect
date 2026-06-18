import { ensureEnrollmentRequestForCatalogEnroll } from '../api/enrollmentApplicationApi.js'
import {
  CATALOG_ENROLLMENT_CHANGED_EVENT,
  syncCatalogEnrollmentFromApplication,
} from './enrollmentCatalogSync.js'

export { CATALOG_ENROLLMENT_CHANGED_EVENT, syncCatalogEnrollmentFromApplication }

const storageKey = (userId) => `ts-catalog-training-enrollments-${userId}`

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

export function readCatalogEnrollments(userId) {
  if (!userId) return []
  return readJson(storageKey(userId), [])
}

export function isActiveCatalogEnrollment(record) {
  const status = String(record?.status ?? '').toLowerCase()
  const enrolled = status.includes('accept') || status.includes('enroll')
  if (!enrolled) return false
  const onboarding = String(record?.onboardingStatus ?? 'approved').toLowerCase()
  return onboarding === 'approved'
}

/** User completed enroll click but may still need onboarding approval. */
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
  return (
    readCatalogEnrollments(userId).find(
      (row) => String(row.branchId ?? '') === bid && String(row.trainingId ?? '') === tid,
    ) ?? null
  )
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
      return { record: existing, created: false }
    }
  }

  const now = new Date().toISOString()
  const record = {
    id: `catalog-enroll-${branchId}-${trainingId}-${Date.now()}`,
    studentId: userId,
    branchId,
    trainingId,
    trainingTitle: String(payload.trainingTitle ?? '').trim() || 'Training program',
    branchName: String(payload.branchName ?? '').trim(),
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
  writeJson(storageKey(userId), [record, ...prev])

  ensureEnrollmentRequestForCatalogEnroll(userId, payload.userEmail, payload.userName, {
    branchId,
    courseId: trainingId,
    courseTitle: record.trainingTitle,
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CATALOG_ENROLLMENT_CHANGED_EVENT))
    window.dispatchEvent(new CustomEvent('ts-student-training-access-changed'))
  }

  return { record, created: true }
}
