/** Parse common video URLs into embeddable sources. */
export function parseTopicVideoUrl(rawUrl) {
  const url = String(rawUrl ?? '').trim()
  if (!url) return { valid: false, kind: 'none', embedUrl: '', watchUrl: '', label: '' }

  if (url.startsWith('data:video/') || url.startsWith('blob:')) {
    return {
      valid: true,
      kind: 'upload',
      embedUrl: url,
      watchUrl: url,
      label: 'Uploaded video',
    }
  }

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase()

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0]
      if (id) {
        return {
          valid: true,
          kind: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${id}`,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
          label: 'YouTube',
        }
      }
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = parsed.searchParams.get('v')
      if (id) {
        return {
          valid: true,
          kind: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${id}`,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
          label: 'YouTube',
        }
      }
      const shorts = parsed.pathname.match(/^\/shorts\/([^/]+)/)
      if (shorts?.[1]) {
        return {
          valid: true,
          kind: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${shorts[1]}`,
          watchUrl: `https://www.youtube.com/watch?v=${shorts[1]}`,
          label: 'YouTube Short',
        }
      }
    }

    if (host === 'vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      if (id && /^\d+$/.test(id)) {
        return {
          valid: true,
          kind: 'vimeo',
          embedUrl: `https://player.vimeo.com/video/${id}`,
          watchUrl: url,
          label: 'Vimeo',
        }
      }
    }

    if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(parsed.pathname)) {
      return { valid: true, kind: 'file', embedUrl: url, watchUrl: url, label: 'Video file' }
    }
  } catch {
    return { valid: false, kind: 'invalid', embedUrl: '', watchUrl: '', label: '' }
  }

  return { valid: false, kind: 'invalid', embedUrl: '', watchUrl: '', label: '' }
}

export function isTopicVideoUrlValid(rawUrl) {
  const url = String(rawUrl ?? '').trim()
  if (!url) return true
  return parseTopicVideoUrl(url).valid
}

export function canDownloadTopicVideo(topic) {
  if (!topic?.videoUrl || !parseTopicVideoUrl(topic.videoUrl).valid) return false
  if (topic.videoAllowDownload === false) return false
  if (topic.videoSource === 'upload' || topic.videoUrl.startsWith('data:video/')) return true
  return Boolean(topic.videoFileName && topic.videoUrl.startsWith('data:'))
}
