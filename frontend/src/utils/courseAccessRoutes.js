import { readActiveCourseSelection } from '../hooks/useStudentApprovedCourses.js'
import {
  getCourseAccessState,
  hasStudentCourseRecord,
  listApprovedCatalogEnrollments,
  listEnrolledCatalogCourses,
} from './courseEnrollmentAccess.js'
import { studentRouteRequiresActiveTraining } from './studentTrainingAccess.js'

export function parseCourseFromSearch(searchParams) {
  const branchId = String(searchParams?.get('branchId') ?? '').trim()
  const courseId = String(searchParams?.get('courseId') ?? '').trim()
  if (branchId && courseId) {
    return { branchId, courseId, title: String(searchParams?.get('title') ?? '').trim() }
  }
  const active = readActiveCourseSelection()
  if (active?.branchId && active?.trainingId) {
    return {
      branchId: active.branchId,
      courseId: active.trainingId,
      title: active.trainingTitle ?? '',
    }
  }
  return null
}

export function buildEnrollmentStatusPath(branchId, courseId, title = '') {
  const params = new URLSearchParams({ branchId, courseId })
  if (title) params.set('title', title)
  return `/student/enrollment/status?${params.toString()}`
}

export function buildEnrollmentApplicationPath(branchId, courseId, title = '') {
  const params = new URLSearchParams({ branchId, courseId })
  if (title) params.set('title', title)
  return `/student/enrollment/application?${params.toString()}`
}

/**
 * Where to send a student trying to open protected course content.
 * Returns null when access is approved and content may render.
 */
export function resolveCourseContentRedirect(userId, pathname, searchParams) {
  if (!studentRouteRequiresActiveTraining(pathname)) {
    return null
  }

  const course = parseCourseFromSearch(searchParams)
  const approved = listApprovedCatalogEnrollments(userId)

  if (!course) {
    if (approved.length > 0) {
      const first = approved[0]
      const params = new URLSearchParams({
        branchId: first.branchId,
        courseId: first.trainingId,
      })
      if (first.trainingTitle) params.set('title', first.trainingTitle)
      return { redirect: `${pathname}?${params.toString()}`, reason: 'select-course' }
    }

    const enrollments = userId ? listEnrolledCatalogCourses(userId) : []

    const pendingRow = Array.isArray(enrollments)
      ? enrollments.find((row) => {
          const state = getCourseAccessState(userId, row.branchId, row.trainingId)
          return state.onboarding === 'pending' || state.onboarding === 'none'
        })
      : null

    if (pendingRow) {
      const { onboarding, application } = getCourseAccessState(userId, pendingRow.branchId, pendingRow.trainingId)
      if (onboarding === 'pending') {
        return {
          redirect: buildEnrollmentStatusPath(pendingRow.branchId, pendingRow.trainingId, pendingRow.trainingTitle),
          reason: 'pending',
        }
      }
      if (onboarding === 'none' || onboarding === 'rejected') {
        return {
          redirect: buildEnrollmentApplicationPath(pendingRow.branchId, pendingRow.trainingId, pendingRow.trainingTitle),
          reason: 'application',
        }
      }
    }

    return { redirect: '/student/internships', reason: 'no-enrollment' }
  }

  const { onboarding, application } = getCourseAccessState(userId, course.branchId, course.courseId)

  if (onboarding === 'none' && !application && !hasStudentCourseRecord(userId, course.branchId, course.courseId)) {
    return { redirect: '/student/internships', reason: 'not-enrolled' }
  }

  if (onboarding === 'approved') {
    return null
  }

  if (onboarding === 'pending') {
    return {
      redirect: buildEnrollmentStatusPath(course.branchId, course.courseId, course.title),
      reason: 'pending',
    }
  }

  if (onboarding === 'rejected') {
    return {
      redirect: buildEnrollmentStatusPath(course.branchId, course.courseId, course.title),
      reason: 'rejected',
      rejectionReason: application?.rejectionReason,
    }
  }

  return {
    redirect: buildEnrollmentApplicationPath(course.branchId, course.courseId, course.title),
    reason: 'application-required',
  }
}
