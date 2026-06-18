import { fetchTrainerSubmissions, reviewSubmissionApi } from '../api/submissionApi.js'
import { listApprovedApplicationsForCourse } from './enrollmentApplicationsStore.js'
import { resolveCatalogCourseForTrainingId } from './catalogCourseContext.js'
import { STUDENT_FEEDBACK_CHANGED_EVENT } from './studentTaskFeedback.js'

export const TRAINER_SUBMISSIONS_CHANGED_EVENT = 'ts-trainer-submissions-changed'
export { ENROLLMENT_APPLICATIONS_CHANGED_EVENT as TRAINER_SUBMISSIONS_ROSTER_CHANGED_EVENT } from '../api/enrollmentApplicationApi.js'

let snapshot = []
let bootstrapPromise = null

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRAINER_SUBMISSIONS_CHANGED_EVENT))
    window.dispatchEvent(new CustomEvent(STUDENT_FEEDBACK_CHANGED_EVENT))
  }
}

export function setTrainerSubmissionsSnapshot(rows) {
  snapshot = Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []
  notifyChanged()
}

/** Load trainer submission inbox from SQL. */
export async function bootstrapTrainerSubmissions({ branchId = '', courseId = '' } = {}) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  const key = `${bid}::${cid}`
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = (async () => {
    try {
      const params = {}
      if (bid) params.branchId = bid
      if (cid) params.courseId = cid
      const rows = await fetchTrainerSubmissions(params)
      setTrainerSubmissionsSnapshot(rows)
      return rows
    } catch {
      return snapshot
    } finally {
      bootstrapPromise = null
    }
  })()

  void key
  return bootstrapPromise
}

/** Instructors and admins may review submissions. */
export function canReviewTaskSubmissions(role) {
  const r = String(role ?? '').toLowerCase()
  return r === 'trainer' || r === 'admin'
}

export async function saveTrainerSubmissionReview({
  submissionId,
  traineeId,
  taskTitle,
  taskId,
  grade,
  feedback,
  portalUserId,
  trainerName = '',
}) {
  const sid = String(submissionId ?? '').trim()
  if (!sid) {
    return { ok: false, message: 'Submission id is required to save a review.' }
  }

  try {
    await reviewSubmissionApi(sid, {
      grade,
      feedback,
      trainerName,
      portalUserId,
    })
    await bootstrapTrainerSubmissions()
    notifyChanged()
    return { ok: true, message: `Review saved for ${traineeId ? 'student' : 'submission'}.` }
  } catch (err) {
    return {
      ok: false,
      message: err?.response?.data?.message || err?.message || 'Could not save review.',
    }
  }
}

/**
 * Task submissions for approved trainees in the active course (SQL-backed).
 */
export function listTrainerTaskSubmissions(options = {}) {
  const { trainingId = '' } = options
  const course = resolveCatalogCourseForTrainingId(trainingId)

  let rows = [...snapshot]
  if (course?.branchId && course?.courseId) {
    rows = rows.filter(
      (row) =>
        (!row.branchId && !row.courseId) ||
        (String(row.branchId) === String(course.branchId) &&
          String(row.courseId) === String(course.courseId)),
    )

    const approved = listApprovedApplicationsForCourse(course.branchId, course.courseId)
    const approvedIds = new Set(approved.map((app) => String(app.userId)))
    if (approvedIds.size > 0) {
      rows = rows.filter((row) => approvedIds.has(String(row.portalUserId ?? row.traineeId)))
    }
  }

  return rows.sort((a, b) => {
    const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
    const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
    return tb - ta
  })
}
