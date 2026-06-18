import { Archive, Download, FileText, Film, Play } from 'lucide-react'
import { attachmentIconKind, downloadTopicFile, formatTopicFileSize } from '../../../utils/topicFileUtils.js'

const KIND_STYLES = {
  video: {
    icon: Film,
    ring: 'ring-violet-200 dark:ring-violet-800',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
    badge: 'Video',
  },
  pdf: {
    icon: FileText,
    ring: 'ring-rose-200 dark:ring-rose-900',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    badge: 'PDF',
  },
  archive: {
    icon: Archive,
    ring: 'ring-amber-200 dark:ring-amber-900',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    badge: 'Archive',
  },
  document: {
    icon: FileText,
    ring: 'ring-violet-200 dark:ring-violet-800',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
    badge: 'Document',
  },
}

function TopicMediaDownloadCard({ file, onDownload, showPreview = false }) {
  const kind = attachmentIconKind(file)
  const style = KIND_STYLES[kind] ?? KIND_STYLES.document
  const Icon = style.icon
  const canDownload = Boolean(file?.dataUrl || file?.url)

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-800`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${style.ring} ${style.bg} ${style.text}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{file.name}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {formatTopicFileSize(file.size)}
            <span className="mx-1">·</span>
            <span className={`font-medium ${style.text}`}>{style.badge}</span>
          </p>
        </div>
      </div>

      {showPreview && kind === 'video' && file?.dataUrl ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-black dark:border-slate-700">
          <video src={file.dataUrl} controls className="aspect-video w-full" playsInline>
            <track kind="captions" />
          </video>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canDownload ? (
          <button
            type="button"
            onClick={() => {
              downloadTopicFile(file)
              onDownload?.(file)
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download
          </button>
        ) : (
          <span className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
            Download unavailable (filename only)
          </span>
        )}
        {showPreview && kind === 'video' && file?.dataUrl ? (
          <a
            href={file.dataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Preview
          </a>
        ) : null}
      </div>
    </div>
  )
}

export default TopicMediaDownloadCard
