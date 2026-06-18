/** Default instructor for catalog trainings without an explicit trainer email. */
import { parseRegisteredMembersSnapshot } from '../hooks/useRegisteredMembers.js'
import {
  getCompanyTrainingRequestsSnapshot,
  getTrainerCatalogTrainingsSnapshot,
} from './companyPortalStore.js'
import { buildTrainerCompanyWorkspace } from './trainerCompanyWorkspace.js'
import { normalizePortalEmail, portalUserMatches } from './portalUserDirectory.js'

export const PLATFORM_DEFAULT_TRAINER = {
  trainerId: 'trainer-2003',
  trainerEmail: 'trainer2003@gmail.com',
  trainerName: 'Trainer User',
}

export function withDefaultTrainer(meta = {}) {
  const trainerId = String(meta.trainerId ?? '').trim()
  const trainerEmail = String(meta.trainerEmail ?? '').trim().toLowerCase()
  const trainerName = String(meta.trainerName ?? '').trim()
  return {
    trainerId: trainerId || PLATFORM_DEFAULT_TRAINER.trainerId,
    trainerEmail: trainerEmail || PLATFORM_DEFAULT_TRAINER.trainerEmail,
    trainerName: trainerName || PLATFORM_DEFAULT_TRAINER.trainerName,
  }
}

function registeredMemberIdForEmail(trainerEmail) {
  const email = normalizePortalEmail(trainerEmail)
  if (!email) return ''
  const member = parseRegisteredMembersSnapshot().find(
    (row) => normalizePortalEmail(row.email) === email,
  )
  return member?.id ? String(member.id) : ''
}

export function trainerOwnsEnrollmentApplication(row, trainerEmail, trainerId = '', resolveCourseTrainerFn = null) {
  const email = String(trainerEmail ?? '').trim().toLowerCase()
  const tid = String(trainerId ?? '').trim()
  const rosterId = registeredMemberIdForEmail(email)
  const normalized = normalizeEnrollmentApplicationTrainer(row)
  const rowEmail = String(normalized.trainerEmail ?? '').trim().toLowerCase()
  const rowId = String(normalized.trainerId ?? '').trim()

  if (email && rowEmail && rowEmail === email) return true
  if (tid && rowId && rowId === tid) return true
  if (rosterId && rowId && rowId === rosterId) return true
  if (tid && rowId && portalUserMatches(tid, email, rowId)) return true
  if (email && rowEmail && portalUserMatches(tid, email, rowEmail)) return true
  if (rosterId && rowId && portalUserMatches(rosterId, email, rowId)) return true

  const courseId = String(row?.courseId ?? '').trim()
  if (email && courseId) {
    const ownsCatalogTraining = getTrainerCatalogTrainingsSnapshot().some(
      (training) =>
        String(training.id ?? '') === courseId &&
        normalizePortalEmail(training.trainerEmail) === email,
    )
    if (ownsCatalogTraining) return true

    const rowTitle = String(row?.courseTitle ?? '').trim().toLowerCase()
    const ownsCompanyTraining = getCompanyTrainingRequestsSnapshot().some((request) => {
      if (normalizePortalEmail(request.trainerEmail) !== email) return false
      const publishedId = String(request.publishedTrainingId ?? '').trim()
      if (publishedId && publishedId === courseId) return true
      const legacyId = String(request.id ?? '').trim()
      if (legacyId && legacyId === courseId) return true
      const requestTitle = String(request.title ?? '').trim().toLowerCase()
      return Boolean(requestTitle && rowTitle && requestTitle === rowTitle)
    })
    if (ownsCompanyTraining) return true
  }

  const resolveFn = resolveCourseTrainerFn
  if (resolveFn && row?.branchId && row?.courseId) {
    const courseTrainer = resolveFn(row.branchId, row.courseId)
    const courseEmail = String(courseTrainer.trainerEmail ?? '').trim().toLowerCase()
    const courseTid = String(courseTrainer.trainerId ?? '').trim()
    if (email && courseEmail && courseEmail === email) return true
    if (tid && courseTid && courseTid === tid) return true

    if (email) {
      const workspace = buildTrainerCompanyWorkspace(email, '')
      const courseId = String(row.courseId ?? '').trim()
      if (
        workspace.sessions.some((session) => {
          const sessionId = String(session.id ?? '').trim()
          const publishedId = String(session.publishedTrainingId ?? '').trim()
          const requestId = String(session.requestId ?? '').trim()
          return (
            (courseId && sessionId === courseId) ||
            (courseId && publishedId === courseId) ||
            (courseId && requestId === courseId)
          )
        })
      ) {
        return true
      }
    }
  }

  const isDefaultTrainer =
    email === PLATFORM_DEFAULT_TRAINER.trainerEmail || tid === PLATFORM_DEFAULT_TRAINER.trainerId
  if (isDefaultTrainer && !String(row?.trainerEmail ?? '').trim()) return true
  if (isDefaultTrainer && row?.branchId && row?.courseId && resolveFn) {
    const courseTrainer = resolveFn(row.branchId, row.courseId)
    if (courseTrainer.trainerId === PLATFORM_DEFAULT_TRAINER.trainerId) return true
  }

  return false
}

export function normalizeEnrollmentApplicationTrainer(row) {
  if (!row) return row
  const assignedEmail = String(row.trainerEmail ?? row.TrainerEmail ?? '').trim().toLowerCase()
  const assignedId = String(row.trainerId ?? row.TrainerId ?? '').trim()
  if (assignedEmail || assignedId) {
    return {
      ...row,
      trainerId: assignedId,
      trainerEmail: assignedEmail,
      trainerName:
        String(row.trainerName ?? row.TrainerName ?? '').trim() || assignedEmail,
    }
  }
  return {
    ...row,
    ...withDefaultTrainer(row),
  }
}
