import { fetchTraining, mapTrainingDtoToCard } from '../api/catalogApi.js'
import { parseCreatedTrainingsSnapshot } from '../hooks/useAdminCreatedTrainings.js'
import { getCompanyProfilesSnapshot, getCompanyTrainingRequestsSnapshot } from './companyPortalStore.js'
import { getCompanyProfileByContactEmail } from './trainerCompanyWorkspace.js'
import { normalizePortalEmail } from './portalUserDirectory.js'

function packCompanyContact({ companyEmail = '', companyName = '', contactName = '' } = {}) {
  const email = normalizePortalEmail(companyEmail)
  if (!email) return { companyEmail: '', companyName: '' }

  const profile = getCompanyProfileByContactEmail(email)
  const profiles = getCompanyProfilesSnapshot()
  const fromSnapshot =
    profile ??
    profiles.find((row) => normalizePortalEmail(row.contactEmail) === email) ??
    null

  const name =
    String(companyName ?? '').trim() ||
    String(fromSnapshot?.companyName ?? '').trim() ||
    String(contactName ?? '').trim()

  return { companyEmail: email, companyName: name }
}

/** Resolve company contact from in-memory / local catalog snapshots. */
export function resolveCourseCompanyContact(branchId, courseId) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!bid || !cid) return { companyEmail: '', companyName: '' }

  const request = getCompanyTrainingRequestsSnapshot().find(
    (row) =>
      String(row.publishedTrainingId ?? '') === cid &&
      (!row.branchId || String(row.branchId) === bid),
  )
  if (request) {
    return packCompanyContact({
      companyEmail: request.companyEmail || request.requestedByEmail,
      contactName: request.requestedBy,
    })
  }

  const created = parseCreatedTrainingsSnapshot()[bid]?.find((row) => String(row.id) === cid)
  if (created?.companyContactEmail) {
    return packCompanyContact({ companyEmail: created.companyContactEmail })
  }

  return { companyEmail: '', companyName: '' }
}

/** Load company contact for a catalog training (SQL + local fallbacks). */
export async function fetchCourseCompanyContact(branchId, courseId) {
  const local = resolveCourseCompanyContact(branchId, courseId)
  if (local.companyEmail) return local

  try {
    const dto = await fetchTraining(courseId)
    if (!dto) return local
    const row = mapTrainingDtoToCard(dto)
    if (row.branchId && bidMismatch(branchId, row.branchId)) return local
    return packCompanyContact({
      companyEmail: row.companyEmail,
      companyName: row.companyName,
    })
  } catch {
    return local
  }
}

function bidMismatch(expected, actual) {
  const a = String(expected ?? '').trim()
  const b = String(actual ?? '').trim()
  return Boolean(a && b && a !== b)
}
