/** @deprecated Re-export hub — prefer importing from `adminDashboardData.js`. */
export {
  DEFAULT_BRANCH_ID,
  adminBranches,
  getBranchStats,
  getBranchApplications,
  getBranchTrainingRows,
  getBranchTracks,
  getBranchPosts,
  getBranchAdminTrainings,
  getBranchApplicantsTable,
  countApplicantsByStatus,
  getBranchDetailsTrainings,
  getBranchTrainers,
  normalizeBranchId,
} from './adminDashboardData.js'

export const adminTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'trainings', label: 'Trainings' },
  { id: 'trainers', label: 'Trainers' },
  { id: 'members', label: 'Members' },
  { id: 'companies', label: 'Companies' },
  { id: 'posts', label: 'Posts' },
]
