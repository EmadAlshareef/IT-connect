import { resolveCatalogCourseForTrainingId } from './catalogCourseContext.js'

export function attachCourseContextToTaskBrief(entry) {
  const course = resolveCatalogCourseForTrainingId(entry.sessionId)
  if (!course) return entry
  return {
    ...entry,
    branchId: course.branchId,
    courseId: course.courseId,
    courseTitle: entry.courseTitle || course.courseTitle,
  }
}

export function resolveBriefCourseIds(brief) {
  const branchId = String(brief.branchId ?? '').trim()
  const courseId = String(brief.courseId ?? brief.sessionId ?? '').trim()
  if (branchId && courseId) {
    return { branchId, courseId }
  }
  const mapped = resolveCatalogCourseForTrainingId(brief.sessionId)
  if (!mapped) return { branchId: '', courseId: courseId || '' }
  return { branchId: mapped.branchId, courseId: mapped.courseId }
}

export const STUDENT_COURSE_TASKS_CHANGED_EVENT = 'ts-student-course-tasks-changed'

export function notifyStudentCourseTasksChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(STUDENT_COURSE_TASKS_CHANGED_EVENT))
}
