import { getBranchAdminTrainings } from '../data/adminDashboardData.js'

const COMPANY_REQUESTS_KEY = 'ts-company-training-requests'

function readCompanyTrainings() {
  try {
    const raw = localStorage.getItem(COMPANY_REQUESTS_KEY)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Resolve trainer metadata for a catalog course (admin seed + company-published).
 */
export function resolveCourseTrainer(branchId, courseId) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!bid || !cid) {
    return { trainerId: '', trainerEmail: '', trainerName: '', courseTitle: '' }
  }

  const seed = getBranchAdminTrainings(bid).find((t) => String(t.id) === cid)
  if (seed) {
    return {
      trainerId: seed.trainerEmail || seed.trainer || cid,
      trainerEmail: String(seed.trainerEmail ?? '').trim().toLowerCase(),
      trainerName: String(seed.trainer ?? '').trim(),
      courseTitle: String(seed.title ?? '').trim(),
    }
  }

  const company = readCompanyTrainings().find(
    (r) =>
      String(r.publishedTrainingId ?? r.id) === cid ||
      (String(r.branchId ?? '') === bid && String(r.id) === cid),
  )
  if (company) {
    return {
      trainerId: company.trainerEmail || company.trainer || '',
      trainerEmail: String(company.trainerEmail ?? '').trim().toLowerCase(),
      trainerName: String(company.trainer ?? '').trim(),
      courseTitle: String(company.title ?? '').trim(),
    }
  }

  return { trainerId: '', trainerEmail: '', trainerName: '', courseTitle: '' }
}
