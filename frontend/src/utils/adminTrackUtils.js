import { getBranchTracks, normalizeBranchId } from '../data/adminDashboardData.js'

export function getTrackById(branchId, trackId) {
  const id = normalizeBranchId(branchId)
  return getBranchTracks(id).find((t) => t.id === trackId) ?? null
}
