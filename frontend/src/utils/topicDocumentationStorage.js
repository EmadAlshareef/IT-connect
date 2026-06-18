import {
  deleteTrainingTopicApi,
  fetchTrainingTopic,
  fetchTrainingTopics,
  uploadTopicMediaFile,
  upsertTrainingTopic,
} from '../api/trainingTopicApi.js'
import { getTopicBlob } from './topicBlobStorage.js'
import { deleteTopicMedia, prepareTopicForPersistence } from './topicPersistence.js'

/** @deprecated localStorage keys kept for one-time migration only */
const LEGACY_STORAGE_KEY = 'ts-trainer-topic-documentation'
const INDEX_KEY = 'ts-trainer-topic-docs-index-v1'
const recordKey = (id) => `ts-trainer-topic-doc-v1-${id}`

const MAX_LEGACY_PARSE_BYTES = 1_500_000
const MAX_API_DATA_URL_BYTES = 512 * 1024

let snapshot = []
let bootstrapPromise = null
let bootstrapEmail = ''
let studentBootstrapPromise = null

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function resolveApiId(row) {
  return row?.apiId || row?.id || ''
}

function dispatchStorageEvents() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('trainer-topic-docs-updated'))
  window.dispatchEvent(new CustomEvent('ts-published-topics-changed'))
}

function toIndexEntry(row) {
  const video = String(row.videoUrl ?? '')
  return {
    id: row.id,
    trainerKey: row.trainerKey,
    trainingId: row.trainingId,
    trainingTitle: row.trainingTitle,
    title: row.title,
    explanationPreview: String(row.explanation ?? '').slice(0, 280),
    explanation: row.explanation,
    status: row.status,
    contentKey: row.contentKey,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    enrolledCount: row.enrolledCount,
    hasVideo: Boolean(row.videoBlobKey || row.hasVideo || video),
    hasVideoBlob: Boolean(row.videoBlobKey),
    attachmentCount: Array.isArray(row.attachments) ? row.attachments.length : 0,
    videoCaption: row.videoCaption,
    enrolledStudentIds: row.enrolledStudentIds,
    sections: row.sections,
    attachments: row.attachments,
    videoUrl: row.videoUrl,
    videoSource: row.videoSource,
    videoFileName: row.videoFileName,
    videoFileSize: row.videoFileSize,
    videoAllowDownload: row.videoAllowDownload,
  }
}

function mergeIntoSnapshot(rows) {
  const next = [...snapshot]
  const indexByKey = new Map()
  next.forEach((row, idx) => {
    indexByKey.set(row.id, idx)
    if (row.apiId) indexByKey.set(row.apiId, idx)
    if (row.legacyLocalId) indexByKey.set(row.legacyLocalId, idx)
  })

  for (const row of rows) {
    const keys = [row.id, row.apiId, row.legacyLocalId].filter(Boolean)
    const existingIdx = keys.map((key) => indexByKey.get(key)).find((idx) => idx != null)
    if (existingIdx != null) {
      next[existingIdx] = { ...next[existingIdx], ...row }
      continue
    }
    next.unshift(row)
    keys.forEach((key) => indexByKey.set(key, 0))
  }

  snapshot = next
}

export function setTopicDocsSnapshot(rows) {
  snapshot = Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []
  dispatchStorageEvents()
}

function matchesFilter(row, filter) {
  const trainerKey = (filter.trainerKey ?? '').trim().toLowerCase()
  const trainingId = (filter.trainingId ?? '').trim()
  if (trainerKey && row.trainerKey !== trainerKey) return false
  if (trainingId && row.trainingId !== trainingId) return false
  return true
}

