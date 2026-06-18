import { buildTrainerCompanyWorkspace } from './trainerCompanyWorkspace.js'

/** Assigned company trainings for the logged-in trainer (never demo seed data). */
export function resolveTrainerSessions(trainerEmail, authTrainerName = '') {
  return buildTrainerCompanyWorkspace(trainerEmail, authTrainerName).sessions
}

export function parseTrainerTrainingId(pathname, searchParams) {
  const sectionMatch = String(pathname ?? '').match(/\/dashboard\/section\/([^/?#]+)/)
  if (sectionMatch?.[1]) return decodeURIComponent(sectionMatch[1])
  const fromQuery = String(searchParams?.get?.('training') ?? '').trim()
  return fromQuery
}

export function parseTrainerViewId(searchParams) {
  return String(searchParams?.get?.('view') ?? '').trim()
}

export function buildTrainerDashboardUrl(trainingId, viewId, extraParams = {}) {
  const params = new URLSearchParams()
  if (trainingId) params.set('training', trainingId)
  if (viewId) params.set('view', viewId)
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value != null && String(value).trim()) params.set(key, String(value).trim())
  })
  const q = params.toString()
  return q ? `/dashboard?${q}` : '/dashboard'
}

export function buildTrainerEnrollmentRequestsUrl(applicationId = '', trainingId = '') {
  return buildTrainerDashboardUrl(
    trainingId,
    'enrollment-requests',
    applicationId ? { application: applicationId } : {},
  )
}

export function buildTrainerTaskSubmissionsUrl(trainingId = '') {
  return buildTrainerDashboardUrl(trainingId, 'evaluate')
}
