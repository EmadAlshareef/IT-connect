import { useMemo, useState } from 'react'
import { FileText, Film, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import { TOPIC_DOC_ACCEPT_STRING } from './constants.js'
import TopicMediaDownloadCard from './TopicMediaDownloadCard.jsx'
import { formatTopicFileSize, isVideoMime } from '../../../utils/topicFileUtils.js'

/**
 * Downloadable documents and supplementary videos for students.
 */
function TopicDownloadableMedia({
  attachments,
  onAddFiles,
  onReplaceFile,
  onRemoveFile,
  disabled,
  busy = false,
  error = '',
}) {
  const [filter, setFilter] = useState('all')

  const isAttachmentVideo = (f) => f.kind === 'video' || isVideoMime(f.type, f.name)

  const documents = useMemo(
    () => attachments.filter((f) => !isAttachmentVideo(f)),
    [attachments],
  )
  const videos = useMemo(
    () => attachments.filter((f) => isAttachmentVideo(f)),
    [attachments],
  )

  const visible =
    filter === 'documents' ? documents : filter === 'videos' ? videos : attachments

  const tabs = [
    { id: 'all', label: 'All', count: attachments.length },
    { id: 'documents', label: 'Documents', count: documents.length },
    { id: 'videos', label: 'Downloadable videos', count: videos.length },
  ]

  return (
    <div className="space-y-5 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white p-5 dark:border-emerald-900/50 dark:from-emerald-950/25 dark:to-slate-900">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Downloads & resources</h4>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Upload documents or extra videos — students can download them directly from the lesson page.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={disabled}
            onClick={() => setFilter(tab.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === tab.id
                ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-600'
            }`}
          >
            {tab.label}
            {tab.count > 0 ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 transition ${
          disabled || busy
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-900/40'
            : 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 dark:hover:border-emerald-600'
        }`}
      >
        {busy ? (
          <Loader2 className="h-9 w-9 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : (
          <Upload className="h-9 w-9 text-emerald-600 dark:text-emerald-400" aria-hidden />
        )}
        <span className="mt-3 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          {busy ? 'Uploading…' : 'Drag files here or click to choose'}
        </span>
        <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          PDF, Word, ZIP, code, MP4/WebM — up to {formatTopicFileSize(20 * 1024 * 1024)} per file
        </span>
        <input
          type="file"
          multiple
          accept={TOPIC_DOC_ACCEPT_STRING}
          disabled={disabled || busy}
          className="sr-only"
          onChange={(event) => {
            onAddFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </label>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" role="alert">
          {error}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Uploaded files">
          {visible.map((file) => (
            <li key={file.id} className="relative">
              <TopicMediaDownloadCard file={file} showPreview />
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Replace
                  <input
                    type="file"
                    accept={TOPIC_DOC_ACCEPT_STRING}
                    disabled={disabled || busy}
                    className="sr-only"
                    onChange={(event) => {
                      const next = event.target.files?.[0]
                      if (next) onReplaceFile(file.id, next)
                      event.target.value = ''
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemoveFile(file.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-4 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
          {filter === 'videos' ? (
            <Film className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <FileText className="h-5 w-5 shrink-0" aria-hidden />
          )}
          No files in this section yet.
        </p>
      )}
    </div>
  )
}

export default TopicDownloadableMedia
