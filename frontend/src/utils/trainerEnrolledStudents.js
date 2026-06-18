import { parseRegisteredMembersSnapshot } from '../hooks/useRegisteredMembers.js'
import {
  ENROLLMENT_APPLICATIONS_CHANGED_EVENT,
  findLocalApplication,
  listLocalApplicationsForStudent,
  saveLocalApplication,
} from '../api/enrollmentApplicationApi.js'
import { getCourseAccessState, syncEnrollmentOnboardingFromApplication } from './courseEnrollmentAccess.js'
import { resolveCatalogCourseForTrainingId } from './catalogCourseContext.js'
import {
  CATALOG_ENROLLMENT_CHANGED_EVENT,
  listCatalogEnrollmentsForCourse,
  listCatalogEnrollmentsForTrainingId,
  readCatalogEnrollments,
  removeStudentFromCatalogCourse,
} from './trainingCatalogEnrollment.js'
import {
  hasVerifiablePortalIdentity,
  normalizePortalEmail,
  portalUserMatches,
  resolveKnownPortalUser,
} from './portalUserDirectory.js'
import { resolveCourseTrainer } from './resolveCourseTrainer.js'
import { PLATFORM_DEFAULT_TRAINER } from './platformDefaultTrainer.js'

export { ENROLLMENT_APPLICATIONS_CHANGED_EVENT as TRAINER_ENROLLED_STUDENTS_CHANGED_EVENT }
export { CATALOG_ENROLLMENT_CHANGED_EVENT as TRAINER_ENROLLED_ROSTER_CHANGED_EVENT }

function resolveApplicationForEnrollment(userId, enrollment) {
  const branchId = String(enrollment?.branchId ?? '').trim()
  const courseId = String(enrollment?.trainingId ?? '').trim()
  const direct = findLocalApplication(userId, branchId, courseId)
  if (direct) return direct

  return (
    listLocalApplicationsForStudent(userId).find(
      (row) =>
        String(row.branchId ?? '') === branchId &&
        String(row.courseId ?? '') === courseId,
    ) ?? null
  )
}

function getTrainerEnrollmentBadge(onboarding) {
  switch (String(onboarding ?? '').toLowerCase()) {
    case 'approved':
      return { label: 'Approved', tone: 'approved' }
    case 'rejected':
      return { label: 'Not approved', tone: 'rejected' }
    case 'pending':
      return { label: 'Pending review', tone: 'pending' }
    default:
      return { label: 'Subscribed', tone: 'none' }
  }
}

function resolveStudentProfile(userId, enrollment, application) {
  const knownUser = resolveKnownPortalUser(userId)
  const email = normalizePortalEmail(
    application?.userEmail || enrollment?.userEmail || knownUser?.email || '',
  )
  const member = email
    ? parseRegisteredMembersSnapshot().find((row) => normalizePortalEmail(row.email) === email)
    : null

  const name =
    application?.userName ||
    enrollment?.userName ||
    knownUser?.name ||
    member?.fullName ||
    ''

  return { name: name || 'Student', email }
}

/** Instructors and admins may view enrolled students. */
export function canViewEnrolledStudents(role) {
  const r = String(role ?? '').toLowerCase()
  return r === 'trainer' || r === 'admin'
}

/**
 * Students who subscribed to the active training through the site.
 * Only enrollments with a verifiable student identity (email or known account) are included.
 * @param {{ trainingId?: string }} options
 */
export function listTrainerEnrolledStudents(options = {}) {
  const { trainingId = '' } = options
  if (!trainingId) return []

  const course = resolveCatalogCourseForTrainingId(trainingId)
  if (!course) return []

  const catalogRows = listCatalogEnrollmentsForCourse(course.branchId, course.courseId)
  if (catalogRows.length === 0) return []

  const seenUserIds = new Set()
  const seenEmails = new Set()
  const students = []

  for (const { userId, enrollment } of catalogRows) {
    const userKey = String(userId)
    if (seenUserIds.has(userKey)) continue

    const application = resolveApplicationForEnrollment(userId, enrollment)
    if (!hasVerifiablePortalIdentity(userId, enrollment, application)) continue

    const profile = resolveStudentProfile(userId, enrollment, application)
    if (!profile.email) continue

    const emailKey = profile.email
    if (seenEmails.has(emailKey)) continue

    seenUserIds.add(userKey)
    seenEmails.add(emailKey)

    const enrollmentBranchId = String(enrollment.branchId ?? '').trim()
    const enrollmentCourseId = String(enrollment.trainingId ?? '').trim()
    const { onboarding } = getCourseAccessState(userId, enrollmentBranchId, enrollmentCourseId)
    const badge = getTrainerEnrollmentBadge(onboarding)

    students.push({
      id: userId,
      name: profile.name,
      email: profile.email,
      enrolledAt: enrollment.enrolledAtUtc || application?.createdAtUtc,
      courseTitle: enrollment.trainingTitle || course.courseTitle || '',
      branchId: enrollmentBranchId,
      courseId: enrollmentCourseId,
      progress: null,
      onboarding,
      statusLabel: badge.label,
      statusTone: badge.tone,
    })
  }

  return students.sort(
    (a, b) => new Date(b.enrolledAt ?? 0).getTime() - new Date(a.enrolledAt ?? 0).getTime(),
  )
}

