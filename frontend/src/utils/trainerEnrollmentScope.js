import { isApplicationAwaitingTrainerReview } from './enrollmentApplicationStatus.js'
import { resolveCatalogCourseForTrainingId } from './catalogCourseContext.js'

/** True when an enrollment application belongs to the trainer dashboard training id. */
export function applicationMatchesTrainingId(application, trainingId) {
  const tid = String(trainingId ?? '').trim()
  if (!tid || !application) return false

  const branchId = String(application.branchId ?? '').trim()
  const courseId = String(application.courseId ?? '').trim()
  if (!courseId) return false

  if (courseId === tid) return true

  const resolved = resolveCatalogCourseForTrainingId(tid)
  if (resolved) {
    const resolvedBranch = String(resolved.branchId ?? '').trim()
    const resolvedCourse = String(resolved.courseId ?? '').trim()
    if (resolvedCourse === courseId) {
      return !resolvedBranch || !branchId || resolvedBranch === branchId
    }
  }

  return false
}

export function filterApplicationsForTrainingId(applications, trainingId) {
  const tid = String(trainingId ?? '').trim()
  if (!tid) return applications ?? []
  return (applications ?? []).filter((row) => applicationMatchesTrainingId(row, tid))
}

export function countPendingApplicationsForTraining(applications, trainingId) {
  return filterApplicationsForTrainingId(applications, trainingId).filter(isApplicationAwaitingTrainerReview)
    .length
}

/** Pending review counts keyed by trainer session / training id. */
export function buildPendingCountByTrainingId(applications, sessions) {
  const map = {}
  for (const session of sessions ?? []) {
    const id = String(session?.id ?? '').trim()
    if (!id) continue
    map[id] = countPendingApplicationsForTraining(applications, id)
  }
  return map
}

/** Map catalog branch/course to a trainer sidebar session id when possible. */
export function resolveTrainingIdForCatalogCourse(branchId, courseId, sessions = []) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!cid) return ''

  const direct = (sessions ?? []).find((session) => String(session.id) === cid)
  if (direct) return direct.id

  for (const session of sessions ?? []) {
    const resolved = resolveCatalogCourseForTrainingId(session.id)
    if (!resolved) continue
    if (String(resolved.courseId) === cid) {
      if (!bid || String(resolved.branchId) === bid) return session.id
    }
  }

  return cid
}
