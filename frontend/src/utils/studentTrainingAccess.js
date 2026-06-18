import { fetchMyApplications } from '../api/studentPortalApi.js'
import { fetchMyEnrollmentApplications } from '../api/enrollmentApplicationApi.js'
import { studentHasApprovedCourseAccess } from './courseEnrollmentAccess.js'
import { STUDENT_TRAINING_ACCESS_EVENT } from './enrollmentAccessEvents.js'

export { STUDENT_TRAINING_ACCESS_EVENT } from './enrollmentAccessEvents.js'

const ENROLLMENT_FREE_ROUTES = new Set([
  '/student/internships',
  '/student/profile',
  '/student/applications',
  '/student/enrollment',
])

/** True when the student has at least one accepted (active) training application. */
export function studentHasActiveTrainingEnrollment(applications) {
  if (!Array.isArray(applications)) return false
  return applications.some((a) => {
    const s = (a.status ?? '').toLowerCase()
    return s.includes('accept') && !s.includes('reject')
  })
}

/** Routes a student may open before they are accepted into a program. */
export function studentRouteRequiresActiveTraining(pathname) {
  if (!pathname || !pathname.startsWith('/student')) return false
  if (pathname.startsWith('/student/enrollment')) return false
  return !ENROLLMENT_FREE_ROUTES.has(pathname)
}

const inflight = new Map()

export async function fetchStudentJoinedTraining(token, userId) {
  const key = `${userId}|${String(token ?? '').slice(0, 32)}`
  if (inflight.has(key)) return inflight.get(key)
  const p = fetchMyEnrollmentApplications(token, userId)
    .then((r) => studentHasApprovedCourseAccess(userId, r.items ?? []))
    .catch(() => studentHasApprovedCourseAccess(userId))
    .finally(() => {
      inflight.delete(key)
    })
  inflight.set(key, p)
  return p
}

export function invalidateStudentTrainingAccess() {
  window.dispatchEvent(new CustomEvent(STUDENT_TRAINING_ACCESS_EVENT))
}
