/** Catalog enrollment storage key — kept here to avoid circular imports with enrollment API. */
export const CATALOG_ENROLLMENT_CHANGED_EVENT = 'ts-catalog-enrollment-changed'
export const COURSE_ACCESS_CHANGED_EVENT = 'ts-course-access-changed'

const storageKey = (userId) => `ts-catalog-training-enrollments-${userId}`

function readCatalogRows(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Align student catalog enrollment with an application record (no API imports).
 * Only writes and dispatches events when data actually changes.
 */
export function syncCatalogEnrollmentFromApplication(userId, branchId, courseId, application) {
  if (!userId || !branchId || !courseId || !application) return false

  const rows = readCatalogRows(userId)
  if (!rows.length) return false

  let onboarding = 'none'
  if (application.applicationComplete !== false && String(application.motivationReason ?? '').trim()) {
    onboarding = String(application.status ?? 'pending').toLowerCase()
  }

  const nextApplicationId = application.id ?? null
  const nextRejection = application.rejectionReason ?? null
  let changed = false

  const next = rows.map((row) => {
    if (String(row.branchId) !== String(branchId) || String(row.trainingId) !== String(courseId)) {
      return row
    }
    if (
      String(row.onboardingStatus ?? '') === onboarding &&
      String(row.applicationId ?? '') === String(nextApplicationId ?? '') &&
      String(row.rejectionReason ?? '') === String(nextRejection ?? '')
    ) {
      return row
    }
    changed = true
    return {
      ...row,
      onboardingStatus: onboarding,
      applicationId: nextApplicationId,
      rejectionReason: nextRejection,
    }
  })

  if (!changed) return false

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(CATALOG_ENROLLMENT_CHANGED_EVENT))
    window.dispatchEvent(new CustomEvent(COURSE_ACCESS_CHANGED_EVENT))
  } catch {
    return false
  }
  return true
}