function readLegacyLocalRows() {
  const rows = []

  function readIndexRaw() {
    try {
      const raw = localStorage.getItem(INDEX_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  function readTopicRecord(id) {
    try {
      const raw = localStorage.getItem(recordKey(id))
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  function migrateLegacyMonolith() {
    let raw = ''
    try {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY) ?? ''
    } catch {
      return []
    }
    if (!raw) return []

    if (raw.length > MAX_LEGACY_PARSE_BYTES) {
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      return []
    }

    let legacyRows = []
    try {
      const parsed = JSON.parse(raw)
      legacyRows = Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
    return legacyRows
  }

  const index = readIndexRaw()
  if (index) {
    for (const entry of index) {
      if (!entry?.id) continue
      const full = readTopicRecord(entry.id) ?? entry
      rows.push(full)
    }
    return rows
  }

  return migrateLegacyMonolith()
}

async function resolveInlineUrl(url, blobKey) {
  const direct = String(url ?? '').trim()
  if (direct.startsWith('data:') || direct.startsWith('http')) return direct
  if (!blobKey) return ''
  try {
    const blob = await getTopicBlob(blobKey)
    return String(blob ?? '').trim()
  } catch {
    return ''
  }
}

function trimDataUrlForApi(dataUrl) {
  const value = String(dataUrl ?? '').trim()
  if (!value.startsWith('data:')) return value
  const bytes = Math.ceil((value.length * 3) / 4)
  if (bytes <= MAX_API_DATA_URL_BYTES) return value
  return ''
}

async function dataUrlToFile(dataUrl, fileName = 'topic-media.bin') {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], fileName, { type: blob.type || 'application/octet-stream' })
}

async function uploadLargeDataUrl(dataUrl, fileName) {
  const file = await dataUrlToFile(dataUrl, fileName || 'topic-media.bin')
  const uploaded = await uploadTopicMediaFile(file)
  return uploaded?.url ?? null
}

async function buildApiPayload(entry) {
  const prepared = await prepareTopicForPersistence({
    ...entry,
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  })

  const rawVideo = await resolveInlineUrl(prepared.videoUrl, prepared.videoBlobKey)
  let videoUrl = trimDataUrlForApi(rawVideo)
  let videoBlobUrl = null
  if (!videoUrl && rawVideo.startsWith('data:')) {
    videoBlobUrl = await uploadLargeDataUrl(rawVideo, prepared.videoFileName || 'topic-video.mp4')
  }

  const attachments = await Promise.all(
    (Array.isArray(prepared.attachments) ? prepared.attachments : []).map(async (file) => {
      const dataUrl = trimDataUrlForApi(await resolveInlineUrl(file?.dataUrl, file?.blobKey))
      const { blobKey, legacyInlineStripped, ...rest } = file ?? {}
      return {
        ...rest,
        dataUrl: dataUrl || null,
      }
    }),
  )

  return {
    ...prepared,
    videoUrl,
    videoBlobUrl,
    attachments,
    courseId: prepared.courseId || prepared.trainingId,
  }
}

async function migrateLocalRowsToApi(trainerEmail) {
  const email = normalizeEmail(trainerEmail)
  if (!email) return

  const legacyRows = readLegacyLocalRows()
  if (legacyRows.length === 0) return

  const existing = new Set(
    snapshot.flatMap((row) => [row.id, row.apiId, row.legacyLocalId].filter(Boolean)),
  )

  for (const row of legacyRows) {
    if (normalizeEmail(row.trainerKey) !== email) continue
    const legacyId = String(row.id ?? '').trim()
    if (!legacyId || existing.has(legacyId)) continue

    try {
      const payload = await buildApiPayload({ ...row, trainerKey: email })
      const saved = await upsertTrainingTopic(payload)
      mergeIntoSnapshot([saved])
      existing.add(saved.id)
      if (saved.apiId) existing.add(saved.apiId)
      if (saved.legacyLocalId) existing.add(saved.legacyLocalId)
    } catch {
      mergeIntoSnapshot([{ ...row, trainerKey: email }])
      existing.add(legacyId)
    }
  }

  try {
    const index = readLegacyLocalRows()
    for (const row of index) {
      if (row?.id) localStorage.removeItem(recordKey(row.id))
    }
    localStorage.removeItem(INDEX_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Load trainer topics from SQL (with one-time localStorage migration). */
export async function bootstrapTrainerTopicDocs(trainerEmail = '') {
  const email = normalizeEmail(trainerEmail)
  if (!email) {
    setTopicDocsSnapshot([])
    return []
  }

  if (bootstrapPromise && bootstrapEmail === email) return bootstrapPromise

  bootstrapEmail = email
  bootstrapPromise = (async () => {
    try {
      const rows = await fetchTrainingTopics()
      setTopicDocsSnapshot(rows)
      await migrateLocalRowsToApi(email)
      return snapshot.filter((row) => row.trainerKey === email)
    } catch {
      await migrateLocalRowsToApi(email)
      return snapshot.filter((row) => row.trainerKey === email)
    } finally {
      bootstrapPromise = null
    }
  })()

  return bootstrapPromise
}

/** Load published topics for student portal from SQL. */
export async function bootstrapStudentTopicDocs(params = {}) {
  if (studentBootstrapPromise) return studentBootstrapPromise

  studentBootstrapPromise = (async () => {
    try {
      const rows = await fetchTrainingTopics({ status: 'published', ...params })
      mergeIntoSnapshot(rows)
      dispatchStorageEvents()
      return rows
    } catch {
      return snapshot.filter((row) => row.status === 'published')
    } finally {
      studentBootstrapPromise = null
    }
  })()

  return studentBootstrapPromise
}

/** Lightweight list (safe when opening Topic documentation panel). */
export function listTopicDocumentation(filter = {}) {
  return snapshot.filter((row) => matchesFilter(row, filter)).map((row) => toIndexEntry(row))
}

/** Full topic record for edit / student view. */
export function getTopicDocumentation(id) {
  if (!id) return null
  const key = String(id).trim()
  return (
    snapshot.find(
      (row) => row.id === key || row.apiId === key || row.legacyLocalId === key,
    ) ?? null
  )
}

/** Fetch a single topic from SQL when it is not in the in-memory cache. */
export async function ensureTopicDocumentation(id) {
  const cached = getTopicDocumentation(id)
  if (cached) return cached
  try {
    const row = await fetchTrainingTopic(id)
    if (row) mergeIntoSnapshot([row])
    return row
  } catch {
    return null
  }
}

/** All published topics (metadata only — use getTopicDocumentation for full body). */
export function listAllTopicIndexEntries() {
  return snapshot.map((row) => toIndexEntry(row))
}

export async function upsertTopicDocumentation(entry) {
  try {
    const payload = await buildApiPayload(entry)
    const saved = await upsertTrainingTopic(payload)
    mergeIntoSnapshot([saved])
    dispatchStorageEvents()
    return { record: saved, saved: true }
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || 'Could not save topic.'
    return { record: entry, saved: false, error: message }
  }
}

export async function deleteTopicDocumentation(id) {
  const full = getTopicDocumentation(id)
  if (full) await deleteTopicMedia(full)

  const apiId = resolveApiId(full) || id
  try {
    await deleteTrainingTopicApi(apiId)
  } catch {
    /* still drop from cache */
  }

  const key = String(id).trim()
  snapshot = snapshot.filter(
    (row) => row.id !== key && row.apiId !== key && row.legacyLocalId !== key,
  )
  dispatchStorageEvents()
}

/** Emergency reset if the panel keeps freezing. */
export function clearAllTopicDocumentation() {
  snapshot = []
  try {
    const indexRaw = localStorage.getItem(INDEX_KEY)
    const index = indexRaw ? JSON.parse(indexRaw) : []
    if (Array.isArray(index)) {
      for (const row of index) {
        if (row?.id) localStorage.removeItem(recordKey(row.id))
      }
    }
    localStorage.removeItem(INDEX_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  dispatchStorageEvents()
}
