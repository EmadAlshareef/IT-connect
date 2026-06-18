import { FileText, RefreshCw, Trash2, Upload } from 'lucide-react'
import { TOPIC_DOC_ACCEPT_STRING } from './constants.js'

function formatFileSize(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Multi-file upload with preview list and replace / remove actions.
 */
function TopicDocumentationFileUpload({ attachments, onAddFiles, onReplaceFile, onRemoveFile, disabled }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Supporting documents</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          PDF, DOCX, TXT, MD, and common code or archive files. File names are stored for this demo workspace.
        </p>
        <label
          className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 transition ${
            disabled
              ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-900/40'
              : 'border-violet-200 bg-violet-50/40 hover:border-violet-400 hover:bg-violet-50/70 dark:border-violet-800 dark:bg-violet-950/20 dark:hover:border-violet-600'
          }`}
        >
          <Upload className="h-8 w-8 text-violet-600 dark:text-violet-400" aria-hidden />
          <span className="mt-2 text-sm font-semibold text-violet-800 dark:text-violet-200">Upload documents</span>
          <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">Click or drag files here</span>
          <input
            type="file"
            multiple
            accept={TOPIC_DOC_ACCEPT_STRING}
            disabled={disabled}
            className="sr-only"
            onChange={(event) => {
              onAddFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </label>
      </div>

      {attachments.length > 0 ? (
        <ul className="space-y-2" aria-label="Uploaded files">
          {attachments.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{file.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(file.size)}
                  {file.type ? ` · ${file.type}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Replace
                  <input
                    type="file"
                    accept={TOPIC_DOC_ACCEPT_STRING}
                    disabled={disabled}
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
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
          No files uploaded yet.
        </p>
      )}
    </div>
  )
}

export default TopicDocumentationFileUpload
