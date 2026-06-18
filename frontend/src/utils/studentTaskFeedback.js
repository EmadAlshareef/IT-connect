import { fetchStudentFeedbackApi } from '../api/feedbackApi.js'
import { listPublishedTasksForCourse } from './studentCourseTasks.js'

export const STUDENT_FEEDBACK_CHANGED_EVENT = 'ts-student-feedback-changed'

let snapshot = []
let bootstrapPromise = null

function publishedTaskIdsForCourse(branchId, courseId) {
  return new Set(listPublishedTasksForCourse(branchId, courseId).map((task) => String(task.id)))
}

function matchesCourseContext(source, branchId, courseId, publishedTaskIds) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!bid || !cid) return true

  const rowBid = String(source.branchId ?? '').trim()
  const rowCid = String(source.courseId ?? '').trim()
  if (rowBid && rowCid) return rowBid === bid && rowCid === cid

  const taskId = String(source.taskId ?? source.id ?? '').trim()
  return taskId ? publishedTaskIds.has(taskId) : false
}

export function setStudentFeedbackSnapshot(rows) {
  snapshot = Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []
  dispatchStudentFeedbackChanged()
}

export async function bootstrapStudentFeedback() {
  if (bootstrapPromise) return bootstrapPromise
  bootstrapPromise = (async () => {
    try {
      const rows = await fetchStudentFeedbackApi()
      setStudentFeedbackSnapshot(rows)
      return rows
    } catch {
      return snapshot
    } finally {
      bootstrapPromise = null
    }
  })()
  return bootstrapPromise
}

/** Feedback entries from SQL (trainer reviews). */
export function listStudentTaskFeedback(userId, { branchId = '', courseId = '' } = {}) {
  void userId
  const publishedTaskIds = publishedTaskIdsForCourse(branchId, courseId)
  return snapshot
    .filter((row) => matchesCourseContext(row, branchId, courseId, publishedTaskIds))
    .sort((a, b) => new Date(b.atUtc).getTime() - new Date(a.atUtc).getTime())
}

/** Keep only feedback rows that belong to one catalog course. */
export function filterFeedbackItemsForCourse(items, branchId, courseId) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!bid || !cid) return items ?? []

  const publishedTaskIds = publishedTaskIdsForCourse(bid, cid)
  return (items ?? []).filter((row) => {
    const rowBid = String(row.branchId ?? '').trim()
    const rowCid = String(row.courseId ?? '').trim()
    if (rowBid && rowCid) return rowBid === bid && rowCid === cid
    const taskId = String(row.taskId ?? '').trim()
    return taskId ? publishedTaskIds.has(taskId) : false
  })
}

export function dispatchStudentFeedbackChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(STUDENT_FEEDBACK_CHANGED_EVENT))
}
