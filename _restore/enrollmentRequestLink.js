import {
  findLocalApplication,
  isApplicationFormComplete,
  isApplicationPending,
  listLocalApplicationsForTrainer,
} from '../api/enrollmentApplicationApi.js'
import { getCourseAccessState, listEnrolledCatalogCourses } from './courseEnrollmentAccess.js'
import { findCatalogEnrollment } from './trainingCatalogEnrollment.js'

/** Student sidebar "Pending review" — form submitted, waiting on trainer. */
export function isStudentPendingReview(userId, branchId, courseId) {
  if (!userId) return false
  const { onboarding } = getCourseAccessState(userId, branchId, courseId)
  return onboarding === 'pending'
}

/** Trainer inbox row that matches a student's "Pending review" course. */
export function isTrainerPendingReviewRequest(application) {
  if (!application) return false
  return String(application.status ?? '').toLowerCase() === 'pending' && isApplicationFormComplete(application)
}

export function listStudentPendingReviewCourses(userId) {
  if (!userId) return []
  return listEnrolledCatalogCourses(userId).filter((row) =>
    isStudentPendingReview(userId, row.branchId, row.trainingId),
  )
}

export function listTrainerPendingReviewRequests(trainerEmail, trainerId = '') {
  return listLocalApplicationsForTrainer(trainerEmail, 'pending', trainerId).filter(isTrainerPendingReviewRequest)
}

export function countTrainerPendingReviewRequests(trainerEmail, trainerId = '') {
  return listTrainerPendingReviewRequests(trainerEmail, trainerId).length
}

/** Resolve the shared application for a student course enrollment. */
export function findLinkedEnrollmentApplication(userId, branchId, courseId) {
  const enrollment = findCatalogEnrollment(userId, branchId, courseId)
  if (enrollment?.applicationId) {
    const fromId = findLocalApplication(userId, branchId, courseId)
    if (fromId?.id === enrollment.applicationId) return fromId
  }
  return findLocalApplication(userId, branchId, courseId)
}

/** True when student course row and trainer application refer to the same enrollment. */
export function enrollmentMatchesApplication(enrollmentRow, application) {
  if (!enrollmentRow || !application) return false
  return (
    String(enrollmentRow.branchId) === String(application.branchId) &&
    String(enrollmentRow.trainingId) === String(application.courseId) &&
    String(enrollmentRow.userId ?? application.userId) === String(application.userId)
  )
}

export function applicationMatchesPendingReview(userId, application) {
  if (!application || !userId) return false
  return isStudentPendingReview(userId, application.branchId, application.courseId)
}

/** After trainer action, verify student would see updated onboarding. */
export function resolveStudentOnboardingFromApplication(application) {
  if (!application) return 'none'
  if (!isApplicationFormComplete(application)) return 'none'
  const status = String(application.status ?? '').toLowerCase()
  if (status === 'approved') return 'approved'
  if (status === 'rejected') return 'rejected'
  if (status === 'pending') return 'pending'
  return 'none'
}

export function isApplicationAwaitingStudentForm(application) {
  return Boolean(application && String(application.status ?? '').toLowerCase() === 'pending' && !isApplicationFormComplete(application))
}

export function isApplicationPendingForTrainer(application) {
  if (!application) return false
  const status = String(application.status ?? '').toLowerCase()
  return status === 'pending'
}
