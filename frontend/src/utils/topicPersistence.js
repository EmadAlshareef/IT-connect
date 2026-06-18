import {
  deleteTopicBlobs,
  estimateDataUrlBytes,
  getTopicBlob,
  putTopicBlob,
} from './topicBlobStorage.js'

const MAX_INLINE_BYTES = 120 * 1024

function videoBlobKey(topicId) {
  return `${topicId}::video`
}

function attachmentBlobKey(topicId, attachmentId) {
  return `${topicId}::att::${attachmentId}`
}

/**
 * Move large data URLs to IndexedDB so localStorage JSON stays small (prevents tab freeze).
 */
export async function prepareTopicForPersistence(entry) {
  const topicId = String(entry?.id ?? '').trim()
  if (!topicId) throw new Error('Topic id is required before saving.')

  const blobKeys = []
  const next = { ...entry }

  const video = String(next.videoUrl ?? '')
  if (video.startsWith('data:') || video.startsWith('blob:')) {
    const size = estimateDataUrlBytes(video)
    if (size > MAX_INLINE_BYTES) {
      const key = videoBlobKey(topicId)
      await putTopicBlob(key, video)
      blobKeys.push(key)
      next.videoBlobKey = key
      next.videoUrl = ''
    }
  }

  if (Array.isArray(next.attachments)) {
    next.attachments = await Promise.all(
      next.attachments.map(async (file) => {
        const dataUrl = String(file?.dataUrl ?? '')
        if (!dataUrl.startsWith('data:') && !dataUrl.startsWith('blob:')) {
          return { ...file }
        }
        const size = estimateDataUrlBytes(dataUrl)
        if (size <= MAX_INLINE_BYTES) {
          return { ...file }
        }
        const key = attachmentBlobKey(topicId, file.id)
        await putTopicBlob(key, dataUrl)
        blobKeys.push(key)
        const { dataUrl: _removed, ...rest } = file
        return { ...rest, blobKey: key }
      }),
    )
  }

  next.mediaBlobKeys = blobKeys
  return next
}

export async function hydrateTopicMedia(topic) {
  if (!topic) return null
  const next = { ...topic }

  if (!next.videoUrl && next.videoBlobUrl) {
    const base = typeof window !== 'undefined' ? window.location.origin.replace(':5173', ':5114').replace(':5174', ':5114') : ''
    next.videoUrl = String(next.videoBlobUrl).startsWith('http')
      ? next.videoBlobUrl
      : `${base}${next.videoBlobUrl}`
  }

  if (!next.videoUrl && next.videoBlobKey) {
    try {
      const blob = await getTopicBlob(next.videoBlobKey)
      if (blob) next.videoUrl = blob
    } catch {
      /* viewer shows without video */
    }
  }

  if (Array.isArray(next.attachments)) {
    next.attachments = await Promise.all(
      next.attachments.map(async (file) => {
        if (file?.dataUrl || !file?.blobKey) return { ...file }
        try {
          const dataUrl = await getTopicBlob(file.blobKey)
          return dataUrl ? { ...file, dataUrl } : { ...file }
        } catch {
          return { ...file }
        }
      }),
    )
  }

  return next
}

export function collectTopicBlobKeys(topic) {
  const keys = new Set()
  if (topic?.videoBlobKey) keys.add(topic.videoBlobKey)
  for (const key of topic?.mediaBlobKeys ?? []) {
    if (key) keys.add(key)
  }
  for (const file of topic?.attachments ?? []) {
    if (file?.blobKey) keys.add(file.blobKey)
  }
  return [...keys]
}

export async function deleteTopicMedia(topic) {
  await deleteTopicBlobs(collectTopicBlobKeys(topic))
}
