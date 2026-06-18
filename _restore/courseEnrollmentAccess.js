import {
  ENROLLMENT_APPLICATIONS_CHANGED_EVENT,
  findLocalApplication,
  isApplicationApproved,
  isApplicationFormComplete,
  isApplicationPending,
  isApplicationRejected,
  listLocalApplicationsForStudent,
} from '../api/enrollmentApplicationApi.js'
import {
  CATALOG_ENROLLMENT_CHANGED_EVENT,
  findCatalogEnrollment,
  hasCatalogEnrollmentRecord,
  readCatalogEnrollments,
  syncCatalogEnrollmentFromApplication,
} from './trainingCatalogEnrollment.js'

export const COURSE_ACCESS_CHANGED_EVENT = 'ts-course-access-changed'

/**
 * Onboarding gate for catalog enrollments.
 * Legacy rows (status Accepted, no onboardingStatus) stay approved for migration.
 */
export function getEnrollmentOnboardingStatus(enrollment) {
  if (!enrollment) return 'none'
  if (enrollment.onboardingStatus) return String(enrollment.onboardingStatus).toLowerCase()
  const status = String(enrollment.status ?? '').toLowerCase()
  if (status.includes('accept')) return 'approved'
  if (status.includes('enroll')) return 'none'
  return 'none'
}

export function isEnrollmentApprovedForAccess(enrollment, applicationList, userId) {
  if (!enrollment) return false
  const onboarding = getEnrollmentOnboardingStatus(enrollment)
  if (onboarding === 'approved') return true
  const app =
    applicationList?.find(
      (a) =>
        String(a.branchId) === String(enrollment.branchId) &&
        String(a.courseId) === String(enrollment.trainingId),
    ) ?? findLocalApplication(userId, enrollment.branchId, enrollment.trainingId)
  return Boolean(app && isApplicationApproved(app))
}

/** Catalog courses the student may access (trainer approved onboarding). */
export function listApprovedCatalogEnrollments(userId, applicationList = null) {
  if (!userId) return []
  const apps = applicationList ?? listLocalApplicationsForStudent(userId)
  return readCatalogEnrollments(userId).filter((row) => isEnrollmentApprovedForAccess(row, apps, userId))
}

export function syncEnrollmentOnboardingFromApplication(userId, branchId, courseId, application) {
  syncCatalogEnrollmentFromApplication(userId, branchId, courseId, application)
}

export function studentHasApprovedCourseAccess(userId, applicationList = null) {
  return listApprovedCatalogEnrollments(userId, applicationList).length > 0
}

export function getCourseAccessState(userId, branchId, courseId) {
  const enrollment = findCatalogEnrollment(userId, branchId, courseId)
  if (!enrollment) {
    return { enrolled: false, onboarding: 'none', application: null }
  }

  const application = findLocalApplication(userId, branchId, courseId)
  let onboarding = 'none'

  if (application) {
    if (!isApplicationFormComplete(application)) {
      onboarding = 'none'
    } else if (isApplicationApproved(application)) {
      onboarding = 'approved'
    } else if (isApplicationPending(application)) {
      onboarding = 'pending'
    } else if (isApplicationRejected(application)) {
      onboarding = 'rejected'
    }
  } else {
    onboarding = getEnrollmentOnboardingStatus(enrollment)
    if (onboarding === 'pending') onboarding = 'none'
  }

  return { enrolled: true, onboarding, application, enrollment }
}

export function canAccessStudentWorkspace(userId) {
  return studentHasApprovedCourseAccess(userId)
}

/** Course nav (Home, Tasks, …) only for an enrolled + instructor-approved course. */
export function shouldShowCourseWorkspaceNav(userId, activeCourse) {
  if (!userId || !activeCourse?.branchId || !activeCourse?.trainingId) return false
  const branchId = String(activeCourse.branchId)
  const courseId = String(activeCourse.trainingId)
  if (!hasCatalogEnrollmentRecord(userId, branchId, courseId)) return false
  const { onboarding } = getCourseAccessState(userId, branchId, courseId)
  return onboarding === 'approved'
}

export function listEnrolledCatalogCourses(userId) {
  if (!userId) return []
  return readCatalogEnrollments(userId).filter((row) => {
    const status = String(row?.status ?? '').toLowerCase()
    return status.includes('accept') || status.includes('enroll')
  })
}

export function listenCourseAccessChanges(callback) {
  const handler = () => callback()
  window.addEventListener(COURSE_ACCESS_CHANGED_EVENT, handler)
  window.addEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, handler)
  window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, handler)
  return () => {
    window.removeEventListener(COURSE_ACCESS_CHANGED_EVENT, handler)
    window.removeEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, handler)
    window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, handler)
  }
}
