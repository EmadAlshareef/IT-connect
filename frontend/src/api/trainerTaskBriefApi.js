import { apiClient } from './authApi.js'

function trimOrEmpty(value) {
  return String(value ?? '').trim()
}

function normalizeEmail(value) {
  return trimOrEmpty(value).toLowerCase()
}

function toIso(value) {
  if (value == null || value === '') return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

export function mapTrainerTaskBriefDto(dto) {
  if (!dto) return null
  const legacyId = trimOrEmpty(dto.legacyLocalId)
  const apiId = trimOrEmpty(dto.id)
  return {
    id: legacyId || apiId,
    apiId,
    legacyLocalId: legacyId || null,
    requestedByEmail: normalizeEmail(dto.requestedByEmail),
    trainerName: dto.trainerName ?? '',
    sessionId: dto.sessionId ?? '',
    sessionTitle: dto.sessionTitle ?? '',
    title: dto.title ?? '',
    description: dto.description ?? '',
    deadline: dto.deadline ?? '',
    attachmentName: dto.attachmentName ?? '',
    attachmentDataUrl: dto.attachmentDataUrl ?? '',
    branchId: dto.branchId ?? '',
    courseId: dto.courseId ?? '',
    courseTitle: dto.courseTitle ?? '',
    status: (dto.status ?? 'pending').toLowerCase(),
    reviewedAt: toIso(dto.reviewedAt),
    publishedAt: toIso(dto.publishedAt),
    createdAt: toIso(dto.createdAt),
    updatedAt: toIso(dto.updatedAt),
  }
}

export async function fetchTrainerTaskBriefs(params = {}) {
  const { data } = await apiClient.get('/TrainerTaskBriefs', { params })
  const rows = Array.isArray(data) ? data : []
  return rows.map(mapTrainerTaskBriefDto).filter(Boolean)
}

export async function createTrainerTaskBrief(payload) {
  const { data } = await apiClient.post('/TrainerTaskBriefs', {
    requestedByEmail: normalizeEmail(payload.requestedByEmail),
    trainerName: trimOrEmpty(payload.trainerName) || null,
    sessionId: trimOrEmpty(payload.sessionId),
    sessionTitle: trimOrEmpty(payload.sessionTitle) || null,
    title: trimOrEmpty(payload.title),
    description: trimOrEmpty(payload.description),
    deadline: trimOrEmpty(payload.deadline) || null,
    attachmentName: trimOrEmpty(payload.attachmentName) || null,
    attachmentDataUrl: trimOrEmpty(payload.attachmentDataUrl) || null,
    branchId: trimOrEmpty(payload.branchId) || null,
    courseId: trimOrEmpty(payload.courseId) || null,
    courseTitle: trimOrEmpty(payload.courseTitle) || null,
    status: (payload.status ?? 'approved').toLowerCase(),
    reviewedAt: payload.reviewedAt ?? null,
    publishedAt: payload.publishedAt ?? null,
    legacyLocalId: trimOrEmpty(payload.id) || trimOrEmpty(payload.legacyLocalId) || null,
  })
  return mapTrainerTaskBriefDto(data)
}

export async function updateTrainerTaskBriefApi(id, payload) {
  const { data } = await apiClient.put(`/TrainerTaskBriefs/${encodeURIComponent(id)}`, {
    sessionId: trimOrEmpty(payload.sessionId) || null,
    sessionTitle: trimOrEmpty(payload.sessionTitle) || null,
    title: trimOrEmpty(payload.title),
    description: trimOrEmpty(payload.description),
    deadline: trimOrEmpty(payload.deadline) || null,
    attachmentName: trimOrEmpty(payload.attachmentName) || null,
    attachmentDataUrl: trimOrEmpty(payload.attachmentDataUrl) || null,
    branchId: trimOrEmpty(payload.branchId) || null,
    courseId: trimOrEmpty(payload.courseId) || null,
    courseTitle: trimOrEmpty(payload.courseTitle) || null,
    status: payload.status ? String(payload.status).toLowerCase() : null,
    reviewedAt: payload.reviewedAt ?? null,
    publishedAt: payload.publishedAt ?? null,
  })
  return mapTrainerTaskBriefDto(data)
}

export async function deleteTrainerTaskBriefApi(id) {
  await apiClient.delete(`/TrainerTaskBriefs/${encodeURIComponent(id)}`)
}
