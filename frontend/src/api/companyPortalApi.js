import axios from 'axios'
import { apiClient, canUseProtectedApi, readStoredAuthToken } from './authApi.js'

export const COMPANY_LOGO_MAX_BYTES = 512 * 1024

export function getCompanyPortalApiErrorMessage(error, fallback = 'Could not save company details.') {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
    const status = error.response?.status
    if (status === 401 || status === 403) {
      return 'Your session cannot save company data. Sign out and sign in again with your company account.'
    }
    if (!error.response) {
      return 'Unable to reach the server. Check that the backend is running.'
    }
    if (status === 409) {
      return 'A company profile with this name already exists.'
    }
    if (status >= 500) {
      return 'Server error while saving the company. Restart the backend and try again.'
    }
  }
  return fallback
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function readStoredSessionRole() {
  try {
    const raw = localStorage.getItem('trainer-auth')
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    return String(parsed.role ?? '').toLowerCase()
  } catch {
    return ''
  }
}

/** Skip protected company-portal API calls for offline/demo sessions. */
export function canSyncCompanyPortalApi() {
  return (
    canUseProtectedApi(readStoredAuthToken()) &&
    ['admin', 'company', 'trainer'].includes(readStoredSessionRole())
  )
}

function trimOrEmpty(value) {
  return String(value ?? '').trim()
}

