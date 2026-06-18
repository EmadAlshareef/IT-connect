import axios from 'axios'
import {
  createCompanySelectedTrack,
  deleteCompanySelectedTrack,
  fetchCompanySelectedTracks,
  toSelectedTrackPayload,
} from '../api/companyPortalApi.js'
import {
  getCompanySelectedTracksSnapshot,
  setCompanySelectedTracksSnapshot,
} from './companyPortalStore.js'

export const COMPANY_SELECTED_TRACKS_CHANGED = 'company-portal-store-changed'

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

export async function refreshCompanySelectedTracksFromApi(companyEmail) {
  let list = []
  try {
    list = await fetchCompanySelectedTracks({
      companyEmail: companyEmail || undefined,
    })
  } catch {
    return getCompanySelectedTracksSnapshot().filter(
      (row) => !companyEmail || normalizeEmail(row.companyEmail) === normalizeEmail(companyEmail),
    )
  }
  if (companyEmail) {
    const email = normalizeEmail(companyEmail)
    const other = getCompanySelectedTracksSnapshot().filter(
      (row) => normalizeEmail(row.companyEmail) !== email,
    )
    setCompanySelectedTracksSnapshot([...other, ...list])
  } else {
    setCompanySelectedTracksSnapshot(list)
  }
  return list
}

/** @param {string} companyEmail */
export function listCompanySelectedTrackValues(companyEmail) {
  const email = normalizeEmail(companyEmail)
  if (!email) return []
  return getCompanySelectedTracksSnapshot()
    .filter((row) => normalizeEmail(row.companyEmail) === email)
    .map((row) => String(row.trackValue ?? '').trim())
    .filter(Boolean)
}

/** @param {string} companyEmail */
export function listCompanySelectedTracks(companyEmail) {
  const email = normalizeEmail(companyEmail)
  if (!email) return []
  return getCompanySelectedTracksSnapshot()
    .filter((row) => normalizeEmail(row.companyEmail) === email)
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
}

export function isCompanyTrackSelected(companyEmail, trackValue) {
  const value = String(trackValue ?? '').trim()
  if (!value) return false
  return listCompanySelectedTrackValues(companyEmail).includes(value)
}

export async function addCompanySelectedTrack(companyEmail, { trackValue, title = '' } = {}) {
  const email = normalizeEmail(companyEmail)
  const value = String(trackValue ?? '').trim()
  if (!email || !value) return false
  if (isCompanyTrackSelected(email, value)) return true

  try {
    await createCompanySelectedTrack(
      toSelectedTrackPayload({
        companyEmail: email,
        trackValue: value,
        title: String(title ?? '').trim(),
      }),
    )
    await refreshCompanySelectedTracksFromApi(email)
    return true
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      await refreshCompanySelectedTracksFromApi(email)
      return true
    }
    await refreshCompanySelectedTracksFromApi(email)
    return false
  }
}

export async function removeCompanySelectedTrack(companyEmail, trackValue) {
  const email = normalizeEmail(companyEmail)
  const value = String(trackValue ?? '').trim()
  if (!email || !value) return false

  const row = getCompanySelectedTracksSnapshot().find(
    (r) => normalizeEmail(r.companyEmail) === email && String(r.trackValue ?? '').trim() === value,
  )
  if (!row) return false

  try {
    await deleteCompanySelectedTrack(row.apiId || row.id)
    await refreshCompanySelectedTracksFromApi(email)
    return true
  } catch {
    await refreshCompanySelectedTracksFromApi(email)
    return false
  }
}

export function listenCompanySelectedTracksChanged(handler) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(COMPANY_SELECTED_TRACKS_CHANGED, handler)
  return () => window.removeEventListener(COMPANY_SELECTED_TRACKS_CHANGED, handler)
}
