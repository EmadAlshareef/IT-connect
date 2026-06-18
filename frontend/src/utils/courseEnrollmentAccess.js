import { ENROLLMENT_APPLICATIONS_CHANGED_EVENT, findLocalApplication, listLocalApplicationsForStudent } from '../api/enrollmentApplicationApi.js'

import {

  isApplicationApproved,

  isApplicationAwaitingTrainerReview,

  isApplicationRejected,

  isSubmittedEnrollmentApplication,

} from './enrollmentApplicationStatus.js'

import {

  CATALOG_ENROLLMENT_CHANGED_EVENT,

  findCatalogEnrollment,

  hasCatalogEnrollmentRecord,

  readCatalogEnrollments,

} from './trainingCatalogEnrollment.js'

import { COURSE_ACCESS_CHANGED_EVENT, STUDENT_TRAINING_ACCESS_EVENT } from './enrollmentAccessEvents.js'
import { normalizePortalEmail } from './portalUserDirectory.js'



export { COURSE_ACCESS_CHANGED_EVENT } from './enrollmentAccessEvents.js'

export {

  applyEnrollmentAccessFromApplications,

  syncEnrollmentOnboardingFromApplication,

} from './enrollmentAccessSync.js'



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



function applicationToCourseRow(application) {

  return {

    branchId: String(application.branchId ?? ''),

    trainingId: String(application.courseId ?? ''),

    trainingTitle: String(application.courseTitle ?? '').trim() || 'Training program',

    status: 'Enrolled',

    onboardingStatus: String(application.status ?? '').toLowerCase(),

    applicationId: application.id,

    userEmail: application.userEmail,

    userName: application.userName,

    enrolledAtUtc: application.createdAtUtc,

  }

}



function mergeCourseRows(primaryRows, extraRows) {

  const map = new Map()

  for (const row of [...primaryRows, ...extraRows]) {

    const key = `${row.branchId}::${row.trainingId}`

    if (!key || key === '::') continue

    map.set(key, row)

  }

  return [...map.values()]

}



/** Catalog courses the student may access — SQL/API applications are the source of truth. */

export function listApprovedCatalogEnrollments(userId, applicationList = null) {

  if (!userId) return []

  const apps = applicationList ?? listLocalApplicationsForStudent(userId)

  const fromApi = apps.filter(isApplicationApproved).map(applicationToCourseRow)

  const fromLocal = readCatalogEnrollments(userId).filter((row) =>

    isEnrollmentApprovedForAccess(row, apps, userId),

  )

  return mergeCourseRows(fromApi, fromLocal)

}



export function studentHasApprovedCourseAccess(userId, applicationList = null) {

  return listApprovedCatalogEnrollments(userId, applicationList).length > 0

}



function onboardingFromApplication(application) {

  if (!application) return 'none'

  if (isApplicationApproved(application)) return 'approved'

  if (isApplicationRejected(application)) return 'rejected'

  if (isApplicationAwaitingTrainerReview(application)) return 'pending'

  if (isSubmittedEnrollmentApplication(application)) return 'pending'

  return 'none'

}



export function getCourseAccessState(userId, branchId, courseId) {

  const application = findLocalApplication(userId, branchId, courseId)

  const enrollment = findCatalogEnrollment(userId, branchId, courseId)



  if (application) {

    const onboarding = onboardingFromApplication(application)

    return {

      enrolled: true,

      onboarding,

      application,

      enrollment: enrollment ?? applicationToCourseRow(application),

    }

  }



  if (!enrollment) {

    return { enrolled: false, onboarding: 'none', application: null, enrollment: null }

  }



  const applications = listLocalApplicationsForStudent(userId)

  if (isEnrollmentApprovedForAccess(enrollment, applications, userId)) {

    return { enrolled: true, onboarding: 'approved', application: null, enrollment }

  }



  let onboarding = getEnrollmentOnboardingStatus(enrollment)

  if (onboarding === 'pending') onboarding = 'none'



  return { enrolled: true, onboarding, application: null, enrollment }

}



export function canAccessStudentWorkspace(userId) {

  return studentHasApprovedCourseAccess(userId)

}



