/**
 * In-memory cache for company portal data (SQL-backed via API).
 * No localStorage — hooks refresh this store from the backend.
 */

const CHANGED = 'company-portal-store-changed'

let profiles = []
let trainers = []
let trackRequests = []
let trainingRequests = []
let postRequests = []
let selectedTracks = []
/** Catalog trainings assigned to the logged-in trainer (from API bootstrap). */
let trainerCatalogTrainings = []

function notify() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CHANGED))
}

export function listenCompanyPortalStore(handler) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGED, handler)
  return () => window.removeEventListener(CHANGED, handler)
}

export function getCompanyProfilesSnapshot() {
  return profiles
}

export function setCompanyProfilesSnapshot(rows) {
  profiles = Array.isArray(rows) ? rows : []
  notify()
}

export function getCompanyTrainersSnapshot() {
  return trainers
}

export function setCompanyTrainersSnapshot(rows) {
  trainers = Array.isArray(rows) ? rows : []
  notify()
}

export function getCompanyTrackRequestsSnapshot() {
  return trackRequests
}

export function setCompanyTrackRequestsSnapshot(rows) {
  trackRequests = Array.isArray(rows) ? rows : []
  notify()
}

export function getCompanyTrainingRequestsSnapshot() {
  return trainingRequests
}

export function setCompanyTrainingRequestsSnapshot(rows) {
  trainingRequests = Array.isArray(rows) ? rows : []
  notify()
}

export function getCompanyPostRequestsSnapshot() {
  return postRequests
}

export function setCompanyPostRequestsSnapshot(rows) {
  postRequests = Array.isArray(rows) ? rows : []
  notify()
}

export function getCompanySelectedTracksSnapshot() {
  return selectedTracks
}

export function setCompanySelectedTracksSnapshot(rows) {
  selectedTracks = Array.isArray(rows) ? rows : []
  notify()
}

export function getTrainerCatalogTrainingsSnapshot() {
  return trainerCatalogTrainings
}

export function setTrainerCatalogTrainingsSnapshot(rows) {
  trainerCatalogTrainings = Array.isArray(rows) ? rows : []
  notify()
}

/** @deprecated use getCompanyProfilesSnapshot */
export const parseCompanyProfilesSnapshot = getCompanyProfilesSnapshot

/** @deprecated use getCompanyTrainersSnapshot */
export const parseCompanyTrainersSnapshot = getCompanyTrainersSnapshot

/** @deprecated use getCompanyTrackRequestsSnapshot */
export const parseCompanyTrackRequestsSnapshot = getCompanyTrackRequestsSnapshot

/** @deprecated use getCompanyTrainingRequestsSnapshot */
export const parseCompanyTrainingRequestsSnapshot = getCompanyTrainingRequestsSnapshot

/** @deprecated use getCompanyPostRequestsSnapshot */
export const parseCompanyPostRequestsSnapshot = getCompanyPostRequestsSnapshot
