import { findLocalApplication } from '../api/enrollmentApplicationApi.js'
import { parseCompanyTrainersSnapshot } from '../hooks/useCompanyTrainers.js'
import { parseRegisteredMembersSnapshot } from '../hooks/useRegisteredMembers.js'
import { getCourseAccessState, getCourseOnboardingBadge } from './courseEnrollmentAccess.js'
import { listCatalogEnrollmentsForCourse } from './trainingCatalogEnrollment.js'
import {
  hasVerifiablePortalIdentity,
  normalizePortalEmail,
  resolveKnownPortalUser,
} from './portalUserDirectory.js'

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
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
    'Student'

  return { name, email }
}

/** Approved / published trainings owned by this company account. */
export function listCompanyTrainingPrograms(companyEmail, trainingRequests = []) {
  const ce = normalizeEmail(companyEmail)
  if (!ce) return []

  return (trainingRequests ?? [])
    .filter((row) => normalizeEmail(row.requestedByEmail) === ce)
    .filter((row) => String(row.reviewStatus ?? '').toUpperCase() === 'APPROVED')
    .map((row) => ({
      id: row.id,
      title: String(row.title ?? '').trim() || 'Training program',
      branchId: String(row.branchId ?? 'cairo').trim(),
      courseId: String(row.publishedTrainingId ?? '').trim(),
      trainerName: String(row.trainer ?? '').trim(),
      trainerEmail: normalizePortalEmail(row.trainerEmail),
    }))
    .filter((row) => row.courseId)
}

/** All students subscribed to any company training program. */
export function listCompanyEnrolledStudents(companyEmail, trainingRequests = []) {
  const programs = listCompanyTrainingPrograms(companyEmail, trainingRequests)
  if (programs.length === 0) return []

  const rows = []
  const seen = new Set()

  for (const program of programs) {
    for (const { userId, enrollment } of listCatalogEnrollmentsForCourse(program.branchId, program.courseId)) {
      const userKey = `${userId}::${program.courseId}`
      if (seen.has(userKey)) continue

      const application = findLocalApplication(userId, program.branchId, program.courseId)
      if (!hasVerifiablePortalIdentity(userId, enrollment, application)) continue

      const profile = resolveStudentProfile(userId, enrollment, application)
      if (!profile.email) continue

      seen.add(userKey)
      const { onboarding } = getCourseAccessState(userId, program.branchId, program.courseId)
      const badge = getCourseOnboardingBadge(onboarding)

      rows.push({
        id: userKey,
        userId,
        name: profile.name,
        email: profile.email,
        trainingTitle: enrollment.trainingTitle || program.title,
        trainingId: program.courseId,
        branchId: program.branchId,
        courseId: program.courseId,
        trainerName: program.trainerName,
        trainerEmail: program.trainerEmail,
        enrolledAt: enrollment.enrolledAtUtc || application?.createdAtUtc,
        onboarding,
        statusLabel: badge.label,
        statusTone: badge.tone,
      })
    }
  }

  return rows.sort(
    (a, b) => new Date(b.enrolledAt ?? 0).getTime() - new Date(a.enrolledAt ?? 0).getTime(),
  )
}

/** Trainers linked to this company account. */
export function listCompanyTrainerRoster(companyEmail) {
  const ce = normalizeEmail(companyEmail)
  if (!ce) return []

  return parseCompanyTrainersSnapshot()
    .filter((row) => normalizeEmail(row.companyEmail) === ce)
    .map((row) => ({
      id: row.id,
      name: String(row.fullName ?? '').trim() || 'Trainer',
      email: normalizePortalEmail(row.email),
      position: String(row.companyPosition ?? '').trim(),
      tracks: Array.isArray(row.linkedTrackTitles)
        ? row.linkedTrackTitles.map((t) => String(t ?? '').trim()).filter(Boolean)
        : [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function summarizeCompanyApplicants(students = [], trainers = []) {
  const studentRows = students ?? []
  const trainerRows = trainers ?? []
  const byTraining = new Map()

  for (const row of studentRows) {
    const key = row.trainingTitle || row.trainingId
    byTraining.set(key, (byTraining.get(key) ?? 0) + 1)
  }

  return {
    studentCount: studentRows.length,
    trainerCount: trainerRows.length,
    programCount: byTraining.size,
    approvedStudents: studentRows.filter((row) => row.onboarding === 'approved').length,
    pendingStudents: studentRows.filter((row) => row.onboarding === 'pending').length,
  }
}
