import { isLocalOnlySession, readStoredAuthToken } from '../api/authApi.js'
import { CATALOG_ENROLLMENT_CHANGED_EVENT } from './trainingCatalogEnrollment.js'
import { isSubmittedEnrollmentApplication } from './enrollmentApplicationStatus.js'
import { dispatchEnrollmentAccessChanged } from './enrollmentAccessEvents.js'

/** Mirror onboarding into catalog localStorage only for offline/demo sessions. */
export function syncEnrollmentOnboardingFromApplication(userId, branchId, courseId, application) {
  if (!userId || !application) return
  if (!isLocalOnlySession(readStoredAuthToken())) return

  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!bid || !cid) return

  const key = `ts-catalog-training-enrollments-${userId}`
  try {
    const raw = localStorage.getItem(key)
    const rows = raw ? JSON.parse(raw) : []
    if (!Array.isArray(rows)) return

    const onboardingStatus = (() => {
      const status = String(application.status ?? '').toLowerCase()
      if (status === 'approved') return 'approved'
      if (status === 'rejected') return 'rejected'
      if (isSubmittedEnrollmentApplication(application)) return 'pending'
      return 'none'
    })()

    const matchIndex = rows.findIndex(
      (row) => String(row.branchId) === bid && String(row.trainingId) === cid,
    )

    let next
    if (matchIndex < 0) {
      const now = new Date().toISOString()
      next = [
        {
          id: `catalog-enroll-${bid}-${cid}-${Date.now()}`,
          studentId: userId,
          branchId: bid,
          trainingId: cid,
          trainingTitle: String(application.courseTitle ?? '').trim() || 'Training program',
          userEmail: String(application.userEmail ?? '').trim(),
          userName: String(application.userName ?? '').trim(),
          status: 'Enrolled',
          onboardingStatus,
          applicationId: application.id,
          rejectionReason: application.rejectionReason ?? null,
          enrolledAtUtc: application.createdAtUtc ?? now,
        },
        ...rows,
      ]
    } else {
      next = rows.map((row, index) => {
        if (index !== matchIndex) return row
        return {
          ...row,
          onboardingStatus,
          applicationId: application.id,
          rejectionReason: application.rejectionReason ?? null,
          trainingTitle: row.trainingTitle || String(application.courseTitle ?? '').trim() || 'Training program',
        }
      })
    }

    localStorage.setItem(key, JSON.stringify(next))
    dispatchEnrollmentAccessChanged(CATALOG_ENROLLMENT_CHANGED_EVENT)
  } catch {
    /* ignore */
  }
}

/** @deprecated No-op — callers update React state directly; avoids reload event loops. */
export function applyEnrollmentAccessFromApplications() {}
