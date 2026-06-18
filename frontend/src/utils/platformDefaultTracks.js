import { adminBranches, getBranchTracks } from '../data/adminDashboardData.js'

const STORAGE_KEY = 'itconnect_platform_default_tracks_v1'
const CHANGED_EVENT = 'platform-default-tracks-changed'

function normalizeTitle(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function slugifyTitle(title) {
  return normalizeTitle(title).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'track'
}

function readPromoted() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writePromoted(rows) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
    window.dispatchEvent(new Event(CHANGED_EVENT))
  } catch {
    /* ignore quota */
  }
}

/** Built-in tracks every company can use immediately (no approval wait). */
export function getSeedPlatformDefaultTracks() {
  const seen = new Set()
  const rows = []

  for (const branch of adminBranches) {
    for (const track of getBranchTracks(branch.id)) {
      const title = String(track.title ?? '').trim()
      const key = normalizeTitle(title)
      if (!title || seen.has(key)) continue
      seen.add(key)
      rows.push({
        id: `pdef-seed-${slugifyTitle(title)}`,
        title,
        description: '',
        source: 'seed',
        branchIds: null,
        createdAt: 0,
      })
    }
  }

  return rows
}

function mergeTracksByTitle(seedRows, promotedRows) {
  const byTitle = new Map()
  for (const row of seedRows) {
    byTitle.set(normalizeTitle(row.title), row)
  }
  for (const row of promotedRows) {
    byTitle.set(normalizeTitle(row.title), row)
  }
  return [...byTitle.values()].sort((a, b) => a.title.localeCompare(b.title))
}

/** All platform-wide default tracks (seed + admin-approved custom). */
export function listPlatformDefaultTracks() {
  return mergeTracksByTitle(getSeedPlatformDefaultTracks(), readPromoted())
}

/**
 * Tracks a company can pick for trainings/trainers without waiting on their own request.
 * @param {string} [branchId]
 */
export function listSelectableTracksForCompany(branchId = 'cairo') {
  const bid = String(branchId ?? '').trim() || 'cairo'
  return listPlatformDefaultTracks().filter((row) => {
    if (!row.branchIds || row.branchIds.length === 0) return true
    return row.branchIds.includes(bid)
  })
}

export function toSelectableTrackOption(track) {
  return {
    value: `platform:${track.id}`,
    id: track.id,
    title: track.title,
    description: track.description ?? '',
    source: track.source ?? 'platform',
    isPlatformDefault: true,
    needsApproval: false,
    optionGroup: 'platform',
    optionLabel: track.title,
  }
}

export function companyApprovedTrackToOption(request) {
  const title = String(request?.title ?? '').trim()
  return {
    value: `company:${request.id}`,
    id: request.id,
    title,
    description: String(request?.description ?? '').trim(),
    source: 'company-approved',
    isPlatformDefault: false,
    needsApproval: false,
    optionGroup: 'company',
    optionLabel: `${title} (approved for your company)`,
  }
}

/**
 * Platform defaults + this company's admin-approved track requests (deduped by title).
 */
export function listTrainingTrackOptionsForCompany({ branchId = 'cairo', approvedCompanyRequests = [] } = {}) {
  const bid = String(branchId ?? '').trim() || 'cairo'
  const seenTitles = new Set()
  const options = []

  const approved = (approvedCompanyRequests ?? []).filter(
    (row) => String(row?.status ?? '').toUpperCase() === 'APPROVED',
  )

  for (const req of approved) {
    const title = String(req.title ?? '').trim()
    if (!title) continue
    seenTitles.add(normalizeTitle(title))
    options.push(companyApprovedTrackToOption(req))
  }

  for (const track of listSelectableTracksForCompany(bid)) {
    const key = normalizeTitle(track.title)
    if (seenTitles.has(key)) continue
    seenTitles.add(key)
    options.push(toSelectableTrackOption(track))
  }

  return options.sort((a, b) => a.title.localeCompare(b.title))
}

/**
 * Tracks this company activated for trainings (selected platform tracks + admin-approved custom).
 */
export function listActiveTrainingTrackOptionsForCompany({
  branchId = 'cairo',
  approvedCompanyRequests = [],
  selectedTrackValues = [],
} = {}) {
  const catalog = listTrainingTrackOptionsForCompany({ branchId, approvedCompanyRequests })
  const selected = new Set((selectedTrackValues ?? []).map((v) => String(v ?? '').trim()).filter(Boolean))

  return catalog.filter((opt) => opt.source === 'company-approved' || selected.has(opt.value))
}

export function resolveSelectableTrack(value, branchId = 'cairo', approvedCompanyRequests = []) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const bid = String(branchId ?? '').trim() || 'cairo'

  if (raw.startsWith('company:')) {
    const requestId = raw.slice('company:'.length)
    const req = (approvedCompanyRequests ?? []).find((row) => row.id === requestId)
    if (!req) return null
    return {
      trackRequestId: req.id,
      trackTitle: String(req.title ?? '').trim(),
      branchId: String(req.branchId ?? '').trim() || bid,
      platformTrackId: '',
      isPlatformDefault: false,
    }
  }

  if (raw.startsWith('platform:')) {
    const trackId = raw.slice('platform:'.length)
    const track = listSelectableTracksForCompany(bid).find((row) => row.id === trackId)
    if (!track) return null
    return {
      trackRequestId: '',
      trackTitle: track.title,
      branchId: bid,
      platformTrackId: track.id,
      isPlatformDefault: true,
    }
  }

  const legacy = (approvedCompanyRequests ?? []).find((row) => row.id === raw)
  if (legacy) {
    return {
      trackRequestId: legacy.id,
      trackTitle: String(legacy.title ?? '').trim(),
      branchId: String(legacy.branchId ?? '').trim() || bid,
      platformTrackId: '',
      isPlatformDefault: false,
    }
  }

  return null
}

/** When admin approves a company track request, add it for all companies. */
export function promoteTrackToPlatformDefaults({
  title,
  description = '',
  branchId = '',
  companyRequestId = '',
  approvedTrackId = '',
}) {
  const cleanTitle = String(title ?? '').trim()
  if (!cleanTitle) return null

  const key = normalizeTitle(cleanTitle)
  const existing = readPromoted().find((row) => normalizeTitle(row.title) === key)
  if (existing) return existing

  const entry = {
    id: `pdef-approved-${slugifyTitle(cleanTitle)}-${Date.now()}`,
    title: cleanTitle,
    description: String(description ?? '').trim(),
    source: 'approved-request',
    branchIds: null,
    companyRequestId: String(companyRequestId ?? '').trim(),
    approvedTrackId: String(approvedTrackId ?? '').trim(),
    promotedAt: Date.now(),
    createdAt: Date.now(),
  }

  writePromoted([entry, ...readPromoted()])
  return entry
}

export function listenPlatformDefaultTracksChanged(handler) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGED_EVENT, handler)
  window.addEventListener('admin-created-tracks', handler)
  window.addEventListener('company-portal-store-changed', handler)
  return () => {
    window.removeEventListener(CHANGED_EVENT, handler)
    window.removeEventListener('admin-created-tracks', handler)
    window.removeEventListener('company-portal-store-changed', handler)
  }
}

export { CHANGED_EVENT as PLATFORM_DEFAULT_TRACKS_CHANGED_EVENT }
