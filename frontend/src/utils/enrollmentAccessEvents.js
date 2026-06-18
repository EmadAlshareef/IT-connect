export const COURSE_ACCESS_CHANGED_EVENT = 'ts-course-access-changed'
export const STUDENT_TRAINING_ACCESS_EVENT = 'ts-student-training-access-changed'

export function dispatchEnrollmentAccessChanged(catalogEventName) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(catalogEventName))
  window.dispatchEvent(new CustomEvent(COURSE_ACCESS_CHANGED_EVENT))
  window.dispatchEvent(new CustomEvent(STUDENT_TRAINING_ACCESS_EVENT))
}
