import { BookMarked, Megaphone, X } from 'lucide-react'
import TopicDownloadableMedia from './TopicDownloadableMedia.jsx'
import TopicStructuredSections from './TopicStructuredSections.jsx'
import TopicVideoField from './TopicVideoField.jsx'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950'

/**
 * Full topic documentation editor (title, explanation, sections, files).
 */
function TopicDocumentationForm({
  draft,
  errors,
  onFieldChange,
  onSectionChange,
  onAddFiles,
  onReplaceFile,
  onRemoveFile,
  onVideoUpload,
  onVideoLinkChange,
  onClearVideo,
  fileBusy = false,
  fileError = '',
  onSubmit,
  onCancel,
  submitLabel = 'Publish topic',
  disabled,
  publishing = false,
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="space-y-8 rounded-2xl border border-violet-200/80 bg-white p-6 shadow-sm dark:border-violet-900/50 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
            <BookMarked className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create a topic lesson</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Add a video, overview, structured sections, and files — students get a rich lesson page when you publish.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" aria-hidden />
          Close
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor="topic-title" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
          Topic title
        </label>
        <input
          id="topic-title"
          name="title"
          value={draft.title}
          onChange={(event) => onFieldChange('title', event.target.value)}
          disabled={disabled}
          placeholder="e.g. React hooks and state management"
          className={inputClass}
          aria-invalid={errors.title ? 'true' : 'false'}
        />
        {errors.title ? (
          <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="topic-explanation" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
          Explanation & details
        </label>
        <textarea
          id="topic-explanation"
          name="explanation"
          value={draft.explanation}
          onChange={(event) => onFieldChange('explanation', event.target.value)}
          disabled={disabled}
          rows={6}
          placeholder="Short summary: what this lesson covers and why it matters for trainees…"
          className={`${inputClass} min-h-[10rem] resize-y`}
          aria-invalid={errors.explanation ? 'true' : 'false'}
        />
        {errors.explanation ? (
          <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
            {errors.explanation}
          </p>
        ) : null}
      </div>

      <TopicVideoField
        videoUrl={draft.videoUrl}
        videoCaption={draft.videoCaption}
        videoSource={draft.videoSource}
        videoFileName={draft.videoFileName}
        videoFileSize={draft.videoFileSize}
        videoAllowDownload={draft.videoAllowDownload}
        onFieldChange={onFieldChange}
        onVideoUpload={onVideoUpload}
        onVideoLinkChange={onVideoLinkChange}
        onClearVideo={onClearVideo}
        disabled={disabled}
        busy={fileBusy}
        fileError={fileError}
        error={errors.videoUrl}
      />

      <TopicStructuredSections sections={draft.sections} onSectionChange={onSectionChange} disabled={disabled} />

      <TopicDownloadableMedia
        attachments={draft.attachments}
        onAddFiles={onAddFiles}
        onReplaceFile={onReplaceFile}
        onRemoveFile={onRemoveFile}
        disabled={disabled}
        busy={fileBusy}
        error={fileError}
      />

      <p className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-xs text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
        Publishing sends this topic only to students currently enrolled in the selected training session.
        Students in other trainings will not see it.
      </p>

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
        <button
          type="submit"
          disabled={disabled || publishing}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition hover:bg-violet-500 disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
        >
          <Megaphone className="h-4 w-4" aria-hidden />
          {publishing ? 'Publishing…' : submitLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default TopicDocumentationForm