function fromDateTime(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') return value
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

function toIsoDateTime(ms) {
  if (ms == null || ms === '') return null
  const n = typeof ms === 'number' ? ms : new Date(ms).getTime()
  return Number.isFinite(n) ? new Date(n).toISOString() : null
}

function entryId(dto) {
  return dto.legacyLocalId || dto.id
}

/** @param {object} row */
export function resolveEntryApiId(row, list = []) {
  if (!row) return ''
  if (row.apiId) return row.apiId
  const id = trimOrEmpty(row.id)
  const match = list.find(
    (r) => r.apiId === id || r.id === id || r.legacyLocalId === id || trimOrEmpty(r.legacyLocalId) === id,
  )
  return match?.apiId || match?.id || id
}

// ── Companies ─────────────────────────────────────────────────────────────

export function mapCompanyDtoToProfile(dto) {
  return {
    id: entryId(dto),
    apiId: dto.id,
    legacyLocalId: dto.legacyLocalId ?? null,
    slug: dto.slug ?? '',
    companyName: dto.name ?? '',
    industry: dto.industry ?? '',
    logoUrl: dto.logoUrl ?? '',
    location: dto.location ?? '',
    vision: dto.vision ?? '',
    contactEmail: dto.email ?? '',
    description: dto.description ?? '',
    isActive: dto.isActive !== false,
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.updatedAt ?? null,
  }
}

export function toCreateCompanyPayload(profile) {
  const localId = trimOrEmpty(profile.id)
  return {
    name: trimOrEmpty(profile.companyName),
    slug: trimOrEmpty(profile.slug) || undefined,
    email: normalizeEmail(profile.contactEmail) || undefined,
    logoUrl: trimOrEmpty(profile.logoUrl) || undefined,
    industry: trimOrEmpty(profile.industry) || undefined,
    location: trimOrEmpty(profile.location) || undefined,
    vision: trimOrEmpty(profile.vision) || undefined,
    description: trimOrEmpty(profile.description) || undefined,
    legacyLocalId: localId.startsWith('company-') ? localId : trimOrEmpty(profile.legacyLocalId) || undefined,
  }
}

export function toUpdateCompanyPayload(profile) {
  return {
    ...toCreateCompanyPayload(profile),
    isActive: profile.isActive !== false,
  }
}

export async function fetchCompanies(email) {
  const { data } = await apiClient.get('/Companies', {
    params: email ? { email: normalizeEmail(email) } : undefined,
  })
  return (data ?? []).map(mapCompanyDtoToProfile)
}

export async function fetchCompany(id) {
  const { data } = await apiClient.get(`/Companies/${encodeURIComponent(id)}`)
  return data ? mapCompanyDtoToProfile(data) : null
}

export async function createCompany(payload) {
  const { data } = await apiClient.post('/Companies', payload)
  return mapCompanyDtoToProfile(data)
}

export async function updateCompany(apiId, payload) {
  const { data } = await apiClient.put(`/Companies/${encodeURIComponent(apiId)}`, payload)
  return mapCompanyDtoToProfile(data)
}

export async function deleteCompany(apiId) {
  await apiClient.delete(`/Companies/${encodeURIComponent(apiId)}`)
}

// ── Company Trainers ──────────────────────────────────────────────────────

export function mapCompanyTrainerDtoToEntry(dto) {
  return {
    id: entryId(dto),
    apiId: dto.id,
    legacyLocalId: dto.legacyLocalId ?? null,
    companyEmail: dto.companyEmail ?? '',
    fullName: dto.fullName ?? '',
    email: normalizeEmail(dto.email) || '',
    companyPosition: dto.companyPosition ?? '',
    linkedTrackTitles: Array.isArray(dto.linkedTrackTitles) ? dto.linkedTrackTitles : [],
    createdAt: dto.createdAt ?? new Date().toISOString(),
  }
}

export function toCompanyTrainerPayload(entry) {
  const password = trimOrEmpty(entry.password)
  return {
    companyId: entry.companyId || undefined,
    companyEmail: normalizeEmail(entry.companyEmail),
    fullName: trimOrEmpty(entry.fullName),
    email: normalizeEmail(entry.email),
    password: password || undefined,
    companyPosition: trimOrEmpty(entry.companyPosition) || undefined,
    legacyLocalId: trimOrEmpty(entry.legacyLocalId) || (String(entry.id ?? '').startsWith('co-tr-') ? entry.id : undefined),
    linkedTrackTitles: entry.linkedTrackTitles ?? [],
  }
}

export async function fetchCompanyTrainers({ companyId, companyEmail } = {}) {
  const { data } = await apiClient.get('/CompanyTrainers', {
    params: {
      companyId: companyId || undefined,
      companyEmail: companyEmail ? normalizeEmail(companyEmail) : undefined,
    },
  })
  return (data ?? []).map(mapCompanyTrainerDtoToEntry)
}

export async function createCompanyTrainer(payload) {
  const { data } = await apiClient.post('/CompanyTrainers', payload)
  return mapCompanyTrainerDtoToEntry(data)
}

export async function updateCompanyTrainer(apiId, payload) {
  const { data } = await apiClient.put(`/CompanyTrainers/${encodeURIComponent(apiId)}`, payload)
  return mapCompanyTrainerDtoToEntry(data)
}

export async function deleteCompanyTrainer(apiId) {
  await apiClient.delete(`/CompanyTrainers/${encodeURIComponent(apiId)}`)
}

// ── Track Requests ────────────────────────────────────────────────────────

export function mapTrackRequestDtoToEntry(dto) {
  return {
    id: entryId(dto),
    apiId: dto.id,
    legacyLocalId: dto.legacyLocalId ?? null,
    companyId: dto.companyId ?? null,
    companyEmail: dto.companyEmail ?? '',
    title: dto.title ?? '',
    description: dto.description ?? '',
    requestedBy: dto.requestedBy ?? '',
    requestedByEmail: normalizeEmail(dto.requestedByEmail) || '',
    branchId: dto.branchId ?? 'cairo',
    status: dto.status ?? 'PENDING',
    approvedTrackId: dto.approvedTrackId ?? '',
    reviewedAt: fromDateTime(dto.reviewedAt),
    reviewedBy: dto.reviewedBy ?? '',
    createdAt: fromDateTime(dto.createdAt) ?? Date.now(),
  }
}

export function toTrackRequestPayload(entry) {
  return {
    companyId: entry.companyId || undefined,
    companyEmail: normalizeEmail(entry.companyEmail || entry.requestedByEmail) || undefined,
    branchId: trimOrEmpty(entry.branchId) || 'cairo',
    title: trimOrEmpty(entry.title),
    description: trimOrEmpty(entry.description) || undefined,
    requestedBy: trimOrEmpty(entry.requestedBy) || undefined,
    requestedByEmail: normalizeEmail(entry.requestedByEmail) || undefined,
    legacyLocalId: trimOrEmpty(entry.legacyLocalId) || (String(entry.id ?? '').startsWith('ctr-') ? entry.id : undefined),
  }
}

export function toTrackRequestUpdatePayload(entry) {
  return {
    ...toTrackRequestPayload(entry),
    status: trimOrEmpty(entry.status) || 'PENDING',
    approvedTrackId: trimOrEmpty(entry.approvedTrackId) || undefined,
    reviewedAt: toIsoDateTime(entry.reviewedAt),
    reviewedBy: trimOrEmpty(entry.reviewedBy) || undefined,
  }
}

export async function fetchCompanyTrackRequests({ companyId, companyEmail, branchId } = {}) {
  const { data } = await apiClient.get('/CompanyTrackRequests', {
    params: {
      companyId: companyId || undefined,
      companyEmail: companyEmail ? normalizeEmail(companyEmail) : undefined,
      branchId: branchId || undefined,
    },
  })
  return (data ?? []).map(mapTrackRequestDtoToEntry)
}

export async function createCompanyTrackRequest(payload) {
  const { data } = await apiClient.post('/CompanyTrackRequests', payload)
  return mapTrackRequestDtoToEntry(data)
}

export async function updateCompanyTrackRequest(apiId, payload) {
  const { data } = await apiClient.put(`/CompanyTrackRequests/${encodeURIComponent(apiId)}`, payload)
  return mapTrackRequestDtoToEntry(data)
}

export async function deleteCompanyTrackRequest(apiId) {
  await apiClient.delete(`/CompanyTrackRequests/${encodeURIComponent(apiId)}`)
}

// ── Training Requests ─────────────────────────────────────────────────────

export function mapTrainingRequestDtoToEntry(dto) {
  return {
    id: entryId(dto),
    apiId: dto.id,
    legacyLocalId: dto.legacyLocalId ?? null,
    companyId: dto.companyId ?? null,
    companyEmail: dto.companyEmail ?? '',
    title: dto.title ?? '',
    body: dto.body ?? '',
    trackRequestId: dto.trackRequestId ?? '',
    trackTitle: dto.trackTitle ?? '',
    trainer: dto.trainerName ?? '',
    trainerEmail: normalizeEmail(dto.trainerEmail) || '',
    date: dto.startDate ?? '',
    seatsTotal: dto.seatsTotal ?? 20,
    status: dto.trainingStatus ?? 'active',
    documentFileName: dto.documentFileName ?? '',
    documentDataUrl: dto.documentDataUrl ?? '',
    requestedBy: dto.requestedBy ?? '',
    requestedByEmail: normalizeEmail(dto.requestedByEmail) || '',
    branchId: dto.branchId ?? 'cairo',
    reviewStatus: dto.reviewStatus ?? 'PENDING',
    reviewedAt: fromDateTime(dto.reviewedAt),
    reviewedBy: dto.reviewedBy ?? '',
    publishedTrainingId: dto.publishedTrainingId ?? '',
    createdAt: fromDateTime(dto.createdAt) ?? Date.now(),
  }
}

export function toTrainingRequestPayload(entry) {
  return {
    companyId: entry.companyId || undefined,
    companyEmail: normalizeEmail(entry.companyEmail || entry.requestedByEmail) || undefined,
    branchId: trimOrEmpty(entry.branchId) || 'cairo',
    title: trimOrEmpty(entry.title),
    body: trimOrEmpty(entry.body) || undefined,
    trackRequestId: trimOrEmpty(entry.trackRequestId) || undefined,
    trackTitle: trimOrEmpty(entry.trackTitle) || undefined,
    trainerName: trimOrEmpty(entry.trainer),
    trainerEmail: normalizeEmail(entry.trainerEmail) || undefined,
    startDate: trimOrEmpty(entry.date) || undefined,
    seatsTotal: Math.max(1, Number.parseInt(String(entry.seatsTotal ?? '20'), 10) || 20),
    trainingStatus: String(entry.status ?? '').toLowerCase() === 'upcoming' ? 'upcoming' : 'active',
    documentFileName: trimOrEmpty(entry.documentFileName) || undefined,
    documentDataUrl: trimOrEmpty(entry.documentDataUrl) || undefined,
    requestedBy: trimOrEmpty(entry.requestedBy) || undefined,
    requestedByEmail: normalizeEmail(entry.requestedByEmail) || undefined,
    legacyLocalId:
      trimOrEmpty(entry.legacyLocalId) || (String(entry.id ?? '').startsWith('ctrn-') ? entry.id : undefined),
  }
}

export function toTrainingRequestUpdatePayload(entry) {
  return {
    ...toTrainingRequestPayload(entry),
    reviewStatus: trimOrEmpty(entry.reviewStatus) || 'PENDING',
    reviewedAt: toIsoDateTime(entry.reviewedAt),
    reviewedBy: trimOrEmpty(entry.reviewedBy) || undefined,
    publishedTrainingId: trimOrEmpty(entry.publishedTrainingId) || undefined,
  }
}

export async function fetchCompanyTrainingRequests({ companyId, companyEmail, branchId } = {}) {
  const { data } = await apiClient.get('/CompanyTrainingRequests', {
    params: {
      companyId: companyId || undefined,
      companyEmail: companyEmail ? normalizeEmail(companyEmail) : undefined,
      branchId: branchId || undefined,
    },
  })
  return (data ?? []).map(mapTrainingRequestDtoToEntry)
}

function mapCompanyEnrolledStudentDto(dto) {
  const status = String(dto.status ?? '').toLowerCase()
  const statusLabel =
    status === 'approved' ? 'Approved' : status === 'rejected' ? 'Not approved' : 'Pending review'
  const statusTone = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending'

  return {
    id: dto.id,
    userId: dto.userId ?? '',
    name: dto.name ?? 'Student',
    email: normalizeEmail(dto.email) || '',
    trainingTitle: dto.trainingTitle ?? 'Training program',
    trainingId: dto.trainingId ?? dto.courseId ?? '',
    branchId: dto.branchId ?? 'cairo',
    courseId: dto.courseId ?? dto.trainingId ?? '',
    trainerName: dto.trainerName ?? '',
    trainerEmail: normalizeEmail(dto.trainerEmail) || '',
    enrolledAt: dto.enrolledAt ?? null,
    onboarding: status || 'pending',
    statusLabel,
    statusTone,
  }
}

export async function fetchCompanyEnrolledStudents({ companyId, companyEmail } = {}) {
  const { data } = await apiClient.get('/CompanyTrainingRequests/enrolled-students', {
    params: {
      companyId: companyId || undefined,
      companyEmail: companyEmail ? normalizeEmail(companyEmail) : undefined,
    },
  })
  return (data ?? []).map(mapCompanyEnrolledStudentDto)
}

export async function createCompanyTrainingRequest(payload) {
  const { data } = await apiClient.post('/CompanyTrainingRequests', payload)
  return mapTrainingRequestDtoToEntry(data)
}

export async function updateCompanyTrainingRequest(apiId, payload) {
  const { data } = await apiClient.put(`/CompanyTrainingRequests/${encodeURIComponent(apiId)}`, payload)
  return mapTrainingRequestDtoToEntry(data)
}

export async function deleteCompanyTrainingRequest(apiId) {
  await apiClient.delete(`/CompanyTrainingRequests/${encodeURIComponent(apiId)}`)
}

// ── Post Requests ─────────────────────────────────────────────────────────

export function mapPostRequestDtoToEntry(dto) {
  return {
    id: entryId(dto),
    apiId: dto.id,
    legacyLocalId: dto.legacyLocalId ?? null,
    companyId: dto.companyId ?? null,
    companyEmail: dto.companyEmail ?? '',
    title: dto.title ?? '',
    body: dto.body ?? '',
    trainingTitle: dto.trainingTitle ?? '',
    companyTrainingRequestId: dto.companyTrainingRequestId ?? '',
    skillsRaw: dto.skillsRaw ?? '',
    deadline: dto.deadline ?? '',
    requestedBy: dto.requestedBy ?? '',
    requestedByEmail: normalizeEmail(dto.requestedByEmail) || '',
    branchId: dto.branchId ?? 'cairo',
    reviewStatus: dto.reviewStatus ?? 'PENDING',
    reviewedAt: fromDateTime(dto.reviewedAt),
    reviewedBy: dto.reviewedBy ?? '',
    createdAt: fromDateTime(dto.createdAt) ?? Date.now(),
  }
}

export function toPostRequestPayload(entry) {
  return {
    companyId: entry.companyId || undefined,
    companyEmail: normalizeEmail(entry.companyEmail || entry.requestedByEmail) || undefined,
    branchId: trimOrEmpty(entry.branchId) || 'cairo',
    title: trimOrEmpty(entry.title),
    body: trimOrEmpty(entry.body) || undefined,
    trainingTitle: trimOrEmpty(entry.trainingTitle) || undefined,
    companyTrainingRequestId: trimOrEmpty(entry.companyTrainingRequestId) || undefined,
    skillsRaw: trimOrEmpty(entry.skillsRaw) || undefined,
    deadline: trimOrEmpty(entry.deadline) || undefined,
    requestedBy: trimOrEmpty(entry.requestedBy) || undefined,
    requestedByEmail: normalizeEmail(entry.requestedByEmail) || undefined,
    legacyLocalId:
      trimOrEmpty(entry.legacyLocalId) || (String(entry.id ?? '').startsWith('cpos-') ? entry.id : undefined),
  }
}

export function toPostRequestUpdatePayload(entry) {
  return {
    ...toPostRequestPayload(entry),
    reviewStatus: trimOrEmpty(entry.reviewStatus) || 'PENDING',
    reviewedAt: toIsoDateTime(entry.reviewedAt),
    reviewedBy: trimOrEmpty(entry.reviewedBy) || undefined,
  }
}

export async function fetchCompanyPostRequests({ companyId, companyEmail, branchId } = {}) {
  const { data } = await apiClient.get('/CompanyPostRequests', {
    params: {
      companyId: companyId || undefined,
      companyEmail: companyEmail ? normalizeEmail(companyEmail) : undefined,
      branchId: branchId || undefined,
    },
  })
  return (data ?? []).map(mapPostRequestDtoToEntry)
}

export async function createCompanyPostRequest(payload) {
  const { data } = await apiClient.post('/CompanyPostRequests', payload)
  return mapPostRequestDtoToEntry(data)
}

export async function updateCompanyPostRequest(apiId, payload) {
  const { data } = await apiClient.put(`/CompanyPostRequests/${encodeURIComponent(apiId)}`, payload)
  return mapPostRequestDtoToEntry(data)
}

export async function deleteCompanyPostRequest(apiId) {
  await apiClient.delete(`/CompanyPostRequests/${encodeURIComponent(apiId)}`)
}

// ── Selected Tracks ───────────────────────────────────────────────────────

export function mapSelectedTrackDtoToEntry(dto) {
  return {
    id: dto.id,
    apiId: dto.id,
    companyId: dto.companyId ?? null,
    companyEmail: dto.companyEmail ?? '',
    trackValue: dto.trackValue ?? '',
    title: dto.title ?? '',
    addedAt: fromDateTime(dto.addedAt) ?? Date.now(),
  }
}

export function toSelectedTrackPayload(entry) {
  return {
    companyId: entry.companyId || undefined,
    companyEmail: normalizeEmail(entry.companyEmail),
    trackValue: trimOrEmpty(entry.trackValue),
    title: trimOrEmpty(entry.title) || undefined,
  }
}

export async function fetchCompanySelectedTracks({ companyId, companyEmail } = {}) {
  const { data } = await apiClient.get('/CompanySelectedTracks', {
    params: {
      companyId: companyId || undefined,
      companyEmail: companyEmail ? normalizeEmail(companyEmail) : undefined,
    },
  })
  return (data ?? []).map(mapSelectedTrackDtoToEntry)
}

export async function createCompanySelectedTrack(payload) {
  const { data } = await apiClient.post('/CompanySelectedTracks', payload)
  return mapSelectedTrackDtoToEntry(data)
}

export async function updateCompanySelectedTrack(apiId, payload) {
  const { data } = await apiClient.put(`/CompanySelectedTracks/${encodeURIComponent(apiId)}`, payload)
  return mapSelectedTrackDtoToEntry(data)
}

export async function deleteCompanySelectedTrack(apiId) {
  await apiClient.delete(`/CompanySelectedTracks/${encodeURIComponent(apiId)}`)
}