/** Course nav (Home, Tasks, …) only for an enrolled + instructor-approved course. */

export function shouldShowCourseWorkspaceNav(userId, activeCourse) {

  if (!userId || !activeCourse?.branchId || !activeCourse?.trainingId) return false

  const branchId = String(activeCourse.branchId)

  const courseId = String(activeCourse.trainingId)

  const { onboarding } = getCourseAccessState(userId, branchId, courseId)

  return onboarding === 'approved'

}



export function listEnrolledCatalogCourses(userId, sessionEmail = '') {

  if (!userId) return []

  const apps = listLocalApplicationsForStudent(userId, sessionEmail)

  const fromApps = apps.map(applicationToCourseRow)

  const email = normalizePortalEmail(sessionEmail)

  const fromLocal = readCatalogEnrollments(userId).filter((row) => {

    const status = String(row?.status ?? '').toLowerCase()

    if (!status.includes('accept') && !status.includes('enroll')) return false

    const rowEmail = normalizePortalEmail(row?.userEmail)

    if (email && rowEmail && rowEmail !== email) return false

    const ownerId = String(row?.studentId ?? '').trim()

    if (ownerId && ownerId !== String(userId)) return false

    return true

  })

  return mergeCourseRows(fromApps, fromLocal)

}



/** Catalog row and/or SQL application for this course (API sessions). */

export function hasStudentCourseRecord(userId, branchId, courseId, sessionEmail = '') {

  if (findLocalApplication(userId, branchId, courseId, sessionEmail)) return true

  return hasCatalogEnrollmentRecord(userId, branchId, courseId)

}



/** UI label + tone for catalog onboarding state. */

export function getCourseOnboardingBadge(onboarding) {

  switch (String(onboarding ?? '').toLowerCase()) {

    case 'approved':

      return { label: 'Approved', tone: 'approved' }

    case 'rejected':

      return { label: 'Not approved', tone: 'rejected' }

    case 'pending':

      return { label: 'Pending review', tone: 'pending' }

    default:

      return { label: 'Complete application', tone: 'none' }

  }

}



export function badgeToneClasses(tone) {

  switch (tone) {

    case 'approved':

      return 'text-emerald-600 dark:text-emerald-400'

    case 'rejected':

      return 'text-rose-600 dark:text-rose-400'

    case 'pending':

      return 'text-amber-600 dark:text-amber-400'

    default:

      return 'text-slate-500 dark:text-slate-400'

  }

}



export function statusCardTone(onboarding) {

  const o = String(onboarding ?? '').toLowerCase()

  if (o === 'approved') {

    return 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40'

  }

  if (o === 'rejected') {

    return 'border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40'

  }

  if (o === 'pending') {

    return 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40'

  }

  return 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'

}



export function statusPillTone(onboarding) {

  const o = String(onboarding ?? '').toLowerCase()

  if (o === 'approved') {

    return 'border-emerald-200 text-emerald-800 bg-emerald-100 dark:border-emerald-900/50 dark:text-emerald-200 dark:bg-emerald-950/50'

  }

  if (o === 'rejected') {

    return 'border-rose-200 text-rose-800 bg-rose-100 dark:border-rose-900/50 dark:text-rose-200 dark:bg-rose-950/50'

  }

  if (o === 'pending') {

    return 'border-amber-200 text-amber-900 bg-amber-100 dark:border-amber-900/50 dark:text-amber-200 dark:bg-amber-950/50'

  }

  return 'border-slate-200 text-slate-700 bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-800'

}



export function listenCourseAccessChanges(callback) {
  const handler = () => callback()
  window.addEventListener(COURSE_ACCESS_CHANGED_EVENT, handler)
  window.addEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, handler)
  window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, handler)
  window.addEventListener(STUDENT_TRAINING_ACCESS_EVENT, handler)
  return () => {
    window.removeEventListener(COURSE_ACCESS_CHANGED_EVENT, handler)
    window.removeEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, handler)
    window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, handler)
    window.removeEventListener(STUDENT_TRAINING_ACCESS_EVENT, handler)
  }
}

