import { adminBranches, getBranchAdminTrainings, getBranchTracks } from '../data/adminDashboardData.js'
import { parseCreatedTrainingsSnapshot } from '../hooks/useAdminCreatedTrainings.js'
import { catalogBranchMapHasApiRows } from './catalogApiMode.js'

/** @param {{ linkedTrackTitle?: string, linkedTrackId?: string }} training @param {string} branchId */
export function resolveTrainingTrackTitle(training, branchId) {
  const explicit = String(training.linkedTrackTitle ?? '').trim()
  if (explicit) return explicit
  const tid = training.linkedTrackId
  if (!tid) return ''
  const track = getBranchTracks(branchId).find((t) => t.id === tid)
  return track?.title ? String(track.title).trim() : ''
}

function normalizeTitle(value) {
  return String(value ?? '').trim().toLowerCase()
}

function mergeTrainingsById(...lists) {
  const merged = new Map()
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const row of list) {
      if (!row?.id) continue
      merged.set(String(row.id), row)
    }
  }
  return [...merged.values()]
}

/** Trainings for one branch (API rows + local snapshot + optional seed). */
export function getBranchCatalogTrainings(branchId, createdTrainingsByBranch = {}) {
  const snapshot = parseCreatedTrainingsSnapshot()
  const hasApiRows =
    catalogBranchMapHasApiRows(createdTrainingsByBranch) || catalogBranchMapHasApiRows(snapshot)
  const seed = hasApiRows ? [] : getBranchAdminTrainings(branchId)
  const created = mergeTrainingsById(
    createdTrainingsByBranch[branchId],
    snapshot[branchId],
    seed,
  )
  return created.map((training) => ({
    ...training,
    branchId: training.branchId ?? branchId,
    trackTitle: resolveTrainingTrackTitle(training, branchId),
  }))
}

function isRealCatalogTrainingId(trainingId) {
  const id = String(trainingId ?? '').trim()
  return Boolean(id) && !id.startsWith('saved-skill-')
}

function findTrainingById(trainings, trainingId) {
  const id = String(trainingId ?? '').trim()
  if (!isRealCatalogTrainingId(id)) return null
  return trainings.find((row) => String(row.id) === id) ?? null
}

function findTrainingByTitle(trainings, title) {
  const linkedTitle = normalizeTitle(title)
  if (!linkedTitle) return null
  return trainings.find((row) => normalizeTitle(row.title) === linkedTitle) ?? null
}

/** Resolve the catalog training row linked to a company post. */
export function resolveTrainingForPost(post, branchTrainings, allBranchTrainings = null) {
  const pools = []
  if (Array.isArray(branchTrainings) && branchTrainings.length > 0) pools.push(branchTrainings)
  if (allBranchTrainings) {
    for (const list of Object.values(allBranchTrainings)) {
      if (Array.isArray(list) && list.length > 0) pools.push(list)
    }
  }

  const linkedTitle = post?.training ?? post?.trainingTitle
  const trainingId = String(post?.trainingId ?? post?.trainingProgramId ?? '').trim()
  if (trainingId) {
    for (const pool of pools) {
      const byId = findTrainingById(pool, trainingId)
      if (byId) return byId
    }
    if (isRealCatalogTrainingId(trainingId)) {
      return {
        id: trainingId,
        title: String(linkedTitle ?? post?.title ?? '').trim() || 'Training program',
        branchId: post?.branchId,
      }
    }
  }

  for (const pool of pools) {
    const byTitle = findTrainingByTitle(pool, linkedTitle)
    if (byTitle) return byTitle
  }

  return null
}

/** All published trainings across branches (admin seed + company-created). */
export function getAllPublishedTrainings(createdTrainingsByBranch = {}) {
  return adminBranches.flatMap((branch) =>
    getBranchCatalogTrainings(branch.id, createdTrainingsByBranch),
  )
}

/**
 * Services / student browse catalog: published posts + trainings not already covered by a post.
 * Students enroll via the linked training program id on each post card.
 */
export function getAllPublishedServicesOfferings(
  createdTrainingsByBranch = {},
  createdPostsByBranch = {},
) {
  const offerings = []
  const coveredTrainingKeys = new Set()

  for (const branch of adminBranches) {
    const trainings = getBranchCatalogTrainings(branch.id, createdTrainingsByBranch)
    const posts = (createdPostsByBranch[branch.id] ?? []).filter(
      (post) => String(post.status ?? '').toUpperCase() === 'PUBLISHED',
    )

    for (const post of posts) {
      const training = resolveTrainingForPost(post, trainings, createdTrainingsByBranch)
      const trainingKey = training ? `${branch.id}::${training.id}` : ''
      if (trainingKey) coveredTrainingKeys.add(trainingKey)

      offerings.push({
        ...(training ?? {}),
        branchId: training?.branchId ?? branch.id,
        id: training?.id ?? `post-only-${post.id}`,
        title: post.title || training?.title || 'Training opportunity',
        body: post.body || training?.body || '',
        trackTitle: training?.trackTitle || post.tags?.[0] || 'Training',
        trainer: training?.trainer ?? 'Assigned instructor',
        date: post.deadline || training?.date || '',
        postId: post.id,
        linkedTrainingTitle: post.training ?? post.trainingTitle ?? '',
        deadline: post.deadline,
        enrollable: Boolean(training?.id),
        sourceType: 'post',
      })
    }

    for (const training of trainings) {
      const key = `${branch.id}::${training.id}`
      if (coveredTrainingKeys.has(key)) continue
      offerings.push({
        ...training,
        enrollable: true,
        sourceType: 'training',
      })
    }
  }

  return offerings
}
