import { getBranchTracks, normalizeBranchId } from '../data/adminDashboardData.js'
import { parseCreatedTrainingsSnapshot, prependTrainingToSnapshot } from '../hooks/useAdminCreatedTrainings.js'
import { getCompanyTrackRequestsSnapshot } from './companyPortalStore.js'

const CREATED_TRACKS_KEY = 'itconnect_admin_created_tracks_v1'

function parseCreatedTracksByBranch() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CREATED_TRACKS_KEY)
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function initialsFromTrainerName(name) {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return '??'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

function resolveLinkedTrack(branchId, trackRequestId, trackTitle) {
  const bid = normalizeBranchId(branchId)
  const titleNorm = String(trackTitle ?? '').trim().toLowerCase()
  if (!titleNorm) return null

  const companyTrack = getCompanyTrackRequestsSnapshot().find(
    (r) => r.id === trackRequestId || r.apiId === trackRequestId,
  )
  if (companyTrack?.approvedTrackId) {
    const approvedId = String(companyTrack.approvedTrackId).trim()
    const created = parseCreatedTracksByBranch()[bid] ?? []
    const seed = getBranchTracks(bid)
    const match = [...created, ...seed].find((t) => t.id === approvedId)
    if (match) {
      return { id: match.id, label: String(match.skillsName ?? match.title ?? trackTitle).trim() }
    }
    return { id: approvedId, label: String(companyTrack.title ?? trackTitle).trim() }
  }

  const created = parseCreatedTracksByBranch()[bid] ?? []
  const seed = getBranchTracks(bid)
  const match = [...created, ...seed].find((t) => {
    const name = String(t.skillsName ?? t.title ?? '').trim().toLowerCase()
    return name === titleNorm
  })
  if (!match) return null
  return { id: match.id, label: String(match.skillsName ?? match.title ?? '').trim() }
}

/**
 * Adds a company-submitted training directly to the branch catalog (no admin approval queue).
 * @returns {string} published training id
 */
export function publishCompanyTrainingRequest(request) {
  const branchId = normalizeBranchId(request.branchId)
  const createdAt = request.createdAt || Date.now()
  const linked = resolveLinkedTrack(branchId, request.trackRequestId, request.trackTitle)

  const trainingId = `new-training-${branchId}-${createdAt}`
  const newTraining = {
    id: trainingId,
    title: request.title,
    body: request.body || 'No description provided.',
    date: request.date || new Date().toISOString().slice(0, 10),
    trainer: request.trainer,
    ...(request.trainerEmail ? { trainerEmail: String(request.trainerEmail).trim().toLowerCase() } : {}),
    initials: initialsFromTrainerName(request.trainer),
    seatsTaken: 0,
    seatsTotal: Math.max(1, Number.parseInt(String(request.seatsTotal ?? '20'), 10) || 20),
    status: request.status === 'upcoming' ? 'upcoming' : 'active',
    ...(linked ? { linkedTrackId: linked.id, linkedTrackTitle: linked.label } : {}),
    ...(request.trackTitle && !linked ? { linkedTrackTitle: request.trackTitle } : {}),
    ...(request.documentFileName ? { attachedDocumentName: request.documentFileName } : {}),
    ...(request.documentFileName && request.documentDataUrl ? { attachedDocumentDataUrl: request.documentDataUrl } : {}),
    ...(request.requestedByEmail
      ? { companyContactEmail: String(request.requestedByEmail).trim().toLowerCase() }
      : {}),
  }

  prependTrainingToSnapshot(branchId, newTraining)
  return trainingId
}
