import { trainingSections } from '../data/sessions.js'
import { buildTrainerCompanyWorkspace } from './trainerCompanyWorkspace.js'

/** @returns {import('../data/sessions.js').trainingSections[0][]} */
export function resolveTrainerSessions(trainerEmail, authTrainerName = '') {
  const workspace = buildTrainerCompanyWorkspace(trainerEmail, authTrainerName)
  if (workspace.hasCompanyData && workspace.sessions.length > 0) {
    return workspace.sessions
  }
  return trainingSections
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

export function buildTrainerDashboardUrl(trainingId, viewId) {
  const params = new URLSearchParams()
  if (trainingId) params.set('training', trainingId)
  if (viewId) params.set('view', viewId)
  const q = params.toString()
  return q ? `/dashboard?${q}` : '/dashboard'
}
