import { loadTaskApprovalRequests } from './taskApprovalRequests.js'
import { resolveBriefCourseIds } from './taskCourseContext.js'

function normalizeDeadline(deadline) {
  const value = String(deadline ?? '').trim()
  if (!value) return new Date(Date.now() + 7 * 864e5).toISOString()
  if (value.includes('T')) return value
  return `${value}T23:59:59.000Z`
}

export function mapBriefToStudentTask(brief) {
  const { branchId, courseId } = resolveBriefCourseIds(brief)
  return {
    id: brief.id,
    title: brief.title,
    description: brief.description,
    deadlineUtc: normalizeDeadline(brief.deadline),
    submissionStatus: 'Not Submitted',
    lastSubmissionId: null,
    branchId,
    courseId,
    attachmentName: brief.attachmentName || '',
    publishedAtUtc: brief.publishedAt ?? brief.reviewedAt ?? brief.createdAt ?? null,
  }
}

function briefMatchesCourse(brief, branchId, courseId) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!bid || !cid) return false

  const ids = resolveBriefCourseIds(brief)
  const sessionId = String(brief.sessionId ?? '').trim()
  if (ids.branchId === bid && ids.courseId === cid) return true
  if (sessionId === cid) return true
  if (ids.branchId === bid && sessionId === cid) return true
  return false
}

/** Published trainer briefs visible to every enrolled student in a course/session. */
export function listPublishedTasksForCourse(branchId, courseId) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!bid || !cid) return []

  return loadTaskApprovalRequests()
    .filter((row) => String(row.status ?? '').toLowerCase() === 'approved')
    .filter((row) => briefMatchesCourse(row, bid, cid))
    .map(mapBriefToStudentTask)
    .sort(
      (a, b) =>
        new Date(b.publishedAtUtc ?? b.deadlineUtc ?? 0).getTime() -
        new Date(a.publishedAtUtc ?? a.deadlineUtc ?? 0).getTime(),
    )
}

export function mergePublishedTasksWithStudentState(publishedTasks, cachedTasks = []) {
  const cache = Array.isArray(cachedTasks) ? cachedTasks : []
  return publishedTasks.map((task) => {
    const saved = cache.find((row) => row.id === task.id)
    if (!saved) return task
    return {
      ...task,
      submissionStatus: saved.submissionStatus ?? task.submissionStatus,
      lastSubmissionId: saved.lastSubmissionId ?? task.lastSubmissionId,
      grade: saved.grade ?? task.grade ?? null,
      evaluationFeedback: saved.evaluationFeedback ?? task.evaluationFeedback ?? '',
      trainerName: saved.trainerName ?? task.trainerName ?? '',
      reviewedAtUtc: saved.reviewedAtUtc ?? task.reviewedAtUtc ?? null,
    }
  })
}
