export const TOPIC_MAX_VIDEO_BYTES = 50 * 1024 * 1024
export const TOPIC_MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

export function formatTopicFileSize(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isVideoMime(type, name = '') {
  const mime = String(type ?? '').toLowerCase()
  if (mime.startsWith('video/')) return true
  const lower = String(name ?? '').toLowerCase()
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(lower)
}

export function isDocumentMime(type, name = '') {
  return !isVideoMime(type, name)
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('تعذّر قراءة الملف.'))
    reader.readAsDataURL(file)
  })
}

/** Trigger browser download from stored data URL or external link. */
export function downloadTopicFile(file) {
  const href = file?.dataUrl || file?.url || ''
  if (!href) return false
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = file?.name || 'download'
  if (href.startsWith('http')) {
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
  }
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  return true
}

export function attachmentIconKind(file) {
  if (file?.kind === 'video' || isVideoMime(file?.type, file?.name)) return 'video'
  const name = String(file?.name ?? '').toLowerCase()
  if (name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.zip')) return 'archive'
  return 'document'
}
