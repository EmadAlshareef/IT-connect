import { resolveKnownPortalUser, normalizePortalEmail } from './portalUserDirectory.js'
import { resolveCourseTrainer } from './resolveCourseTrainer.js'
import { findLocalApplication, listLocalApplicationsForTrainer, isSubmittedEnrollmentApplication } from '../api/enrollmentApplicationApi.js'
import { readCatalogEnrollments } from './trainingCatalogEnrollment.js'
import { buildTrainerCompanyWorkspace } from './trainerCompanyWorkspace.js'
import { PLATFORM_DEFAULT_TRAINER } from './platformDefaultTrainer.js'

const MESSAGE_STORAGE_KEY = 'role-based-messages'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function trainerOwnsCourse(trainerId, trainerEmail, branchId, courseId) {
  const resolved = resolveCourseTrainer(branchId, courseId)
  const email = normalizePortalEmail(trainerEmail)
  const tid = String(trainerId ?? '')

  if (tid && String(resolved.trainerId) === tid) return true
  if (email && normalizePortalEmail(resolved.trainerEmail) === email) return true

  const workspace = buildTrainerCompanyWorkspace(trainerEmail)
  if (workspace.sessions.some((session) => String(session.id) === String(courseId))) {
    return true
  }

  if (
    (email === normalizePortalEmail(PLATFORM_DEFAULT_TRAINER.trainerEmail) ||
      tid === PLATFORM_DEFAULT_TRAINER.trainerId) &&
    resolved.trainerId === PLATFORM_DEFAULT_TRAINER.trainerId
  ) {
    return true
  }

  return false
}

function resolveStudentLabel(userId, enrollment, application) {
  return (
    application?.userName ||
    enrollment?.userName ||
    resolveKnownPortalUser(userId)?.name ||
    'A student'
  )
}

