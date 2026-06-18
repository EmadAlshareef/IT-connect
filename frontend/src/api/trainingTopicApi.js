import { apiClient, canUseProtectedApi, readStoredAuthToken } from './authApi.js'

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

export function mapTrainingTopicDto(dto) {
  if (!dto) return null
  const legacyId = trimOrEmpty(dto.legacyLocalId)
  const apiId = trimOrEmpty(dto.id)
  const videoUrl = trimOrEmpty(dto.videoUrl)
  return {
    id: legacyId || apiId,
    apiId,
    legacyLocalId: legacyId || null,
    trainerKey: normalizeEmail(dto.trainerKey),
    trainingId: trimOrEmpty(dto.trainingId),
    trainingTitle: dto.trainingTitle ?? '',
    title: dto.title ?? '',
    explanation: dto.explanation ?? '',
    status: (dto.status ?? 'draft').toLowerCase(),
    contentKey: dto.contentKey ?? '',
    videoUrl,
    videoCaption: dto.videoCaption ?? '',
    videoSource: dto.videoSource ?? '',
    videoFileName: dto.videoFileName ?? '',
    videoFileSize: Number(dto.videoFileSize) || 0,
    videoBlobUrl: dto.videoBlobUrl ?? '',
    videoAllowDownload: dto.videoAllowDownload !== false,
    hasVideo: Boolean(videoUrl),
    hasVideoBlob: false,
    sections: dto.sections && typeof dto.sections === 'object' ? { ...dto.sections } : {},
    attachments: Array.isArray(dto.attachments) ? dto.attachments.map((file) => ({ ...file })) : [],
    enrolledStudentIds: Array.isArray(dto.enrolledStudentIds) ? [...dto.enrolledStudentIds] : [],
    enrolledCount: Number(dto.enrolledCount) || 0,
    branchId: dto.branchId ?? '',
    courseId: dto.courseId ?? '',
    publishedAt: toIso(dto.publishedAt),
    createdAt: toIso(dto.createdAt),
    updatedAt: toIso(dto.updatedAt),
  }
}

export async function fetchTrainingTopics(params = {}) {
  if (!canUseProtectedApi(readStoredAuthToken())) return []
  const { data } = await apiClient.get('/TrainingTopics', { params })
  const rows = Array.isArray(data) ? data : []
  return rows.map(mapTrainingTopicDto).filter(Boolean)
}

export async function fetchTrainingTopic(id) {
  if (!canUseProtectedApi(readStoredAuthToken())) return null
  const { data } = await apiClient.get(`/TrainingTopics/${encodeURIComponent(id)}`)
  return mapTrainingTopicDto(data)
}

export async function upsertTrainingTopic(payload) {
  if (!canUseProtectedApi(readStoredAuthToken())) {
    throw new Error('Sign in with an API session before saving topics.')
  }
  const { data } = await apiClient.post('/TrainingTopics', {
    id: trimOrEmpty(payload.apiId) || trimOrEmpty(payload.id) || null,
    trainerKey: normalizeEmail(payload.trainerKey),
    trainingId: trimOrEmpty(payload.trainingId),
    trainingTitle: trimOrEmpty(payload.trainingTitle) || null,
    title: trimOrEmpty(payload.title),
    explanation: trimOrEmpty(payload.explanation),
    status: (payload.status ?? 'draft').toLowerCase(),
    contentKey: trimOrEmpty(payload.contentKey) || null,
    videoUrl: trimOrEmpty(payload.videoUrl) || null,
    videoCaption: trimOrEmpty(payload.videoCaption) || null,
    videoSource: trimOrEmpty(payload.videoSource) || null,
    videoFileName: trimOrEmpty(payload.videoFileName) || null,
    videoFileSize: Number(payload.videoFileSize) || 0,
    videoBlobUrl: trimOrEmpty(payload.videoBlobUrl) || null,
    videoAllowDownload: payload.videoAllowDownload !== false,
    sections: payload.sections ?? {},
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
    enrolledStudentIds: Array.isArray(payload.enrolledStudentIds) ? payload.enrolledStudentIds : [],
    enrolledCount: Number(payload.enrolledCount) || 0,
    branchId: trimOrEmpty(payload.branchId) || null,
    courseId: trimOrEmpty(payload.courseId) || null,
    publishedAt: payload.publishedAt ?? null,
    createdAt: payload.createdAt ?? null,
    legacyLocalId: trimOrEmpty(payload.id) || trimOrEmpty(payload.legacyLocalId) || null,
  })
  return mapTrainingTopicDto(data)
}

export async function deleteTrainingTopicApi(id) {
  if (!canUseProtectedApi(readStoredAuthToken())) {
    throw new Error('Sign in with an API session before deleting topics.')
  }
  await apiClient.delete(`/TrainingTopics/${encodeURIComponent(id)}`)
}

export async function uploadTopicMediaFile(file) {
  if (!canUseProtectedApi(readStoredAuthToken())) {
    throw new Error('Sign in with an API session before uploading topic media.')
  }
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post('/TrainingTopics/media', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
