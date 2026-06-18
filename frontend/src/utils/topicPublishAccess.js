import { trainingSections } from '../data/sessions.js'
import {
  isActiveCatalogEnrollment,
  listCatalogEnrollmentsForTrainingId,
  readCatalogEnrollments,
} from './trainingCatalogEnrollment.js'

export const PUBLISHED_TOPICS_CHANGED_EVENT = 'ts-published-topics-changed'

/** Stable key for duplicate publish detection (per training). */
export function makeTopicContentKey(trainingId, title) {
  const tid = String(trainingId ?? '').trim().toLowerCase()
  const slug = String(title ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${tid}::${slug || 'untitled'}`
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

/** @param {string} trainingId @param {{ id?: string, email?: string, name?: string }[]} sessionStudents */
export function resolveEnrolledAudience(trainingId, sessionStudents = []) {
  const tid = String(trainingId ?? '').trim()
  const seen = new Map()

  for (const student of sessionStudents) {
    const id = String(student.id ?? student.email ?? student.name ?? '').trim()
    if (!id) continue
    seen.set(id, {
      id,
      email: normalizeEmail(student.email),
      name: String(student.name ?? '').trim(),
      source: 'session',
    })
  }

  if (typeof window !== 'undefined') {
    for (const { userId, enrollment } of listCatalogEnrollmentsForTrainingId(tid)) {
      if (!isActiveCatalogEnrollment(enrollment)) continue
      const mail = normalizeEmail(enrollment.userEmail)
      seen.set(userId, {
        id: userId,
        email: mail,
        name: String(enrollment.userName ?? enrollment.trainingTitle ?? 'Student').trim(),
        source: 'catalog',
      })
    }
  }

  return [...seen.values()]
}

/**
 * Students who should receive a publish for this training (approved catalog + session roster).
 */
export function resolvePublishAudienceForTraining(trainingId, sessionStudents = []) {
  return resolveEnrolledAudience(trainingId, sessionStudents)
}

/** Whether the student is actively enrolled in this training (not other trainings). */
export function isStudentEnrolledInTraining(userId, email, trainingId) {
  const tid = String(trainingId ?? '').trim()
  if (!tid) return false

  const uid = String(userId ?? '').trim()
  const mail = normalizeEmail(email)

  if (uid && typeof window !== 'undefined') {
    const enrolled = readCatalogEnrollments(uid).some(
      (row) => String(row.trainingId ?? '') === tid && isActiveCatalogEnrollment(row),
    )
    if (enrolled) return true
  }

  if (typeof window !== 'undefined') {
    for (const { userId: catalogUserId, enrollment } of listCatalogEnrollmentsForTrainingId(tid)) {
      if (!isActiveCatalogEnrollment(enrollment)) continue
      if (uid && catalogUserId === uid) return true
      const enrollmentEmail = normalizeEmail(enrollment.userEmail)
      if (mail && enrollmentEmail && enrollmentEmail === mail) return true
    }
  }

  for (const student of getSessionStudentsForTraining(tid)) {
    const studentId = String(student.id ?? '').trim()
    const studentEmail = normalizeEmail(student.email)
    if (uid && studentId && studentId === uid) return true
    if (mail && studentEmail && studentEmail === mail) return true
  }

  return false
}

export function getSessionStudentsForTraining(trainingId, sessionSummaries = trainingSections) {
  const session = sessionSummaries.find((row) => row.id === trainingId)
  return session?.students ?? []
}

/** Trainer may publish only to trainings they are assigned to. */
export function canTrainerPublishToTraining(trainerKey, trainingId, sessionSummaries = trainingSections) {
  if (!trainerKey || !trainingId) return false
  return sessionSummaries.some((section) => section.id === trainingId)
}

/** Enrolled students may view published topics only for trainings they belong to. */
export function canStudentViewPublishedTopic(userId, email, topic, courseContext = {}) {
  if (!topic || topic.status !== 'published') return false
  const tid = String(topic.trainingId ?? '').trim()
  if (!tid) return false
  const contextCourseId = String(courseContext.courseId ?? '').trim()
  const contextBranchId = String(courseContext.branchId ?? '').trim()
  const topicCourseId = String(topic.courseId ?? topic.trainingId ?? '').trim()
  const topicBranchId = String(topic.branchId ?? '').trim()

  if (contextCourseId) {
    const sameCourse = topicCourseId === contextCourseId || tid === contextCourseId
    const sameBranch = !contextBranchId || !topicBranchId || topicBranchId === contextBranchId
    if (!sameCourse || !sameBranch) return false
  }

  const uid = String(userId ?? '').trim()
  const audienceIds = Array.isArray(topic.enrolledStudentIds)
    ? topic.enrolledStudentIds.map((id) => String(id ?? '').trim()).filter(Boolean)
    : []
  if (uid && audienceIds.some((id) => id === uid)) return true

  if (contextCourseId && (topicCourseId === contextCourseId || tid === contextCourseId)) {
    return true
  }

  return isStudentEnrolledInTraining(userId, email, tid)
}