/** Collect recent student actions across courses owned by this trainer. */
export function collectTrainerStudentActivities({ trainerId, trainerEmail, limit = 40 }) {
  if (!trainerId || typeof window === 'undefined') return []

  const rows = []

  try {
    const messages = readJson(MESSAGE_STORAGE_KEY, [])
    for (const msg of messages) {
      if (String(msg.receiverId) !== String(trainerId)) continue
      const senderId = String(msg.senderId ?? '')
      if (msg.senderRole === 'Trainer' || senderId.startsWith('trainer-')) continue

      const student = resolveKnownPortalUser(senderId)
      const studentName = student?.name || 'A student'
      const preview = String(msg.content ?? '').trim().slice(0, 120)

      let courseTitle = 'Direct message'
      let branchId = ''
      let courseId = ''
      for (const enrollment of readCatalogEnrollments(senderId)) {
        const bid = String(enrollment.branchId ?? '').trim()
        const cid = String(enrollment.trainingId ?? '').trim()
        if (!bid || !cid || !trainerOwnsCourse(trainerId, trainerEmail, bid, cid)) continue
        const trainer = resolveCourseTrainer(bid, cid)
        courseTitle = trainer.courseTitle || enrollment.trainingTitle || courseTitle
        branchId = bid
        courseId = cid
        break
      }

      rows.push({
        id: `activity-msg-${msg.id}`,
        userId: trainerId,
        title: `${studentName} sent a message`,
        message: preview || 'New message from a student.',
        tone: 'info',
        isRead: false,
        type: 'student_message',
        studentId: senderId,
        studentName,
        branchId,
        courseId,
        trainingId: courseId,
        targetView: 'messages',
        createdAtUtc: msg.timestamp ?? new Date().toISOString(),
        courseTitle,
      })
    }
  } catch {
    /* ignore */
  }

  for (const app of listLocalApplicationsForTrainer(trainerEmail, null, trainerId)) {
    if (!isSubmittedEnrollmentApplication(app)) continue
    const branchId = String(app.branchId ?? '').trim()
    const courseId = String(app.courseId ?? '').trim()
    if (!branchId || !courseId) continue
    const courseTitle = app.courseTitle || resolveCourseTrainer(branchId, courseId).courseTitle || 'Training program'
    rows.push({
      id: `activity-app-${branchId}-${courseId}-${app.userId}`,
      userId: trainerId,
      title: `${app.userName || 'A student'} applied to join`,
      message: `${app.userName || 'A student'} submitted an enrollment application for ${courseTitle}.`,
      tone: 'info',
      isRead: false,
      type: 'enrollment_request',
      applicationId: app.id,
      branchId,
      courseId,
      courseTitle,
      trainingId: courseId,
      studentId: app.userId,
      studentName: app.userName,
      targetView: 'enrollment-requests',
      createdAtUtc: app.updatedAtUtc || app.createdAtUtc || new Date().toISOString(),
    })
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('ts-student-submissions-')) continue
    const studentUserId = key.slice('ts-student-submissions-'.length)
    const submissions = readJson(key, [])
    for (const sub of submissions) {
      const branchId = String(sub.branchId ?? '').trim()
      const courseId = String(sub.courseId ?? '').trim()
      if (!branchId || !courseId) continue
      if (!trainerOwnsCourse(trainerId, trainerEmail, branchId, courseId)) continue

      const trainer = resolveCourseTrainer(branchId, courseId)
      const application = findLocalApplication(studentUserId, branchId, courseId)
      const studentName = resolveStudentLabel(studentUserId, null, application)

      rows.push({
        id: `activity-sub-${sub.id}`,
        userId: trainerId,
        title: `${studentName} submitted a task`,
        message: `${studentName} submitted “${sub.taskTitle || 'a task'}” in ${trainer.courseTitle || 'your course'}.`,
        tone: 'info',
        isRead: false,
        type: 'task_submission',
        branchId,
        courseId,
        courseTitle: trainer.courseTitle || sub.courseTitle || 'Training program',
        trainingId: courseId,
        submissionId: sub.id,
        taskId: sub.taskId,
        studentId: studentUserId,
        studentName,
        targetView: 'evaluate',
        createdAtUtc: sub.submittedAtUtc ?? new Date().toISOString(),
      })
    }
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('ts-catalog-training-enrollments-')) continue
    const studentUserId = key.slice('ts-catalog-training-enrollments-'.length)
    for (const enrollment of readCatalogEnrollments(studentUserId)) {
      const branchId = String(enrollment.branchId ?? '').trim()
      const courseId = String(enrollment.trainingId ?? '').trim()
      if (!branchId || !courseId) continue
      if (!trainerOwnsCourse(trainerId, trainerEmail, branchId, courseId)) continue

      const trainer = resolveCourseTrainer(branchId, courseId)
      const application = findLocalApplication(studentUserId, branchId, courseId)
      const studentName = resolveStudentLabel(studentUserId, enrollment, application)

      rows.push({
        id: `activity-enroll-${studentUserId}-${branchId}-${courseId}`,
        userId: trainerId,
        title: `${studentName} subscribed to the course`,
        message: `${studentName} enrolled in ${trainer.courseTitle || enrollment.trainingTitle || 'your course'}.`,
        tone: 'info',
        isRead: false,
        type: 'catalog_enrollment',
        branchId,
        courseId,
        courseTitle: trainer.courseTitle || enrollment.trainingTitle || 'Training program',
        trainingId: courseId,
        studentId: studentUserId,
        studentName,
        targetView: 'enrolled-students',
        createdAtUtc: enrollment.enrolledAtUtc ?? new Date().toISOString(),
      })
    }
  }

  return rows
    .sort((a, b) => new Date(b.createdAtUtc ?? 0).getTime() - new Date(a.createdAtUtc ?? 0).getTime())
    .slice(0, limit)
}

export function mergeTrainerActivityNotifications(existingNotifications, derivedActivities) {
  const merged = new Map()
  for (const row of existingNotifications ?? []) {
    if (row?.id) merged.set(row.id, row)
  }
  for (const row of derivedActivities ?? []) {
    if (!row?.id || merged.has(row.id)) continue
    merged.set(row.id, row)
  }
  return [...merged.values()].sort(
    (a, b) => new Date(b.createdAtUtc ?? 0).getTime() - new Date(a.createdAtUtc ?? 0).getTime(),
  )
}
