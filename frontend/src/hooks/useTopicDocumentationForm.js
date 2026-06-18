import { useCallback, useMemo, useState } from 'react'
import {
  createEmptyTopicDraft,
  createEmptyTopicSections,
} from '../components/trainer/topicDocumentation/constants.js'
import {
  formatTopicFileSize,
  isVideoMime,
  readFileAsDataUrl,
  TOPIC_MAX_ATTACHMENT_BYTES,
  TOPIC_MAX_VIDEO_BYTES,
} from '../utils/topicFileUtils.js'
import { isTopicVideoUrlValid } from '../utils/topicVideo.js'

async function attachmentFromFile(file) {
  if (file.size > TOPIC_MAX_ATTACHMENT_BYTES) {
    throw new Error(`File is too large. Maximum size is ${formatTopicFileSize(TOPIC_MAX_ATTACHMENT_BYTES)}.`)
  }
  const dataUrl = await readFileAsDataUrl(file)
  const isVideo = isVideoMime(file.type, file.name)
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    kind: isVideo ? 'video' : 'document',
    dataUrl,
    addedAt: new Date().toISOString(),
  }
}

function normalizeDraft(entry) {
  if (!entry) return createEmptyTopicDraft()
  return {
    title: entry.title ?? '',
    explanation: entry.explanation ?? '',
    videoUrl: entry.videoUrl ?? '',
    videoCaption: entry.videoCaption ?? '',
    videoSource: entry.videoSource ?? (entry.videoUrl?.startsWith('data:') ? 'upload' : ''),
    videoFileName: entry.videoFileName ?? '',
    videoFileSize: entry.videoFileSize ?? 0,
    videoAllowDownload: entry.videoAllowDownload !== false,
    sections: { ...createEmptyTopicSections(), ...(entry.sections ?? {}) },
    attachments: Array.isArray(entry.attachments) ? [...entry.attachments] : [],
  }
}

/**
 * Form state for programming topic documentation (controlled draft + validation).
 */
export function useTopicDocumentationForm(initial = null) {
  const seed = useMemo(() => normalizeDraft(initial), [initial])

  const [draft, setDraft] = useState(seed)
  const [errors, setErrors] = useState({})
  const [fileBusy, setFileBusy] = useState(false)
  const [fileError, setFileError] = useState('')

  const setField = useCallback((name, value) => {
    setDraft((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const setSection = useCallback((sectionId, value) => {
    setDraft((prev) => ({
      ...prev,
      sections: { ...prev.sections, [sectionId]: value },
    }))
  }, [])

  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return
    setFileBusy(true)
    setFileError('')
    try {
      const next = []
      for (const file of files) {
        next.push(await attachmentFromFile(file))
      }
      setDraft((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...next],
      }))
    } catch (err) {
      setFileError(err?.message || 'Unable to upload file.')
    } finally {
      setFileBusy(false)
    }
  }, [])

  const replaceFile = useCallback(async (attachmentId, file) => {
    if (!file) return
    setFileBusy(true)
    setFileError('')
    try {
      const row = await attachmentFromFile(file)
      setDraft((prev) => ({
        ...prev,
        attachments: prev.attachments.map((item) => (item.id === attachmentId ? row : item)),
      }))
    } catch (err) {
      setFileError(err?.message || 'Unable to replace file.')
    } finally {
      setFileBusy(false)
    }
  }, [])

  const removeFile = useCallback((attachmentId) => {
    setDraft((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((item) => item.id !== attachmentId),
    }))
  }, [])

  const setVideoFromFile = useCallback(async (file) => {
    if (!file) return
    setFileError('')
    if (!isVideoMime(file.type, file.name)) {
      setFileError('Choose a video file (MP4, WebM, MOV).')
      return
    }
    if (file.size > TOPIC_MAX_VIDEO_BYTES) {
      setFileError(`Video exceeds the ${formatTopicFileSize(TOPIC_MAX_VIDEO_BYTES)} limit.`)
      return
    }
    setFileBusy(true)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setDraft((prev) => ({
        ...prev,
        videoUrl: dataUrl,
        videoSource: 'upload',
        videoFileName: file.name,
        videoFileSize: file.size,
        videoAllowDownload: true,
      }))
      setErrors((prev) => {
        if (!prev.videoUrl) return prev
        const next = { ...prev }
        delete next.videoUrl
        return next
      })
    } catch {
      setFileError('Unable to read the video file.')
    } finally {
      setFileBusy(false)
    }
  }, [])

  const clearVideo = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      videoUrl: '',
      videoCaption: prev.videoCaption,
      videoSource: '',
      videoFileName: '',
      videoFileSize: 0,
    }))
  }, [])

  const setVideoLink = useCallback((url) => {
    setDraft((prev) => ({
      ...prev,
      videoUrl: url,
      videoSource: url.trim() ? 'link' : '',
      videoFileName: '',
      videoFileSize: 0,
    }))
  }, [])

  const reset = useCallback(() => {
    setDraft(createEmptyTopicDraft())
    setErrors({})
    setFileError('')
  }, [])

  const load = useCallback((entry) => {
    setDraft(normalizeDraft(entry))
    setErrors({})
    setFileError('')
  }, [])

  const validate = useCallback(() => {
    const next = {}
    if (!draft.title.trim()) next.title = 'Topic title is required.'
    if (!draft.explanation.trim()) next.explanation = 'Overview / explanation is required.'
    const video = String(draft.videoUrl ?? '').trim()
    if (video && !isTopicVideoUrlValid(video)) {
      next.videoUrl =
        'Fix the video link or upload a file — remove incomplete URLs (e.g. empty YouTube links).'
    }
    setErrors(next)
    const valid = Object.keys(next).length === 0
    return { valid, errors: next }
  }, [draft.explanation, draft.title, draft.videoUrl])

  return {
    draft,
    errors,
    fileBusy,
    fileError,
    setField,
    setSection,
    addFiles,
    replaceFile,
    removeFile,
    setVideoFromFile,
    clearVideo,
    setVideoLink,
    reset,
    load,
    validate,
  }
}