/** Remove a student from the trainer's course roster. */
export function removeTrainerEnrolledStudent({ userId, trainingId, reason, removedBy = 'trainer' }) {
  const course = resolveCatalogCourseForTrainingId(trainingId)
  if (!course || !userId) {
    return { success: false, message: 'Missing course or student.' }
  }

  const removed = removeStudentFromCatalogCourse(userId, course.branchId, course.courseId, {
    reason: reason || 'Removed from course by instructor.',
    removedBy,
  })
  if (!removed) {
    return { success: false, message: 'Student is not enrolled in this course.' }
  }

  const application = findLocalApplication(userId, course.branchId, course.courseId)
  if (application) {
    const now = new Date().toISOString()
    const rejectionReason = reason || 'Removed from course by instructor.'
    const updated = {
      ...application,
      status: 'rejected',
      rejectionReason,
      reviewedAtUtc: now,
      updatedAtUtc: now,
      reviewedBy: removedBy,
    }
    saveLocalApplication(updated)
    syncEnrollmentOnboardingFromApplication(userId, course.branchId, course.courseId, updated)
  }

  return { success: true, message: 'Student removed from this course.' }
}

export function summarizeTrainerEnrolledStudents(students) {
  const rows = students ?? []
  return {
    total: rows.length,
    approved: rows.filter((row) => row.onboarding === 'approved').length,
    pending: rows.filter((row) => row.onboarding === 'pending').length,
    subscribed: rows.filter((row) => row.onboarding === 'none' || !row.onboarding).length,
  }
}

function messageTargetsTrainer(msg, trainerId, trainerEmail) {
  return portalUserMatches(trainerId, trainerEmail, msg?.receiverId)
}

function isIncomingStudentMessage(msg, trainerId, trainerEmail) {
  if (!messageTargetsTrainer(msg, trainerId, trainerEmail)) return false
  if (String(msg?.senderRole ?? '') === 'Trainer') return false
  const senderId = String(msg?.senderId ?? '')
  if (!senderId || senderId.startsWith('trainer-')) return false
  if (portalUserMatches(trainerId, trainerEmail, senderId)) return false
  return true
}

function studentEnrolledInTrainerCourse(senderId, trainerId, trainerEmail) {
  for (const enrollment of readCatalogEnrollments(senderId)) {
    const branchId = String(enrollment.branchId ?? '').trim()
    const courseId = String(enrollment.trainingId ?? '').trim()
    if (!branchId || !courseId) continue
    const status = String(enrollment.status ?? '').toLowerCase()
    if (!status.includes('accept') && !status.includes('enroll')) continue

    const courseTrainer = resolveCourseTrainer(branchId, courseId)
    const tid = String(trainerId ?? '')
    const email = normalizePortalEmail(trainerEmail)
    if (tid && String(courseTrainer.trainerId) === tid) return true
    if (email && normalizePortalEmail(courseTrainer.trainerEmail) === email) return true
    if (
      (email === normalizePortalEmail(PLATFORM_DEFAULT_TRAINER.trainerEmail) ||
        tid === PLATFORM_DEFAULT_TRAINER.trainerId) &&
      courseTrainer.trainerId === PLATFORM_DEFAULT_TRAINER.trainerId
    ) {
      return true
    }
  }
  return false
}

function senderMatchesTrainingScope(senderId, trainingId, rosterIds) {
  if (rosterIds.has(String(senderId))) return true

  const course = resolveCatalogCourseForTrainingId(trainingId)
  if (course) {
    return listCatalogEnrollmentsForCourse(course.branchId, course.courseId).some(
      (row) => String(row.userId) === String(senderId),
    )
  }

  if (trainingId) {
    const rows = listCatalogEnrollmentsForTrainingId(trainingId)
    if (rows.length > 0) {
      return rows.some((row) => String(row.userId) === String(senderId))
    }
  }

  return null
}

function resolveIncomingMessageStudent(senderId, roster) {
  const fromRoster = roster.find((row) => String(row.id) === String(senderId))
  if (fromRoster) return fromRoster

  const known = resolveKnownPortalUser(senderId)
  return {
    id: senderId,
    name: known?.name || 'Student',
    email: known?.email || '',
  }
}

/** Incoming messages sent by students to the trainer for the active course roster. */
export function listTrainerIncomingMessages(messages, trainerId, options = {}) {
  const { trainingId = '', trainerEmail = '' } = options
  if (!trainerId || !Array.isArray(messages)) return []

  const roster = listTrainerEnrolledStudents({ trainingId })
  const rosterIds = new Set(roster.map((row) => String(row.id)))

  return [...messages]
    .filter((msg) => {
      if (!isIncomingStudentMessage(msg, trainerId, trainerEmail)) return false
      const senderId = String(msg.senderId)
      const scope = senderMatchesTrainingScope(senderId, trainingId, rosterIds)
      if (scope === true) return true
      if (scope === false) return false
      return studentEnrolledInTrainerCourse(senderId, trainerId, trainerEmail) || rosterIds.size === 0
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map((msg) => {
      const student = resolveIncomingMessageStudent(msg.senderId, roster)
      return {
        ...msg,
        studentId: msg.senderId,
        studentName: student?.name || 'Student',
        studentEmail: student?.email || '',
      }
    })
}

export function countTrainerIncomingMessages(messages, trainerId, options = {}) {
  return listTrainerIncomingMessages(messages, trainerId, options).length
}
