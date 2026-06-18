import { useRef, useState } from 'react'
import {
  CloudUpload,
  Film,
  Link2,
  Loader2,
  Play,
  Trash2,
  Video,
} from 'lucide-react'
import { TOPIC_VIDEO_ACCEPT } from './constants.js'
import { formatTopicFileSize } from '../../../utils/topicFileUtils.js'
import { parseTopicVideoUrl } from '../../../utils/topicVideo.js'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950'

function TopicVideoEmbed({ videoUrl, caption }) {
  const parsed = parseTopicVideoUrl(videoUrl)
  if (!parsed.valid) return null

  const useNativePlayer = parsed.kind === 'file' || parsed.kind === 'upload'

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-lg dark:border-slate-700">
      <div className="relative aspect-video w-full">
        {useNativePlayer ? (
          <video src={parsed.embedUrl} controls className="h-full w-full bg-black" playsInline>
            <track kind="captions" />
          </video>
        ) : (
          <iframe
            title={caption || 'Topic lesson video'}
            src={parsed.embedUrl}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      {caption ? (
        <p className="border-t border-slate-800 px-4 py-2 text-xs text-slate-400">{caption}</p>
      ) : null}
    </div>
  )
}

function TopicVideoField({
  videoUrl,
  videoCaption,
  videoSource,
  videoFileName,
  videoFileSize,
  videoAllowDownload,
  onFieldChange,
  onVideoUpload,
  onVideoLinkChange,
  onClearVideo,
  disabled,
  busy = false,
  error,
  fileError = '',
}) {
  const inputRef = useRef(null)
  const [mode, setMode] = useState(() => (videoSource === 'upload' ? 'upload' : 'link'))
  const parsed = parseTopicVideoUrl(videoUrl)
  const hasVideo = parsed.valid
  const isUpload = videoSource === 'upload' || parsed.kind === 'upload'

  return (
    <div className="space-y-4 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-white p-5 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
            <Video className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lesson video</h4>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Upload from your device or paste a YouTube / Vimeo link. Students see it at the top of the lesson.
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-violet-200 dark:bg-slate-900 dark:ring-violet-800">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode('upload')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'upload'
                ? 'bg-violet-600 text-white'
                : 'text-slate-600 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-violet-950/50'
            }`}
          >
            <CloudUpload className="h-3.5 w-3.5" aria-hidden />
            Upload file
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode('link')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'link'
                ? 'bg-violet-600 text-white'
                : 'text-slate-600 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-violet-950/50'
            }`}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            External link
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="space-y-3">
          {isUpload && hasVideo ? (
            <div className="rounded-xl border border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-slate-950/50">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                  <Film className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {videoFileName || 'Uploaded video'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatTopicFileSize(videoFileSize)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onClearVideo?.()
                    if (inputRef.current) inputRef.current.value = ''
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Remove
                </button>
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={videoAllowDownload !== false}
                  disabled={disabled}
                  onChange={(event) => onFieldChange('videoAllowDownload', event.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Allow students to download this lesson video
              </label>
            </div>
          ) : (
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 transition ${
                disabled || busy
                  ? 'cursor-not-allowed border-slate-200 opacity-60'
                  : 'border-violet-300 bg-violet-50/40 hover:border-violet-500 hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-950/20'
              }`}
            >
              {busy ? (
                <Loader2 className="h-10 w-10 animate-spin text-violet-600" aria-hidden />
              ) : (
                <CloudUpload className="h-10 w-10 text-violet-600 dark:text-violet-400" aria-hidden />
              )}
              <span className="mt-3 text-sm font-semibold text-violet-900 dark:text-violet-200">
                {busy ? 'Processing video…' : 'Drag a video here or click to choose'}
              </span>
              <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">MP4, WebM, MOV — up to 50 MB</span>
              <input
                ref={inputRef}
                type="file"
                accept={TOPIC_VIDEO_ACCEPT}
                disabled={disabled || busy}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) onVideoUpload?.(file)
                  event.target.value = ''
                }}
              />
            </label>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Paste a full YouTube or Vimeo watch link below (video is optional).
          </p>
          <div className="space-y-2">
            <label htmlFor="topic-video-url" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              Video URL
            </label>
            <input
              id="topic-video-url"
              type="url"
              value={isUpload ? '' : videoUrl}
              onChange={(event) => onVideoLinkChange?.(event.target.value)}
              disabled={disabled}
              placeholder="https://www.youtube.com/watch?v=…"
              className={inputClass}
              aria-invalid={error ? 'true' : 'false'}
            />
          </div>
        </div>
      )}

      {(error || fileError) && (
        <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
          {error || fileError}
        </p>
      )}

      {!error && mode === 'link' && videoUrl && !isUpload && !parsed.valid ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Use a valid YouTube, Vimeo, or direct MP4/WebM URL.
        </p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="topic-video-caption" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
          Video caption (optional)
        </label>
        <input
          id="topic-video-caption"
          type="text"
          value={videoCaption}
          onChange={(event) => onFieldChange('videoCaption', event.target.value)}
          disabled={disabled}
          placeholder="e.g. Introduction — 12 min walkthrough"
          className={inputClass}
        />
      </div>

      {hasVideo ? (
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            <Play className="h-3.5 w-3.5" aria-hidden />
            Preview
            {parsed.label ? (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 normal-case text-violet-800 dark:bg-violet-950/60 dark:text-violet-200">
                {parsed.label}
              </span>
            ) : null}
          </p>
          <TopicVideoEmbed videoUrl={videoUrl} caption={videoCaption} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-violet-200 bg-white/60 px-4 py-6 text-center text-sm text-slate-500 dark:border-violet-800 dark:bg-slate-950/40 dark:text-slate-400">
          Add a video to include a lesson player for students.
        </p>
      )}
    </div>
  )
}

export { TopicVideoEmbed }
export default TopicVideoField
